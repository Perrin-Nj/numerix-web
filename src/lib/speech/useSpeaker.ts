'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocale } from 'next-intl';
import { useAudioSettings } from '@/lib/audio';
import { getPrefs, usePrefs } from '@/lib/prefs/store';
import { pickVoice } from './voices';
import { spokenText } from './spoken';

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

export type SpeakOpts = { lang?: string; volume?: number; rate?: number; onEnd?: () => void };

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
  const unlocked = useSyncExternalStore(subUnlock, () => unlockedFlag, () => false);
  const [speaking, setSpeaking] = useState(false);
  const [pending, setPending] = useState(false);
  const queued = useRef<{ text: string; o: SpeakOpts } | null>(null); // only the last utterance waits for the gesture
  const keep = useRef<SpeechSynthesisUtterance | null>(null); // Chrome drops utterances that get garbage collected

  const cancel = useCallback(() => {
    if (supported()) window.speechSynthesis.cancel();
    keep.current = null;
    queued.current = null;
    setPending(false);
    setSpeaking(false);
  }, []);
  useEffect(() => cancel, [cancel]);
  useEffect(() => {
    if ((!prefs.voice || !soundOn) && supported()) window.speechSynthesis.cancel(); // end events reset `speaking`
  }, [prefs.voice, soundOn]);

  const speakRef = useRef<(text: string, o?: SpeakOpts) => boolean>(() => false);
  const speak = useCallback(
    (text: string, o: SpeakOpts = {}): boolean => {
      const p = getPrefs();
      if (!text || !p.voice || !soundOn || !supported()) return false;
      if (!unlockedFlag) {
        queued.current = { text, o };
        setPending(true);
        return false;
      }
      const all = window.speechSynthesis.getVoices();
      if (all.length === 0) {
        // Voices load late on some browsers: wait for them instead of speaking with a default voice
        queued.current = { text, o };
        return false;
      }
      queued.current = null;
      setPending(false);
      const l = o.lang ?? lang;
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
  return { speak, cancel, speaking, pending, supported: supported(), unlocked, voiceLabel: voice?.name ?? null, voicesLoaded: list.length > 0 };
}
