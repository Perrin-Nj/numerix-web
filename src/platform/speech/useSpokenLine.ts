'use client';
import { useEffect, useRef } from 'react';
import { useSpeaker } from './useSpeaker';

/** Speaks `text` once each time it changes to a new non-empty value (deduped by key or text). */
export function useSpokenLine(text: string | null, { lang, key, lineId }: { lang?: string; key?: string; lineId?: string } = {}) {
  const sp = useSpeaker(lang);
  const last = useRef<string | null>(null);
  const { speak } = sp;
  useEffect(() => {
    if (!text) return;
    const id = key ?? text;
    if (last.current === id) return;
    last.current = id;
    speak(text, { lang, lineId });
  }, [text, key, lang, lineId, speak]);
  return sp;
}
