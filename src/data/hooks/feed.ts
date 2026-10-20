'use client';
/** The endless discovery feed. */
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/data/api/client';
import type { AnswerValue } from '@/data/api/types';

// ───────── Endless AI feed ─────────
export function useFeed(childId: string | null) {
  return useInfiniteQuery({
    queryKey: ['feed', childId ?? ''],
    enabled: Boolean(childId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      unwrap(api.GET('/children/{childId}/feed', { params: { path: { childId: childId! }, query: { cursor: pageParam, limit: 5 } } })),
    getNextPageParam: (last) => last.next_cursor,
    staleTime: Infinity,
  });
}

/**
 * Saves the like and save state of one feed item (PUT .../feed/{itemId}/reaction). Sends the full state, not a
 * toggle, so repeating it is safe.
 */
export function reactToFeedItem(childId: string, itemId: string, state: { liked: boolean; saved: boolean }) {
  return unwrap(api.PUT('/children/{childId}/feed/{itemId}/reaction', { params: { path: { childId, itemId } }, body: state }));
}

/**
 * Sends the child's answer to a puzzle card in the feed (POST .../feed/{itemId}/answer) and returns the server's
 * grading.
 */
export function answerFeedPuzzle(childId: string, itemId: string, answer: AnswerValue) {
  return unwrap(api.POST('/children/{childId}/feed/{itemId}/answer', { params: { path: { childId, itemId } }, body: { answer } }));
}

// ───────── Discover: 200 curated photos, animations and short videos (BE-80) ─────────
/** Window event the Discover tab fires when it is tapped while already open: the feed scrolls to top and reshuffles. */
export const FEED_RETAP = 'nx:feed-retap';

/** A fresh random seed: one per open or tap of the Discover tab. 2^52 values, so two visits never collide in practice. */
export function newDiscoverSeed(): number {
  const b = new Uint32Array(2);
  crypto.getRandomValues(b);
  return (b[0] % 0x100000) * 0x100000000 + b[1]; // 20 + 32 bits, below Number.MAX_SAFE_INTEGER
}

/**
 * Cursor-paginated Discover feed, 12 items a page. The cursor is opaque; the feed never ends. `seed` picks the order
 * of this visit and goes with every page, so paging stays consistent. A new seed is a new query: nothing of the old
 * order is reused, and the old pages are dropped at once (gcTime 0) so no cache can bring them back.
 */
export function useDiscover(childId: string | null, seed: number) {
  return useInfiniteQuery({
    queryKey: ['discover', childId ?? '', seed],
    enabled: Boolean(childId),
    gcTime: 0,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      unwrap(api.GET('/children/{childId}/discover', { params: { path: { childId: childId! }, query: { cursor: pageParam, limit: 12, seed } } })),
    getNextPageParam: (last) => last.next_cursor,
    staleTime: Infinity,
  });
}
