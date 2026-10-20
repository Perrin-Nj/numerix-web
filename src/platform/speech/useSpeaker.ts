'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocale } from 'next-intl';
import { useAudioSettings } from '@/platform/audio';
import { setDucked } from '@/platform/music/duck';
import { getPrefs, usePrefs } from '@/platform/prefs/store';
import { pickVoice } from './voices';
import { spokenText } from './spoken';
import { getManifest, loadManifest } from './manifest';
import { planLine } from './plan';

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

// Voices load async in Chrome: one shared snapshot, refreshed on voiceschanged
let voices: SpeechSynthesisVoice[] = [];
const voiceSubs = new Set<() => void>();
function refreshVoices() {
  voices = window.speechSynthesis.getVoices();
  voiceSubs.forEach((f) => f());
}
function subVoices(cb: () => void) {
  if (!supported()) return () => {};
  if (voiceSubs.size === 0) {
    voices = window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
  }
  voiceSubs.add(cb);
  return () => {
    voiceSubs.delete(cb);
    if (voiceSubs.size === 0) window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
  };
}
const getVoices = () => voices;
const noVoices: SpeechSynthesisVoice[] = [];
const noSubscribe = () => () => {};

// Autoplay lock: speech only after the first gesture
let unlockedFlag = false;
const unlockSubs = new Set<() => void>();
function onGesture() {
  unlockedFlag = true;
  window.removeEventListener('pointerdown', onGesture);
  window.removeEventListener('keydown', onGesture);
  unlockSubs.forEach((f) => f());
}
function subUnlock(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  if (!unlockedFlag && unlockSubs.size === 0) {
    if (navigator.userActivation?.hasBeenActive) unlockedFlag = true;
    else {
      window.addEventListener('pointerdown', onGesture);
      window.addEventListener('keydown', onGesture);
    }
  }
  unlockSubs.add(cb);
  return () => {
    unlockSubs.delete(cb);
  };
}

export type SpeakOpts = { lang?: string; /** Id of the recorded line (seed/voice/script.json). Without a clip the line is captions only. */ lineId?: string; volume?: number; rate?: number; onEnd?: () => void };

/** Best-voice speech that respects prefs.voice and the global sound toggle. */
export function useSpeaker(defaultLang?: string) {
  const locale = useLocale();
  const lang = defaultLang ?? locale;
  const prefs = usePrefs();
  let soundOn = true;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    soundOn = useAudioSettings().enabled;
  } catch {
    /* no AudioProvider: speech follows prefs only */
  }
  const list = useSyncExternalStore(subVoices, getVoices, () => noVoices);
  // false on the server and during hydration, the real answer right after, so the markup matches
  const speechSupported = useSyncExternalStore(noSubscribe, supported, () => false);
  useEffect(() => {
    void loadManifest();
  }, []);
  const unlocked = useSyncExternalStore(subUnlock, () => unlockedFlag, () => false);
  const [speaking, setSpeaking] = useState(false);
  const [pending, setPending] = useState(false);
  const queued = useRef<{ text: string; o: SpeakOpts } | null>(null); // only the last utterance waits for the gesture
  const clip = useRef<HTMLAudioElement | null>(null);
  const keep = useRef<SpeechSynthesisUtterance | null>(null); // Chrome drops utterances that get garbage collected

  const cancel = useCallback(() => {
    if (supported()) window.speechSynthesis.cancel();
    keep.current = null;
    clip.current?.pause();
    clip.current = null;
    queued.current = null;
    setPending(false);
    setSpeaking(false);
    setDucked(false);
  }, []);
  useEffect(() => cancel, [cancel]);
  useEffect(() => {
    if (!prefs.voice || !soundOn) {
      clip.current?.pause();
      if (supported()) window.speechSynthesis.cancel(); // end events reset `speaking`
    }
  }, [prefs.voice, soundOn]);

  const speakRef = useRef<(text: string, o?: SpeakOpts) => boolean>(() => false);
  const speak = useCallback(
    (text: string, o: SpeakOpts = {}): boolean => {
      const p = getPrefs();
      if (!text || !p.voice || !soundOn) return false;
      const l = o.lang ?? lang;
      const manifest = getManifest();
      if (!manifest) {
        // first line before the manifest is in: wait for it once, then decide
        void loadManifest().then(() => speakRef.current(text, o));
        return false;
      }
      const plan = planLine({ lineId: o.lineId ?? `t:${text.trim()}`, lang: l, manifest, prefs: p, soundOn, ttsSupported: supported() });
      if (plan.kind === 'captions') return false; // the caption is on screen; no sound, no error
      if (!unlockedFlag) {
        queued.current = { text, o };
        setPending(true);
        return false;
      }
      if (plan.kind === 'clip') {
        queued.current = null;
        setPending(false);
        clip.current?.pause();
        if (supported()) window.speechSynthesis.cancel();
        const a = new Audio(plan.url);
        a.volume = Math.min(1, Math.max(0, o.volume ?? 1));
        const end = () => {
          if (clip.current === a) {
            clip.current = null;
            setSpeaking(false);
          }
          o.onEnd?.();
        };
        a.onended = end;
        a.onerror = end; // a clip that fails to load degrades to captions silently
        clip.current = a;
        setSpeaking(true);
        a.play().catch(end);
        return true;
      }
      const all = window.speechSynthesis.getVoices();
      if (all.length === 0) {
        // Voices load late on some browsers: wait for them instead of speaking with a default voice
        queued.current = { text, o };
        return false;
      }
      queued.current = null;
      setPending(false);
      const v = pickVoice(all, l, p.voiceName);
      // A French line is only ever read by a French voice, an English line by an English voice.
      // No voice for the language: stay silent here; the Me screen tells the child why.
      if (!v) return false;
      const u = new SpeechSynthesisUtterance(spokenText(text, l));
      u.voice = v;
      u.lang = v.lang;
      u.rate = o.rate ?? p.rate;
      u.pitch = 1.05;
      u.volume = Math.min(1, Math.max(0, o.volume ?? 1));
      const done = () => {
        setDucked(false);
        if (keep.current === u) {
          keep.current = null;
          setSpeaking(false);
        }
        o.onEnd?.();
      };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.cancel();
      keep.current = u;
      setSpeaking(true);
      setDucked(true);
      window.speechSynthesis.speak(u);
      return true;
    },
    [lang, soundOn],
  );
  useEffect(() => {
    speakRef.current = speak;
  });
  // Flush the waiting utterance on the first gesture
  useEffect(() => {
    if (unlocked && list.length > 0 && queued.current) {
      const q = queued.current;
      speakRef.current(q.text, q.o);
    }
  }, [unlocked, list.length]);

  const voice = pickVoice(list, lang, prefs.voiceName);
  return { speak, cancel, speaking, pending, supported: speechSupported, unlocked, voiceLabel: voice?.name ?? null, voicesLoaded: list.length > 0 };
}
