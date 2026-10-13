'use client';
/** Game state for the screens. Local mode derives it from the on-device event log, api mode reads the server. */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import * as G from '@/domain/game/selectors';
import { nowMs } from '@/domain/game/clock';
import { useGameEvents } from '@/data/local/store';
import type { GameEvent } from '@/domain/game/events';
import type { Lang } from '@/domain/game/catalog';
import { api, unwrap } from '@/data/api/client';
import type { WorldId } from '@/data/api/types';
import { apiOn, keys } from './keys';
import { useChildSettings } from './children';

// ───────── Catalog, home, journey ─────────
export function useWorlds() {
  return useQuery({ queryKey: keys.worlds, queryFn: () => unwrap(api.GET('/worlds')).then((r) => r.items), staleTime: 10 * 60_000 });
}

function useApiHome(id: string | null) {
  return useQuery({
    queryKey: keys.home(id ?? ''),
    enabled: apiOn && Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/home', { params: { path: { childId: id! } } })),
  });
}

function useApiJourney(id: string | null, world: WorldId) {
  return useQuery({
    queryKey: keys.journey(id ?? '', world),
    enabled: apiOn && Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/journey', { params: { path: { childId: id! }, query: { world } } })),
  });
}

function useApiCollection(id: string | null) {
  return useInfiniteQuery({
    queryKey: keys.collection(id ?? ''),
    enabled: apiOn && Boolean(id),
    initialPageParam: undefined as string | undefined,
    queryFn: () => unwrap(api.GET('/children/{childId}/collection', { params: { path: { childId: id! } } })),
    getNextPageParam: () => undefined,
  });
}

function useApiEngagement(id: string | null) {
  return useQuery({
    queryKey: keys.engagement(id ?? ''),
    enabled: apiOn && Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/engagement', { params: { path: { childId: id! } } })),
  });
}

function useApiGrowth(id: string | null) {
  return useQuery({
    queryKey: keys.growth(id ?? ''),
    enabled: apiOn && Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/growth', { params: { path: { childId: id! } } })),
  });
}

function useApiDailyQuest(id: string | null) {
  return useQuery({
    queryKey: keys.quest(id ?? ''),
    enabled: apiOn && Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/quests/daily', { params: { path: { childId: id! } } })),
  });
}

// ───────── Parent data ─────────
function useApiProgress(id: string) {
  return useQuery({ queryKey: keys.progress(id), enabled: apiOn, queryFn: () => unwrap(api.GET('/children/{childId}/progress', { params: { path: { childId: id } } })) });
}

function useApiSessionList(id: string) {
  return useQuery({
    queryKey: keys.sessions(id),
    enabled: apiOn,
    queryFn: () => unwrap(api.GET('/children/{childId}/sessions', { params: { path: { childId: id } } })).then((r) => r.items),
  });
}

function useApiSessionSummary(sid: string) {
  return useQuery({ queryKey: keys.summary(sid), enabled: apiOn, queryFn: () => unwrap(api.GET('/sessions/{sessionId}/summary', { params: { path: { sessionId: sid } } })) });
}

function useApiWeeklyReport(id: string) {
  return useQuery({ queryKey: keys.weekly(id), enabled: apiOn, queryFn: () => unwrap(api.GET('/reports/weekly', { params: { query: { child_id: id } } })) });
}

// ───────── State source: on-device game state (local) or the server (api) ─────────
// Screens call these wrappers only. In local mode the numbers come from the event log; in api mode from the server.
function useLang(): Lang {
  return useLocale().startsWith('en') ? 'en' : 'fr';
}

function fake<T>(data: T | undefined) {
  return { data, isLoading: false, isFetching: false, isError: false, error: null, refetch: async () => ({ data }) };
}

function useDerived<T>(childId: string | null, fn: (ev: GameEvent[], now: number, lang: Lang) => T): T | undefined {
  const ev = useGameEvents(childId);
  const lang = useLang();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (childId && !apiOn ? fn(ev, nowMs(), lang) : undefined), [ev, lang, childId]);
}

function useGoal(childId: string | null) {
  return useChildSettings(childId ?? '').data?.daily_goal_chapters ?? 1;
}

