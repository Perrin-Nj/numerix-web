'use client';
import { clearLocalState } from '@/lib/session/clear';
import { setCardThresholdPct } from '@/lib/game/rules';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { appConfig } from '@/config/app';
import * as G from '@/lib/game/selectors';
import { nowMs } from '@/lib/game/clock';
import { useGameEvents } from '@/lib/game/store';
import type { GameEvent } from '@/lib/game/events';
import type { Lang } from '@/lib/game/catalog';
import { api, newIdempotencyKey, unwrap } from '@/lib/api/client';
import type { AnswerValue, ChildSettings, WorldId } from '@/lib/api/types';

const apiOn = appConfig.stateSource === 'api';

/** Query keys in one place so invalidation stays consistent. */
export const keys = {
  session: ['session-status'] as const,
  children: ['children'] as const,
  settings: (id: string) => ['settings', id] as const,
  worlds: ['worlds'] as const,
  home: (id: string) => ['home', id] as const,
  journey: (id: string, world: string) => ['journey', id, world] as const,
  collection: (id: string) => ['collection', id] as const,
  engagement: (id: string) => ['engagement', id] as const,
  growth: (id: string) => ['growth', id] as const,
  quest: (id: string) => ['quest', id] as const,
  progress: (id: string) => ['progress', id] as const,
  sessions: (id: string) => ['sessions', id] as const,
  summary: (sid: string) => ['summary', sid] as const,
  weekly: (id: string) => ['weekly', id] as const,
  session_one: (sid: string) => ['session', sid] as const,
};

// ───────── Session status (cookies are httpOnly, so ask the server) ─────────
setCardThresholdPct(appConfig.cardThresholdPct);

export type SessionStatus = { parent: boolean; child: boolean; childId: string | null };

