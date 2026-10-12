'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiMode, unwrap } from '@/lib/api/client';
import type {
  CheckoutRequest,
  CheckoutResult,
  Plan,
  PlatformPublic,
  ServerNotification,
  Subscription,
} from '@/lib/api/platform-types';

/** Same-origin proxy, same as the generated client. Replaced by `api.GET` once the OpenAPI regen includes these routes. */
const BASE = '/api/v1';

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const run = async () => {
    const response = await fetch(BASE + path, {
      method,
      headers: { 'x-nx-mode': getApiMode(), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    const text = await response.text();
    let json: unknown;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined; // not JSON: the status still decides success or failure
      }
    }
    return response.ok ? { data: json as T, response } : { error: json, response };
  };
  // unwrap classifies connection failures and turns problem+json into a typed ApiError
  return unwrap<T>(run());
}

export const platformKeys = {
  subscription: ['subscription'] as const,
  plans: ['subscription-plans'] as const,
  notifications: ['notifications'] as const,
  public: ['platform-public'] as const,
};

const items = <T>(r: T[] | { items: T[] }) => (Array.isArray(r) ? r : r.items);

export function useSubscription(enabled = true) {
  return useQuery({ queryKey: platformKeys.subscription, enabled, queryFn: () => call<Subscription>('GET', '/subscription') });
}

export function usePlans(enabled = true) {
  return useQuery({
    queryKey: platformKeys.plans,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: () => call<Plan[] | { items: Plan[] }>('GET', '/subscription/plans').then(items),
  });
}

/** `handled`: the screen shows its own error with Retry, so the global toast stays quiet. */
export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CheckoutRequest) => call<CheckoutResult>('POST', '/subscription/checkout', body),
    meta: { handled: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: platformKeys.subscription }),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call<Subscription>('POST', '/subscription/cancel'),
    meta: { handled: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: platformKeys.subscription }),
  });
}

/** Polls every 60 s; TanStack pauses interval refetch while the tab is hidden. */
export function useServerNotifications(enabled = true) {
  return useQuery({
    queryKey: platformKeys.notifications,
    enabled,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
    queryFn: () => call<ServerNotification[] | { items: ServerNotification[] }>('GET', '/notifications').then(items),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call<unknown>('POST', `/notifications/${encodeURIComponent(id)}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformKeys.notifications }),
  });
}

export function usePlatformPublic(enabled = true) {
  return useQuery({
    queryKey: platformKeys.public,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: () => call<PlatformPublic>('GET', '/platform/public'),
  });
}

/** BE-26. Used by `subscribeToPush`; kept here so every platform call shares one error path. */
export const postPushSubscription = (subscription: PushSubscriptionJSON) => call<unknown>('POST', '/push/subscribe', subscription);
