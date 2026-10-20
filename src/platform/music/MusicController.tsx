'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAudioSettings } from '@/platform/audio';
import { usePublicConfig } from '@/data/hooks';
import { usePrefs } from '@/platform/prefs/store';
import { isDucked, onDuck } from './duck';
import { MusicPlayer } from './player';
import { shouldPlay } from './policy';
import { MUSIC_BASE, TRACKS } from './tracks';

const saveData = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

/**
 * Plays the background loops on child screens. Starts only after the first tap, follows the child's switch, the
 * parent's lock and the sound setting, pauses when the tab is hidden, and does nothing (no download) in data saver.
 */
export function MusicController() {
  const { music, musicVolume, musicLocked } = usePrefs();
  const { enabled: soundOn } = useAudioSettings();
  // the admin's switch and track list (null config: nothing customised, music stays as the child set it)
  const cfg = usePublicConfig().data;
  const adminOn = cfg?.music.enabled ?? true;
  const ids = cfg?.music.tracks.map((t) => t.id).join(',') ?? '';
  const player = useMemo(() => {
    const allowed = TRACKS.filter((t) => ids.split(',').includes(t.id));
    return new MusicPlayer(allowed.length ? allowed : TRACKS, MUSIC_BASE);
  }, [ids]);
  const [unlocked, setUnlocked] = useState(false);
  const [visible, setVisible] = useState(true);
  const [ducked, setDucked] = useState(isDucked);

  useEffect(() => {
    const go = () => setUnlocked(true);
    window.addEventListener('pointerdown', go, { once: true });
    window.addEventListener('keydown', go, { once: true });
    const vis = () => setVisible(document.visibilityState === 'visible');
    vis();
    document.addEventListener('visibilitychange', vis);
    const un = onDuck(setDucked);
    return () => {
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
      document.removeEventListener('visibilitychange', vis);
      un();
    };
  }, []);

  useEffect(() => {
    player.sync(shouldPlay({ music: music && adminOn, locked: musicLocked, soundOn, unlocked, visible, saveData: saveData() }), musicVolume, ducked);
  }, [player, music, adminOn, musicLocked, soundOn, unlocked, visible, musicVolume, ducked]);

  useEffect(() => () => player.sync(false, 0, false), [player]);
  return null;
}
