'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { challengeRewards, giftClaimed, welcomeCard } from '@/domain/game/selectors.ts';
import type { GameEvent } from '@/domain/game/events.ts';
import { MAX_EVENTS } from '@/domain/game/events.ts';
import type { Lang } from '@/domain/game/catalog.ts';
import type { CardView } from '@/domain/game/types.ts';

export type Celebration = { id: string; kind: 'challenge' | 'gift'; card: CardView };
type NewEvent = GameEvent extends infer E ? (E extends { t: number } ? Omit<E, 't'> & { t?: number } : never) : never;

type State = {
  byChild: Record<string, GameEvent[]>;
  queue: Celebration[];
  lang: Lang;
  setLang: (lang: Lang) => void;
  append: (childId: string, ev: NewEvent) => void;
  claimGift: (childId: string) => void;
  popCelebration: () => void;
  reset: (childId: string) => void;
};

const dup = (list: GameEvent[], ev: GameEvent) =>
  (ev.k === 'start' && list.some((e) => e.k === 'start' && e.sid === ev.sid)) ||
  (ev.k === 'finish' && list.some((e) => e.k === 'finish' && e.sid === ev.sid)) ||
  (ev.k === 'card' && list.some((e) => e.k === 'card' && e.card.id === ev.card.id)) ||
  (ev.k === 'accept' && list.some((e) => e.k === 'accept' && e.id === ev.id)) ||
  (ev.k === 'gift' && list.some((e) => e.k === 'gift')) ||
  (ev.k === 'tour' && list.some((e) => e.k === 'tour'));

/**
 * The local game state (NEXT_PUBLIC_STATE_SOURCE=local). Everything a child does is appended here and every
 * screen derives its numbers from it. Persisted per device and keyed by child id; no names are stored.
 */
export const useGameStore = create<State>()(
  persist(
    (set, get) => ({
      byChild: {},
      queue: [],
      lang: 'fr',
      setLang: (lang) => set({ lang }),
      append: (childId, input) => {
        const now = Date.now();
        const ev = { ...input, t: input.t ?? now } as GameEvent;
        const current = get().byChild[childId] ?? [];
        if (dup(current, ev)) return;
        let list = [...current, ev];
        const owed = challengeRewards(list, now, get().lang);
        const queue = [...get().queue];
        for (const card of owed) {
          list = [...list, { t: now, k: 'card', card }];
          queue.push({ id: card.id, kind: 'challenge', card });
        }
        if (list.length > MAX_EVENTS) list = list.slice(list.length - MAX_EVENTS);
        set({ byChild: { ...get().byChild, [childId]: list }, queue });
      },
      claimGift: (childId) => {
        const list = get().byChild[childId] ?? [];
        if (giftClaimed(list)) return;
        const now = Date.now();
        const card = welcomeCard(now, get().lang);
        set({ byChild: { ...get().byChild, [childId]: [...list, { t: now, k: 'gift' as const }, { t: now, k: 'card' as const, card }] } });
      },
      popCelebration: () => set({ queue: get().queue.slice(1) }),
      reset: (childId) => {
        const rest = { ...get().byChild };
        delete rest[childId];
        set({ byChild: rest, queue: [] });
      },
    }),
    {
      name: 'nx:game:v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ byChild: s.byChild }),
    },
  ),
);

const EMPTY: GameEvent[] = [];
/**
 * Subscribes to one child's event list in the persisted store. Returns a shared empty array when the id is null
 * or unknown, so the reference stays stable and does not re-render.
 */
export const useGameEvents = (childId: string | null) => useGameStore((s) => (childId ? (s.byChild[childId] ?? EMPTY) : EMPTY));
