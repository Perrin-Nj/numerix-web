import type { SoundName } from './types';

/** Config: sound name to base file under /sounds (webm first, mp3 fallback). Swap files here only. */
export const SOUND_FILES: Record<SoundName, string> = {
  tap: '/sounds/tap',
  beat_success: '/sounds/beat_success',
  beat_detour: '/sounds/beat_detour',
  beat_surprise: '/sounds/beat_surprise',
  chapter_complete: '/sounds/chapter_complete',
  card_earned: '/sounds/card_earned',
  streak_up: '/sounds/streak_up',
  notice_warning: '/sounds/notice_warning',
  notice_error: '/sounds/notice_error',
};

export const SOUND_VOLUME: Record<SoundName, number> = {
  tap: 0.4,
  beat_success: 0.7,
  beat_detour: 0.6,
  beat_surprise: 0.6,
  chapter_complete: 0.8,
  card_earned: 0.7,
  streak_up: 0.6,
  notice_warning: 0.5,
  notice_error: 0.5,
};
