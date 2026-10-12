'use client';
import { useEffect, useRef } from 'react';
import { useSpeaker } from './useSpeaker';

/** Speaks `text` once each time it changes to a new non-empty value (deduped by key or text). */
export function useSpokenLine(text: string | null, { lang, key }: { lang?: string; key?: string } = {}) {
  const sp = useSpeaker(lang);
  const last = useRef<string | null>(null);
  const { speak } = sp;
  useEffect(() => {
    if (!text) return;
    const id = key ?? text;
    if (last.current === id) return;
    last.current = id;
    speak(text, { lang });
  }, [text, key, lang, speak]);
  return sp;
}