/**
 * Home screen data for a child. In api mode it reads the server; in local mode it derives it from the event log
 * with selectors.home, using the child's daily goal. Returns a query-shaped result either way.
 */
export function useHome(id: string | null) {
  const api = useApiHome(id);
  const goal = useGoal(id);
  const local = useDerived(id, (ev, now, lang) => G.home(ev, now, lang, goal));
  return (apiOn ? api : fake(local)) as typeof api;
}

/**
 * Journey map of one world for a child: skill nodes and their states. Server in api mode, selectors.journey over
 * the local events otherwise.
 */
export function useJourney(id: string | null, world: WorldId) {
  const api = useApiJourney(id, world);
  const local = useDerived(id, (ev, now, lang) => G.journey(ev, world, now, lang));
  return (apiOn ? api : fake(local)) as typeof api;
}

/**
 * The child's story-card collection. Api mode is an infinite query; local mode wraps the whole list as a single
 * page with no next page.
 */
export function useCollection(id: string | null) {
  const api = useApiCollection(id);
  const local = useDerived(id, (ev) => G.collection(ev));
  const shaped = {
    ...fake(local ? { pages: [{ items: local, next_cursor: null }], pageParams: [undefined] } : undefined),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: async () => ({}),
  };
  return (apiOn ? api : shaped) as typeof api;
}

/**
 * Streak, daily goal and related engagement figures. Server in api mode, selectors.engagement with the child's
 * daily goal otherwise.
 */
export function useEngagement(id: string | null) {
  const api = useApiEngagement(id);
  const goal = useGoal(id);
  const local = useDerived(id, (ev, now) => G.engagement(ev, now, goal));
  return (apiOn ? api : fake(local)) as typeof api;
}

/**
 * Growth summary per world for the parent and Me views. Server in api mode, selectors.growth over the local
 * events otherwise.
 */
export function useGrowth(id: string | null) {
  const api = useApiGrowth(id);
  const local = useDerived(id, (ev, now) => G.growth(ev, now));
  return (apiOn ? api : fake(local)) as typeof api;
}

/**
 * Today's quest. In local mode it is the quest part of selectors.home; in api mode it is a dedicated server
 * query.
 */
export function useDailyQuest(id: string | null) {
  const api = useApiDailyQuest(id);
  const local = useDerived(id, (ev, now, lang) => G.home(ev, now, lang).quest);
  return (apiOn ? api : fake(local)) as typeof api;
}

/** Progress overview for a child. Server in api mode, selectors.progress over the local events otherwise. */
export function useProgress(id: string) {
  const api = useApiProgress(id);
  const local = useDerived(id, (ev, now, lang) => G.progress(ev, now, lang));
  return (apiOn ? api : fake(local)) as typeof api;
}

/** List of a child's past sessions. Server in api mode, selectors.sessionList over the local events otherwise. */
export function useSessionList(id: string) {
  const api = useApiSessionList(id);
  const local = useDerived(id, (ev) => G.sessionList(ev, id));
  return (apiOn ? api : fake(local)) as typeof api;
}

/**
 * Summary of one finished session by id. Local mode needs childId to find the events; without it the result
 * stays undefined.
 */
export function useSessionSummary(sid: string, childId?: string) {
  const api = useApiSessionSummary(sid);
  const local = useDerived(childId ?? null, (ev, _now, lang) => G.sessionSummary(ev, sid, lang, childId) ?? undefined);
  return (apiOn ? api : fake(local)) as typeof api;
}

/**
 * The parent's weekly report for a child. Server in api mode, selectors.weeklyReport over the local events
 * otherwise.
 */
export function useWeeklyReport(id: string) {
  const api = useApiWeeklyReport(id);
  const local = useDerived(id, (ev, now, lang) => G.weeklyReport(ev, id, now, lang));
  return (apiOn ? api : fake(local)) as typeof api;
}

/** Challenges are local-only until the server has them (BE-20). */
export function useChallenges(id: string | null) {
  const lang = useLang();
  const ev = useGameEvents(id);
  return useMemo(() => G.challengeViews(ev, lang), [ev, lang]);
}
