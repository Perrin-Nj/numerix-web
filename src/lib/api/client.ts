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
  | 'network'
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
    throw new ApiError(0, 'network', 'Network error');
  }
  if (res.response.ok) return res.data as T;
  throw fromProblem(res.response.status, res.error as Partial<Problem> | undefined);
}

export function newIdempotencyKey() {
  return crypto.randomUUID();
}
