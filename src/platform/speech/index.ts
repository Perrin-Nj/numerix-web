'use client';
import { useCallback, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useSpeaker } from './useSpeaker';

export { useSpeaker } from './useSpeaker';
export type { SpeakOpts } from './useSpeaker';
export { pickVoice, scoreVoice } from './voices';

/**
 * Read-aloud with the best available voice. Reports through onUnavailable (once, on an explicit tap) when the device has no voice
 * for the language, so the app can tell the user instead of staying silent.
 */
export function useReadAloud(enabled: boolean, onUnavailable?: () => void) {
  const locale = useLocale();
  const sp = useSpeaker(locale);
  const reported = useRef(false);

  const speak = useCallback(
    (text: string, explicit = false) => {
      if (!enabled || !text) return;
      // supported but voices not loaded yet: try anyway, the engine falls back to its default
      if (!sp.supported || (sp.voicesLoaded && !sp.voiceLabel)) {
        // only a tap on the listen button earns the notice: the automatic read must never put a toast over the answers (QA P2)
        if (explicit && !reported.current) {
          reported.current = true;
          onUnavailable?.();
        }
        return;
      }
      sp.speak(text);
    },
    [enabled, sp, onUnavailable],
  );

  return { speak, cancel: sp.cancel, pending: sp.pending };
}
