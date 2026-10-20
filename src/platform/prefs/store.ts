'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Prefs = {
  /** Child toggle: Numa's voice (human clips). */
  voice: boolean;
  /** Parent opt-in: browser computer voice when no human clip exists. Off by default. */
  computerVoice: boolean;
  hints: boolean;
  hintDelaySec: 15 | 30 | 45;
  /** 0..1, applied to coach hints. */
  hintVolume: number;
  voiceName: string | null;
  rate: number;
  /** Short buzz on answers where the device allows it. */
  vibration: boolean;
  /** Calm background music: the child's switch, its gain 0..1, and the parent's lock (this device only). */
  music: boolean;
  musicVolume: number;
  musicLocked: boolean;
};
type State = Prefs & { set: (p: Partial<Prefs>) => void };

/**
 * Starting values for the kid's preferences: voice and hints on, hint delay 30 s at volume 0.5, speech rate
 * 0.95, no vibration. Also used to reset on full sign out.
 */
export const DEFAULT_PREFS: Prefs = { voice: true, computerVoice: false, hints: true, hintDelaySec: 30, hintVolume: 0.5, voiceName: null, rate: 0.95, vibration: false, music: true, musicVolume: 0.35, musicLocked: false };

/**
 * Persisted store (localStorage key nx:prefs:v1) of voice, hint and vibration preferences. Use the hook in
 * components and getPrefs outside React; set() merges a partial update.
 */
export const usePrefs = create<State>()(
  persist((set) => ({ ...DEFAULT_PREFS, set: (p) => set(p) }), {
    name: 'nx:prefs:v1',
    storage: createJSONStorage(() => localStorage),
    partialize: ({ voice, computerVoice, hints, hintDelaySec, hintVolume, voiceName, rate, vibration, music, musicVolume, musicLocked }) => ({ voice, computerVoice, hints, hintDelaySec, hintVolume, voiceName, rate, vibration, music, musicVolume, musicLocked }),
  }),
);

/** Read outside React. */
export const getPrefs = (): Prefs => usePrefs.getState();
