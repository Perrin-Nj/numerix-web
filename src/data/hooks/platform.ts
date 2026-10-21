'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiMode, unwrap } from '@/data/api/client';
import type { components } from '@/data/api/schema';
import type {
  CheckoutRequest,
  CheckoutResult,
  Plan,
  PlatformPublic,
  ServerNotification,
  Subscription,
} from '@/data/api/platform-types';

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

/**
 * TanStack Query keys for the server-owned platform data: subscription, plans, notifications and public platform
 * info.
 */
export const platformKeys = {
  subscription: ['subscription'] as const,
  plans: ['subscription-plans'] as const,
  notifications: ['notifications'] as const,
  public: ['platform-public'] as const,
};

const items = <T>(r: T[] | { items: T[] }) => (Array.isArray(r) ? r : r.items);

/**
 * Query for the parent's subscription (GET /subscription). Server-owned in both state-source modes. Pass
 * enabled=false until the parent is signed in.
 */
export function useSubscription(enabled = true) {
  return useQuery({ queryKey: platformKeys.subscription, enabled, queryFn: () => call<Subscription>('GET', '/subscription') });
}

type RawPlan = Partial<Plan> & { id: Plan['id']; price_cad_cents?: number };

/**
 * Query for the plans offered (GET /subscription/plans), cached 5 min. Accepts either a bare list or {plans},
 * and converts price_cad_cents to dollars when only cents are given.
 */
export function usePlans(enabled = true) {
  return useQuery({
    queryKey: platformKeys.plans,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: () =>
      call<{ plans: RawPlan[] } | RawPlan[]>('GET', '/subscription/plans').then((r) =>
        (Array.isArray(r) ? r : r.plans).map((p): Plan => ({ id: p.id, price_cad: p.price_cad ?? (p.price_cad_cents ?? 0) / 100, interval: p.interval, name: p.name })),
      ),
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

/**
 * Mutation for POST /subscription/cancel. The screen shows its own error, and success refreshes the subscription
 * query.
 */
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

/** Mutation for POST /notifications/{id}/read, then refreshes the notification list so the bell count drops. */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call<unknown>('POST', `/notifications/${encodeURIComponent(id)}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformKeys.notifications }),
  });
}

/** Query for public platform info (GET /platform/public), cached 5 min. */
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

/** GET /config/public: what the admin controls at runtime (music, voice, scenes, flags, maintenance). */
export type AppPublicConfig = components['schemas']['AppPublicConfig'];
const CFG_CACHE = 'nx.public-config';

/**
 * Query for the admin-controlled app config. The server answers with max-age=60, so it is cached 60 s here. If the call
 * fails the last good copy kept in localStorage is used, then null: every reader must treat null as "nothing
 * customised" (music on, nothing blocked).
 */
export function usePublicConfig() {
  return useQuery({
    queryKey: ['public-config'] as const,
    staleTime: 60_000,
    refetchInterval: 120_000, // a closed screen reopens by itself when the admin ends maintenance
    retry: false,
    queryFn: async (): Promise<AppPublicConfig | null> => {
      try {
        const cfg = await call<AppPublicConfig>('GET', '/config/public');
        try {
          localStorage.setItem(CFG_CACHE, JSON.stringify(cfg));
        } catch {
          /* private window: no cache */
        }
        return cfg;
      } catch {
        try {
          // a stale copy must never keep the app closed: maintenance is dropped from the fallback
          const old = JSON.parse(localStorage.getItem(CFG_CACHE) ?? 'null') as AppPublicConfig | null;
          return old && { ...old, maintenance: { ...old.maintenance, enabled: false, block_play: false } };
        } catch {
          return null;
        }
      }
    },
  });
}
