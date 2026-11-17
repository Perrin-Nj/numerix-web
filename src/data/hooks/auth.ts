'use client';
/** Parent registration, login and consent. */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/data/api/client';
import { keys } from './keys';

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

/**
 * Mutation for POST /auth/login (parent). Errors are handled by the form, not the global toast, and a success
 * invalidates the session status query.
 */
export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => unwrap(api.POST('/auth/login', { body })),
    meta: { handled: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.session }),
  });
}

/**
 * Mutation for POST /auth/consent: records the parent's acceptance of a given consent version for one child,
 * then refreshes the children list so the consent flag updates.
 */
export function useConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { child_id: string; version: string }) =>
      unwrap(api.POST('/auth/consent', { body: { ...body, accepted: true } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.children }),
  });
}

/**
 * Mutation for POST /auth/password/reset: email, the 8 digit code from the Numerix team and the new password.
 * No session opens: the parent signs in afterwards. The form handles errors itself.
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (body: { email: string; code: string; password: string }) => unwrap(api.POST('/auth/password/reset', { body })),
    meta: { handled: true },
  });
}
