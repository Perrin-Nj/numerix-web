'use client';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AudioPlayer, SoundName } from './types';
import { WebAudioPlayer } from './web-audio-player';

type Ctx = { player: AudioPlayer; enabled: boolean; setEnabled: (v: boolean) => void };
const AudioCtx = createContext<Ctx | null>(null);

type Props = {
  children: ReactNode;
  defaultEnabled?: boolean;
  /** Inject a fake player (Storybook, tests). */
  player?: AudioPlayer;
  /** Called once if a sound cannot load, so the app can show a visible notice. */
  onError?: (message: string) => void;
};

/**
 * Owns the sound on/off state and the player for the app. Uses a WebAudioPlayer unless a fake player is injected
 * (Storybook, tests), unlocks audio on the first pointer or key event because browsers require a gesture, and
 * mutes while the tab is hidden.
 */
export function AudioProvider({ children, defaultEnabled = true, player: injected, onError }: Props) {
  const [enabled, setEnabledState] = useState(defaultEnabled);
  const player = useMemo<AudioPlayer>(
    () => injected ?? new WebAudioPlayer(defaultEnabled),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [injected],
  );

  useEffect(() => {
    if (player instanceof WebAudioPlayer) player.setOnError(onError);
  }, [player, onError]);

  useEffect(() => {
    player.setEnabled(enabled);
  }, [enabled, player]);

  // Browsers only allow audio after a user gesture
  useEffect(() => {
    const unlock = () => player.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [player]);

  // Silent in background tabs
  useEffect(() => {
    const onVis = () => player.setEnabled(enabled && document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [enabled, player]);

  const value = useMemo(() => ({ player, enabled, setEnabled: setEnabledState }), [player, enabled]);
  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

/** Safe without a provider: calls become no-ops. */
export function useSound() {
  const ctx = useContext(AudioCtx);
  return useMemo(() => ({ play: (name: SoundName) => ctx?.player.play(name) }), [ctx]);
}

/** Reads and sets the sound on/off switch. Throws without AudioProvider, unlike useSound which is a safe no-op. */
export function useAudioSettings() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudioSettings needs AudioProvider');
  return { enabled: ctx.enabled, setEnabled: ctx.setEnabled };
}