export function useSessionStatus() {
  return useQuery({
    queryKey: keys.session,
    queryFn: async (): Promise<SessionStatus> => {
      const res = await fetch('/api/session', { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not read session status');
      return res.json();
    },
    staleTime: 5_000,
  });
}

export async function signOut(scope: 'child' | 'all') {
  const res = await fetch(`/api/session?scope=${scope}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Sign out failed');
  // forget cached child data on this device
  clearLocalState(scope);
  if ('serviceWorker' in navigator) navigator.serviceWorker.controller?.postMessage('CLEAR_DATA');
}

// ───────── Auth ─────────
export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string; locale: 'fr-CA' | 'en-CA' }) =>
      unwrap(api.POST('/auth/register', { body })),
    meta: { handled: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.session }),
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => unwrap(api.POST('/auth/login', { body })),
    meta: { handled: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.session }),
  });
}

export function useConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { child_id: string; version: string }) =>
      unwrap(api.POST('/auth/consent', { body: { ...body, accepted: true } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.children }),
  });
}

// ───────── Children ─────────
export function useChildren(enabled = true) {
  return useQuery({ queryKey: keys.children, enabled, queryFn: () => unwrap(api.GET('/children')).then((r) => r.items) });
}

export function useCreateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { display_name: string; grade: number; avatar_id: string; pin?: string; timezone?: string }) =>
      unwrap(api.POST('/children', { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.children }),
  });
}

export function useUpdateChild(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { display_name?: string; grade?: number; avatar_id?: string; onboarding_completed?: boolean }) =>
      unwrap(api.PATCH('/children/{childId}', { params: { path: { childId: id } }, body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.children }),
  });
}

export function useDeleteChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE('/children/{childId}', { params: { path: { childId: id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.children }),
  });
}

export function useChildToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin?: string }) =>
      unwrap(api.POST('/children/{childId}/token', { params: { path: { childId: id } }, body: pin ? { pin } : {} })),
    meta: { handled: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.session }),
  });
}

export function useChildSettings(id: string) {
  return useQuery({
    queryKey: keys.settings(id),
    enabled: Boolean(id),
    queryFn: (): Promise<ChildSettings> => unwrap(api.GET('/children/{childId}/settings', { params: { path: { childId: id } } })),
  });
}

export function useUpdateSettings(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChildSettings) =>
      unwrap(api.PUT('/children/{childId}/settings', { params: { path: { childId: id } }, body })),
    onSuccess: (data) => qc.setQueryData(keys.settings(id), data),
  });
}

export async function exportChild(id: string) {
  return unwrap(api.GET('/children/{childId}/export', { params: { path: { childId: id } } }));
}

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

// ───────── Play ─────────
export function useStartSession(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { world: WorldId; kind: 'chapter' | 'daily_quest' | 'onboarding'; skill_id?: string | null }) =>
      unwrap(
        api.POST('/children/{childId}/sessions', {
          params: { path: { childId }, header: { 'Idempotency-Key': newIdempotencyKey() } },
          body,
        }),
      ),
    meta: { handled: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.home(childId) }),
  });
}

export function getSession(sessionId: string) {
  return unwrap(api.GET('/sessions/{sessionId}', { params: { path: { sessionId } } }));
}

export function requestBeat(sessionId: string) {
  return unwrap(api.POST('/sessions/{sessionId}/beats', { params: { path: { sessionId }, header: { 'Idempotency-Key': newIdempotencyKey() } } }));
}

export function sendAnswer(sessionId: string, beatId: string, answer: AnswerValue, key: string) {
  return unwrap(
    api.POST('/sessions/{sessionId}/beats/{beatId}/answer', {
      params: { path: { sessionId, beatId }, header: { 'Idempotency-Key': key } },
      body: { answer },
    }),
  );
}

export function pauseSession(sessionId: string) {
  return unwrap(api.POST('/sessions/{sessionId}/pause', { params: { path: { sessionId } } }));
}

export function resumeSession(sessionId: string) {
  return unwrap(api.POST('/sessions/{sessionId}/resume', { params: { path: { sessionId } } }));
}

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

export function reactToFeedItem(childId: string, itemId: string, state: { liked: boolean; saved: boolean }) {
  return unwrap(api.PUT('/children/{childId}/feed/{itemId}/reaction', { params: { path: { childId, itemId } }, body: state }));
}

export function answerFeedPuzzle(childId: string, itemId: string, answer: AnswerValue) {
  return unwrap(api.POST('/children/{childId}/feed/{itemId}/answer', { params: { path: { childId, itemId } }, body: { answer } }));
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

export function useHome(id: string | null) {
  const api = useApiHome(id);
  const goal = useGoal(id);
  const local = useDerived(id, (ev, now, lang) => G.home(ev, now, lang, goal));
  return (apiOn ? api : fake(local)) as typeof api;
}

export function useJourney(id: string | null, world: WorldId) {
  const api = useApiJourney(id, world);
  const local = useDerived(id, (ev, now, lang) => G.journey(ev, world, now, lang));
  return (apiOn ? api : fake(local)) as typeof api;
}

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

export function useEngagement(id: string | null) {
  const api = useApiEngagement(id);
  const goal = useGoal(id);
  const local = useDerived(id, (ev, now) => G.engagement(ev, now, goal));
  return (apiOn ? api : fake(local)) as typeof api;
}

export function useGrowth(id: string | null) {
  const api = useApiGrowth(id);
  const local = useDerived(id, (ev, now) => G.growth(ev, now));
  return (apiOn ? api : fake(local)) as typeof api;
}

export function useDailyQuest(id: string | null) {
  const api = useApiDailyQuest(id);
  const local = useDerived(id, (ev, now, lang) => G.home(ev, now, lang).quest);
  return (apiOn ? api : fake(local)) as typeof api;
}

export function useProgress(id: string) {
  const api = useApiProgress(id);
  const local = useDerived(id, (ev, now, lang) => G.progress(ev, now, lang));
  return (apiOn ? api : fake(local)) as typeof api;
}

export function useSessionList(id: string) {
  const api = useApiSessionList(id);
  const local = useDerived(id, (ev) => G.sessionList(ev, id));
  return (apiOn ? api : fake(local)) as typeof api;
}

export function useSessionSummary(sid: string, childId?: string) {
  const api = useApiSessionSummary(sid);
  const local = useDerived(childId ?? null, (ev, _now, lang) => G.sessionSummary(ev, sid, lang, childId) ?? undefined);
  return (apiOn ? api : fake(local)) as typeof api;
}

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

export function finishSession(sessionId: string) {
  return unwrap(api.POST('/sessions/{sessionId}/finish', { params: { path: { sessionId } } }));
}
