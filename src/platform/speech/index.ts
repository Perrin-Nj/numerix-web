'use client';
import { useCallback, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useSpeaker } from './useSpeaker';
import { usePrefs } from '@/platform/prefs/store';

export { useSpeaker } from './useSpeaker';
export type { SpeakOpts } from './useSpeaker';
export { pickVoice, scoreVoice } from './voices';

/**
 * Read-aloud with the best available voice. Reports through onUnavailable (once) when the device has no voice
 * for the language, so the app can tell the user instead of staying silent.
 */
export function useReadAloud(enabled: boolean, onUnavailable?: () => void) {
  const locale = useLocale();
  const sp = useSpeaker(locale);
  const reported = useRef(false);
  const computer = usePrefs((p) => p.computerVoice);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !text) return;
      // supported but voices not loaded yet: try anyway, the engine falls back to its default
      // only a parent who turned the computer voice on is told when the device has none
      if (computer && (!sp.supported || (sp.voicesLoaded && !sp.voiceLabel)) && !reported.current) {
        reported.current = true;
        onUnavailable?.();
        return;
      }
      sp.speak(text);
    },
    [enabled, sp, onUnavailable, computer],
  );

  return { speak, cancel: sp.cancel, pending: sp.pending };
}
