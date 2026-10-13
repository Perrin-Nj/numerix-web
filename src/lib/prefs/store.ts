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

export const DEFAULT_PREFS: Prefs = { voice: true, hints: true, hintDelaySec: 30, hintVolume: 0.5, voiceName: null, rate: 0.95, vibration: false };

export const usePrefs = create<State>()(
  persist((set) => ({ ...DEFAULT_PREFS, set: (p) => set(p) }), {
    name: 'nx:prefs:v1',
    storage: createJSONStorage(() => localStorage),
    partialize: ({ voice, hints, hintDelaySec, hintVolume, voiceName, rate, vibration }) => ({ voice, hints, hintDelaySec, hintVolume, voiceName, rate, vibration }),
  }),
);

/** Read outside React. */
export const getPrefs = (): Prefs => usePrefs.getState();
