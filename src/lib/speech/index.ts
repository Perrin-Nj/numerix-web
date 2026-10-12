'use client';
import { useCallback, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';

/**
 * Read-aloud with the Web Speech API. Reports through onUnavailable (once) when the device has no voice
 * for the language, so the app can tell the user instead of staying silent.
 */
export function useReadAloud(enabled: boolean, onUnavailable?: () => void) {
  const locale = useLocale();
  const reported = useRef(false);

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => cancel, [cancel]);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !text || typeof window === 'undefined') return;
      if (!('speechSynthesis' in window)) {
        if (!reported.current) {
          reported.current = true;
          onUnavailable?.();
        }
        return;
      }
      const voices = window.speechSynthesis.getVoices();
      const lang = locale.split('-')[0].toLowerCase();
      const hasVoice = voices.length === 0 || voices.some((v) => v.lang.toLowerCase().startsWith(lang));
      if (!hasVoice) {
        if (!reported.current) {
          reported.current = true;
          onUnavailable?.();
        }
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = locale;
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    },
    [enabled, locale, onUnavailable],
  );

  return { speak, cancel };
}
