'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, newIdempotencyKey, unwrap } from '@/lib/api/client';
import type { AnswerValue, ChildSettings, WorldId } from '@/lib/api/types';

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
export function useChildren() {
  return useQuery({ queryKey: keys.children, queryFn: () => unwrap(api.GET('/children')).then((r) => r.items) });
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
    queryFn: () => unwrap(api.GET('/children/{childId}/settings', { params: { path: { childId: id } } })),
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

export function useHome(id: string | null) {
  return useQuery({
    queryKey: keys.home(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/home', { params: { path: { childId: id! } } })),
  });
}

export function useJourney(id: string | null, world: WorldId) {
  return useQuery({
    queryKey: keys.journey(id ?? '', world),
    enabled: Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/journey', { params: { path: { childId: id! }, query: { world } } })),
  });
}

export function useCollection(id: string | null) {
  return useInfiniteQuery({
    queryKey: keys.collection(id ?? ''),
    enabled: Boolean(id),
    initialPageParam: undefined as string | undefined,
    queryFn: () => unwrap(api.GET('/children/{childId}/collection', { params: { path: { childId: id! } } })),
    getNextPageParam: () => undefined,
  });
}

export function useEngagement(id: string | null) {
  return useQuery({
    queryKey: keys.engagement(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/engagement', { params: { path: { childId: id! } } })),
  });
}

export function useGrowth(id: string | null) {
  return useQuery({
    queryKey: keys.growth(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/growth', { params: { path: { childId: id! } } })),
  });
}

export function useDailyQuest(id: string | null) {
  return useQuery({
    queryKey: keys.quest(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/quests/daily', { params: { path: { childId: id! } } })),
  });
}

// ───────── Parent data ─────────
export function useProgress(id: string) {
  return useQuery({ queryKey: keys.progress(id), queryFn: () => unwrap(api.GET('/children/{childId}/progress', { params: { path: { childId: id } } })) });
}

export function useSessionList(id: string) {
  return useQuery({
    queryKey: keys.sessions(id),
    queryFn: () => unwrap(api.GET('/children/{childId}/sessions', { params: { path: { childId: id } } })).then((r) => r.items),
  });
}

export function useSessionSummary(sid: string) {
  return useQuery({ queryKey: keys.summary(sid), queryFn: () => unwrap(api.GET('/sessions/{sessionId}/summary', { params: { path: { sessionId: sid } } })) });
}

export function useWeeklyReport(id: string) {
  return useQuery({ queryKey: keys.weekly(id), queryFn: () => unwrap(api.GET('/reports/weekly', { params: { query: { child_id: id } } })) });
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
