import { ApiError } from '@/data/api/client';

export type ErrorKind = 'generic' | 'offline' | 'timeout' | 'notfound' | 'permission';
export type ErrorArea = 'play' | 'parent' | 'root';

// Codes that have copy under `errors.*` (same list as ErrorBridge)
const KNOWN = new Set([
  'device_offline', 'server_unreachable', 'backend_unreachable', 'backend_timeout', 'request_failed', 'unauthorized', 'forbidden', 'consent_missing', 'daily_limit_reached', 'session_active',
  'session_paused', 'session_completed', 'beat_answered', 'invalid_pin', 'not_found', 'validation_failed', 'rate_limited', 'internal_error', 'subscription_inactive', 'account_blocked', 'unknown',
]);

const KIND: Record<string, ErrorKind> = {
  device_offline: 'offline',
  backend_timeout: 'timeout',
  not_found: 'notfound',
  forbidden: 'permission',
  consent_missing: 'permission',
  unauthorized: 'permission',
};

export type ErrorInfo = { code: string; kind: ErrorKind; status?: number; message?: string; digest?: string };

/** Maps anything thrown (ApiError from the client classifier, Next boundary errors, plain Errors) to a code with copy. */
export function describeError(error: unknown): ErrorInfo {
  const digest = (error as { digest?: string } | null)?.digest;
  if (error instanceof ApiError) {
    const code = KNOWN.has(error.code) ? error.code : 'unknown';
    return { code, kind: KIND[code] ?? 'generic', status: error.status || undefined, message: error.message, digest };
  }
  const message = error instanceof Error ? error.message : undefined;
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const chunk = message ? /ChunkLoad|Loading chunk|dynamically imported module|Failed to fetch/i.test(message) : false;
  const code = offline ? 'device_offline' : chunk ? 'request_failed' : 'unknown';
  return { code, kind: KIND[code] ?? 'generic', message, digest };
}

export const HOME: Record<ErrorArea, string> = { play: '/play/home', parent: '/parent', root: '/' };

export function areaOf(pathname: string | null): ErrorArea {
  return pathname?.startsWith('/play') ? 'play' : pathname?.startsWith('/parent') ? 'parent' : 'root';
}
