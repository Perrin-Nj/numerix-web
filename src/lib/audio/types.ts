export const SOUND_NAMES = [
  'tap',
  'beat_success',
  'beat_detour',
  'beat_surprise',
  'chapter_complete',
  'card_earned',
  'streak_up',
  'notice_warning',
  'notice_error',
  'open',
  'close',
  'toggle',
  'select',
  'switch',
  'scroll',
  'pluck',
  'drop',
  'back',
  'confirm',
  'question',
  'glass',
  'tick',
  'minimize',
  'maximize',
] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

/** Small interface so Storybook and tests can inject a null player (dependency inversion). */
export interface AudioPlayer {
  play(name: SoundName): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  /** Called on the first user gesture to satisfy browser autoplay rules. */
  unlock(): void;
}
