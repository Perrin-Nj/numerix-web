'use client';
import { useCallback, useEffect } from 'react';
import { useChildSettings, usePublicConfig, useSessionStatus, useUpdateSettings } from '@/data/hooks';
import type { ChildSettings } from '@/data/api/types';
import { usePrefs } from '@/platform/prefs/store';

/** The two volume steps the child can pick; the server stores 0..100. */
const STEPS = [0.2, 0.35];
const nearest = (v: number) => STEPS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

type KidPrefs = { music?: boolean; musicVolume?: number; voice?: boolean };

/**
 * Keeps the device prefs (a local cache) equal to the child's backend settings: music on/off and volume, the parent's
 * music lock, human voice and the parent's computer-voice opt-in. Runs once in the play shell.
 */
export function useServerPrefsSync() {
  const childId = useSessionStatus().data?.childId ?? '';
  const settings = useChildSettings(childId).data;
  const cfg = usePublicConfig().data;
  const set = usePrefs((p) => p.set);
  const allowComputer = cfg?.voice.computer_voice_allowed ?? true;
  useEffect(() => {
    if (!settings) return;
    const m = settings.music;
    const v = settings.voice;
    set({
      ...(m ? { music: m.enabled && !m.parent_locked, musicVolume: nearest(m.volume / 100), musicLocked: m.parent_locked } : {}),
      ...(v ? { voice: v.human_enabled, computerVoice: v.computer_voice && allowComputer } : {}),
    });
  }, [settings, allowComputer, set]);
}

/**
 * Returns a saver for the kid's own switches: it updates the local cache at once, then writes the same change to the
 * backend (a child token may change only music enabled/volume and human voice). Offline or without a session the local
 * cache stays the truth until the next sync.
 */
export function useSaveKidPrefs() {
  const childId = useSessionStatus().data?.childId ?? '';
  const settings = useChildSettings(childId).data;
  const update = useUpdateSettings(childId);
  const set = usePrefs((p) => p.set);
  return useCallback(
    (p: KidPrefs) => {
      set(p);
      if (!settings || !childId) return;
      const body: ChildSettings = {
        ...settings,
        music: {
          enabled: p.music ?? settings.music?.enabled ?? true,
          volume: p.musicVolume !== undefined ? Math.round(p.musicVolume * 100) : (settings.music?.volume ?? 30),
          parent_locked: settings.music?.parent_locked ?? false,
        },
        voice: { human_enabled: p.voice ?? settings.voice?.human_enabled ?? true, computer_voice: settings.voice?.computer_voice ?? false },
      };
      update.mutate(body);
    },
    [set, settings, childId, update],
  );
}
