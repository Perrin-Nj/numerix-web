'use client';
/** Pictures of the question bank: credits list, hints, and a warm-up so the next question never waits on images. */
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/data/api/client';
import type { Beat, MediaRef } from '@/data/api/types';
import { requestBeat } from './sessions';

/** Attributions required by the images in use (GET /credits). Public, immutable for a day. */
export function useCredits() {
  return useQuery({
    queryKey: ['credits'] as const,
    queryFn: () => unwrap(api.GET('/credits')).then((r) => r.items),
    staleTime: 24 * 60 * 60_000,
  });
}

/** Written hint of the open question (BE-70). 404 when there is none, 409 once answered. */
export function getHint(sessionId: string, beatId: string) {
  return unwrap(
    api.POST('/sessions/{sessionId}/beats/{beatId}/hint', {
      params: { path: { sessionId, beatId } },
    }),
  ).then((r) => r.hint);
}

/**
 * The next beat of a session, cached by how many beats are answered. Calling it twice shares one request, so the
 * screen can start it as soon as an answer is graded and read it when the child taps Continue. Retries twice with
 * a short back-off before the screen shows its retry state.
 */
export function fetchBeat(qc: QueryClient, sessionId: string, answered: number): Promise<Beat> {
  return qc.fetchQuery({
    queryKey: ['next-beat', sessionId, answered] as const,
    queryFn: () => requestBeat(sessionId),
    staleTime: Infinity,
    retry: 2,
    retryDelay: (n) => 400 * 2 ** n,
  });
}

/** Drops a consumed or failed prefetch. */
export function forgetBeat(qc: QueryClient, sessionId: string, answered: number) {
  qc.removeQueries({ queryKey: ['next-beat', sessionId, answered] });
}

const warmed = new Set<string>();
/** Starts downloading the pictures of a beat (scene and sprites) at the sizes the play screen uses. */
export function preloadMedia(beat: Beat, sizes = '100vw') {
  if (typeof Image === 'undefined') return;
  for (const m of beat.question.media ?? []) {
    const ref: MediaRef = m.image;
    if (warmed.has(ref.id)) continue;
    warmed.add(ref.id);
    const img = new Image();
    img.sizes = sizes;
    img.srcset = ref.srcset.map((s) => `${s.url} ${s.w}w`).join(', ');
    img.decoding = 'async';
    img.src = ref.srcset[ref.srcset.length - 1]?.url ?? '';
  }
}
