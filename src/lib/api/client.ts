'use client';
import createClient from 'openapi-fetch';
import type { paths } from './schema';
import type { Problem } from './types';

/** Every call goes through the same-origin proxy (/api/v1). Tokens live in httpOnly cookies there. */
const BASE = '/api/v1';

export type ApiMode = 'parent' | 'child';
let mode: ApiMode = 'parent';
export function setApiMode(next: ApiMode) {
  mode = next;
}
export function getApiMode() {
  return mode;
}

export type ErrorCode =
  | 'consent_missing'
  | 'daily_limit_reached'
  | 'session_active'
  | 'session_paused'
  | 'session_completed'
  | 'beat_answered'
  | 'invalid_pin'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'rate_limited'
  | 'internal_error'
  | 'subscription_inactive'
  | 'account_blocked'
  | 'device_offline'
  | 'server_unreachable'
  | 'backend_unreachable'
  | 'backend_timeout'
  | 'request_failed'
  | 'unknown';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly detail?: string;
  constructor(status: number, code: ErrorCode, title: string, detail?: string) {
    super(title);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

/** Problems with reaching the service at all, as opposed to the service answering with an error. */
export const CONNECTION_CODES: ErrorCode[] = ['device_offline', 'server_unreachable', 'backend_unreachable', 'backend_timeout', 'request_failed'];
export const isConnectionProblem = (code: string) => (CONNECTION_CODES as string[]).includes(code);
/** Connection problems the user can fix on their side. Everything else in the list is on our side. */
export const isOnTheUsersSide = (code: string) => code === 'device_offline';

/**
 * A request failed before any answer came back. Find out why instead of guessing:
 * 1. the device says it is offline            -> device_offline (the user's connection)
 * 2. our own app does not answer              -> server_unreachable (cannot tell which side; the message says so)
 * 3. our app answers but its backend does not -> backend_unreachable (on us)
 * 4. everything answers                       -> request_failed (transient)
 */
export async function classifyConnectionFailure(): Promise<ApiError> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new ApiError(0, 'device_offline', 'Device offline');
  }
  try {
    const res = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (!res.ok) return new ApiError(res.status, 'server_unreachable', 'App unreachable');
    const health = (await res.json()) as { backend?: string };
    if (health.backend === 'timeout') return new ApiError(504, 'backend_timeout', 'Backend timeout');
    if (health.backend !== 'ok') return new ApiError(502, 'backend_unreachable', 'Backend unreachable');
    return new ApiError(0, 'request_failed', 'Request failed');
  } catch {
    return new ApiError(0, 'server_unreachable', 'App unreachable');
  }
}

export const api = createClient<paths>({
  baseUrl: BASE,
  fetch: (req) => {
    req.headers.set('x-nx-mode', mode);
    return fetch(req);
  },
});

function fromProblem(status: number, p: Partial<Problem> | undefined): ApiError {
  const code = (p?.code as ErrorCode | undefined) ?? (status === 401 ? 'unauthorized' : status === 404 ? 'not_found' : status === 429 ? 'rate_limited' : status >= 500 ? 'internal_error' : 'unknown');
  return new ApiError(status, code, p?.title ?? `HTTP ${status}`, p?.detail);
}

type Result<T> = { data?: T; error?: unknown; response: Response };

/** Unwraps an openapi-fetch result: returns data or throws a typed ApiError. Never swallows. */
export async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  let res: Result<T>;
  try {
    res = await promise;
  } catch {
    throw await classifyConnectionFailure();
  }
  if (res.response.ok) return res.data as T;
  throw fromProblem(res.response.status, res.error as Partial<Problem> | undefined);
}

export function newIdempotencyKey() {
  return crypto.randomUUID();
}
