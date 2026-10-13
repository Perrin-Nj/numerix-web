'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePrefs } from '@/platform/prefs/store';
import { useSpeaker } from '@/platform/speech';
import { nextHint } from './nextHint';

const MAX_PER_BEAT = 2;
const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel'] as const;

type Props = { skillId: string; beatKey: string; active: boolean; lang: string };

/** Gentle idle hint: guides the thinking, never gives the answer. */
export function useCoach({ skillId, beatKey, active, lang }: Props) {
  const t = useTranslations('coach');
  const { hints, hintDelaySec, hintVolume } = usePrefs();
  const { speak } = useSpeaker(lang);
  const [shown, setShown] = useState<{ beatKey: string; text: string } | null>(null);
  const history = useRef<{ beatKey: string; list: string[] }>({ beatKey, list: [] });

  const pool = (): string[] => {
    const key = t.has(skillId) ? skillId : 'generic';
    const raw = t.raw(key);
    return Array.isArray(raw) ? (raw as string[]) : [];
  };
  // Latest closures for the timer without restarting it
  const fire = useRef<() => void>(() => {});
  useEffect(() => {
    fire.current = () => {
      if (history.current.beatKey !== beatKey) history.current = { beatKey, list: [] };
      if (history.current.list.length >= MAX_PER_BEAT) return;
      const h = nextHint(pool(), history.current.list);
      if (!h) return;
      history.current.list.push(h);
      setShown({ beatKey, text: h });
      speak(h, { lang, volume: hintVolume });
    };
  });

  useEffect(() => {
    if (!hints || !active) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      if (history.current.beatKey === beatKey && history.current.list.length >= MAX_PER_BEAT) return;
      timer = setTimeout(() => {
        fire.current();
        arm();
      }, hintDelaySec * 1000);
    };
    arm();
    ACTIVITY.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    return () => {
      clearTimeout(timer);
      ACTIVITY.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [hints, active, beatKey, hintDelaySec]);

  const dismiss = useCallback(() => setShown(null), []);
  return { hint: hints && shown?.beatKey === beatKey ? shown.text : null, dismiss };
}
