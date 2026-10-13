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
