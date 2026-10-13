import type { CardView, Outcome, WorldId } from './types.ts';

/** The append-only log of everything a child did. All progress is derived from it. */
export type GameEvent = { t: number } & (
  | { k: 'start'; sid: string; world: WorldId; skill: string; mode: 'chapter' | 'daily_quest' | 'challenge' | 'onboarding' }
  | { k: 'answer'; sid: string; world: WorldId; skill: string; outcome: Outcome; i: number }
  | { k: 'finish'; sid: string; done: boolean; title?: string }
  | { k: 'card'; card: CardView }
  | { k: 'react'; item: string; liked: boolean; saved: boolean }
  | { k: 'puzzle'; item: string; outcome: Outcome }
  | { k: 'accept'; id: string }
  | { k: 'gift' }
  | { k: 'tour' }
);

export const MAX_EVENTS = 2000;
