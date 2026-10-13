'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Prefs = {
  voice: boolean;
  hints: boolean;
  hintDelaySec: 15 | 30 | 45;
  /** 0..1, applied to coach hints. */
  hintVolume: number;
  voiceName: string | null;
  rate: number;
  /** Short buzz on answers where the device allows it. */
  vibration: boolean;
};
type State = Prefs & { set: (p: Partial<Prefs>) => void };

/**
 * Starting values for the kid's preferences: voice and hints on, hint delay 30 s at volume 0.5, speech rate
 * 0.95, no vibration. Also used to reset on full sign out.
 */
export const DEFAULT_PREFS: Prefs = { voice: true, hints: true, hintDelaySec: 30, hintVolume: 0.5, voiceName: null, rate: 0.95, vibration: false };

/**
 * Persisted store (localStorage key nx:prefs:v1) of voice, hint and vibration preferences. Use the hook in
 * components and getPrefs outside React; set() merges a partial update.
 */
export const usePrefs = create<State>()(
  persist((set) => ({ ...DEFAULT_PREFS, set: (p) => set(p) }), {
    name: 'nx:prefs:v1',
    storage: createJSONStorage(() => localStorage),
    partialize: ({ voice, hints, hintDelaySec, hintVolume, voiceName, rate, vibration }) => ({ voice, hints, hintDelaySec, hintVolume, voiceName, rate, vibration }),
  }),
);

/** Read outside React. */
export const getPrefs = (): Prefs => usePrefs.getState();
