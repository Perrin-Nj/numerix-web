'use client';
/** Child profiles, child token, settings and data export. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/data/api/client';
import type { ChildSettings } from '@/data/api/types';
import { keys } from './keys';

// ───────── Children ─────────
export function useChildren(enabled = true) {
  return useQuery({ queryKey: keys.children, enabled, queryFn: () => unwrap(api.GET('/children')).then((r) => r.items) });
}

/**
 * Mutation for POST /children: adds a child profile (name, grade, avatar, optional PIN and timezone) and
 * refreshes the children list.
 */
export function useCreateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { display_name: string; grade: number; avatar_id: string; pin?: string; timezone?: string }) =>
      unwrap(api.POST('/children', { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.children }),
  });
}

/**
 * Mutation for PATCH /children/{id} bound to one child: edits name, grade, avatar or the onboarding flag, then
 * refreshes the children list.
 */
export function useUpdateChild(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { display_name?: string; grade?: number; avatar_id?: string; onboarding_completed?: boolean }) =>
      unwrap(api.PATCH('/children/{childId}', { params: { path: { childId: id } }, body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.children }),
  });
}

/**
 * Mutation for DELETE /children/{id}: removes the profile and its server data, then refreshes the children list.
 * Takes the child id as the variable.
 */
export function useDeleteChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE('/children/{childId}', { params: { path: { childId: id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.children }),
  });
}

/**
 * Mutation for POST /children/{id}/token: exchanges the child id (and the PIN when one is set) for a child
 * session, which the proxy stores in a cookie. Errors such as invalid_pin are shown by the caller.
 */
export function useChildToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin?: string }) =>
      unwrap(api.POST('/children/{childId}/token', { params: { path: { childId: id } }, body: pin ? { pin } : {} })),
    meta: { handled: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.session }),
  });
}

/**
 * Query for GET /children/{id}/settings (daily goal, worlds allowed, limits). Disabled while id is empty. Also
 * read by state hooks for the daily goal.
 */
export function useChildSettings(id: string) {
  return useQuery({
    queryKey: keys.settings(id),
    enabled: Boolean(id),
    queryFn: (): Promise<ChildSettings> => unwrap(api.GET('/children/{childId}/settings', { params: { path: { childId: id } } })),
  });
}

/**
 * Mutation for PUT /children/{id}/settings. Sends the full settings object and writes the server's reply
 * straight into the cache, so no refetch is needed.
 */
export function useUpdateSettings(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChildSettings) =>
      unwrap(api.PUT('/children/{childId}/settings', { params: { path: { childId: id } }, body })),
    onSuccess: (data) => qc.setQueryData(keys.settings(id), data),
  });
}

/**
 * Downloads all server data held for one child (GET /children/{id}/export), for the parent's data-export action.
 * Not a hook: call it from an event handler.
 */
export async function exportChild(id: string) {
  return unwrap(api.GET('/children/{childId}/export', { params: { path: { childId: id } } }));
}
