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

/**
 * Cap on events kept per child in the local log, so the persisted store cannot grow without bound. The store
 * drops the oldest events beyond it.
 */
export const MAX_EVENTS = 2000;
