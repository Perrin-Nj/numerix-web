'use client';
/** Game state for the screens: every number comes from the server. */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/data/api/client';
import type { WorldId } from '@/data/api/types';
import { keys } from './keys';

// ───────── Catalog, home, journey ─────────
/** World catalog. */
) {
  return useQuery({ queryKey: keys.worlds, queryFn: () => unwrap(api.GET('/worlds')).then((r) => r.items), staleTime: 10 * 60_000 });
}

/** Home screen data for a child: next step, quest, worlds, recent cards, engagement, gift flag. */
id: string | null) {
  return useQuery({
    queryKey: keys.home(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/home', { params: { path: { childId: id! } } })),
  });
}

/** Journey map of one world for a child. */
id: string | null, world: WorldId) {
  return useQuery({
    queryKey: keys.journey(id ?? '', world),
    enabled: Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/journey', { params: { path: { childId: id! }, query: { world } } })),
  });
}

/** The child's story-card collection. */
id: string | null) {
  return useInfiniteQuery({
    queryKey: keys.collection(id ?? ''),
    enabled: Boolean(id),
    initialPageParam: undefined as string | undefined,
    queryFn: () => unwrap(api.GET('/children/{childId}/collection', { params: { path: { childId: id! } } })),
    getNextPageParam: () => undefined,
  });
}

/** Streak, daily goal and related figures. */
id: string | null) {
  return useQuery({
    queryKey: keys.engagement(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/engagement', { params: { path: { childId: id! } } })),
  });
}

/** Growth summary per world. */
id: string | null) {
  return useQuery({
    queryKey: keys.growth(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/growth', { params: { path: { childId: id! } } })),
  });
}

/** Today's quest. */
id: string | null) {
  return useQuery({
    queryKey: keys.quest(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/quests/daily', { params: { path: { childId: id! } } })),
  });
}

// ───────── Parent data ─────────
/** Progress overview for a child. */
id: string) {
  return useQuery({ queryKey: keys.progress(id), queryFn: () => unwrap(api.GET('/children/{childId}/progress', { params: { path: { childId: id } } })) });
}

/** A child's past sessions. */
id: string) {
  return useQuery({
    queryKey: keys.sessions(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/sessions', { params: { path: { childId: id } } })).then((r) => r.items),
  });
}

/** Summary of one finished session. */
sid: string) {
  return useQuery({ queryKey: keys.summary(sid), queryFn: () => unwrap(api.GET('/sessions/{sessionId}/summary', { params: { path: { sessionId: sid } } })) });
}

/** The parent's weekly report for a child. */
id: string) {
  return useQuery({ queryKey: keys.weekly(id), queryFn: () => unwrap(api.GET('/reports/weekly', { params: { query: { child_id: id } } })) });
}

// ───────── Challenges and the welcome gift ─────────
/** The challenge catalogue with this child's progress. */
id: string | null) {
  return useQuery({
    queryKey: keys.challenges(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/challenges', { params: { path: { childId: id! } } })).then((r) => r.items),
  });
}

/** Accepts one challenge; progress counts from now. Errors reach the global toast. */
export function useAcceptChallenge(childId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) =>
      unwrap(api.POST('/children/{childId}/challenges/{challengeId}/accept', { params: { path: { childId: childId!, challengeId } } })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: keys.challenges(childId ?? '') }), qc.invalidateQueries({ queryKey: keys.home(childId ?? '') })]),
  });
}

/** Claims the one-time welcome gift (idempotent), then refreshes home and the collection. */
export function useClaimGift(childId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST('/children/{childId}/gift/claim', { params: { path: { childId: childId! } } })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: keys.home(childId ?? '') }), qc.invalidateQueries({ queryKey: keys.collection(childId ?? '') })]),
  });
}
