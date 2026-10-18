'use client';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/data/hooks';
import { ApiError } from '@/data/api/client';
import { registerReporter, reportError } from '@/platform/errors/bridge';
import { useNotify } from '@/ui/notification-center';

const KNOWN = new Set([
  'device_offline', 'server_unreachable', 'backend_unreachable', 'backend_timeout', 'request_failed', 'unauthorized', 'forbidden', 'consent_missing', 'daily_limit_reached', 'session_active',
  'session_paused', 'session_completed', 'beat_answered', 'invalid_pin', 'not_found', 'validation_failed',
  'rate_limited', 'internal_error', 'subscription_inactive', 'account_blocked', 'unknown',
]);
const SEVERE = new Set(['device_offline', 'server_unreachable', 'backend_unreachable', 'backend_timeout', 'request_failed', 'internal_error', 'unknown', 'rate_limited']);
const RETRYABLE = new Set(['device_offline', 'server_unreachable', 'backend_unreachable', 'backend_timeout', 'request_failed', 'internal_error', 'unknown']);

/** Mounted once. Turns every error into a visible message with a recovery step. */
export function ErrorBridge() {
  const t = useTranslations('errors');
  const { notify } = useNotify();
  const router = useRouter();
  const pathname = usePathname();
  // The route is read through a ref so the reporter is registered once, not on every navigation
  const where = useRef(pathname);
  useEffect(() => {
    where.current = pathname;
  }, [pathname]);
  const leaving = useRef(false);

  useEffect(() => {
    return registerReporter((error, opts) => {
      const raw = error instanceof ApiError ? error.code : 'unknown';
      const code = KNOWN.has(raw) ? raw : 'unknown';
      let redirecting = code === 'unauthorized' && leaving.current;
      if (code === 'unauthorized' && !leaving.current) {
        const here = where.current;
        if (here.startsWith('/play') && here !== '/play') {
          // The kid's token ended: drop it and ask who is playing again; the picker needs only the parent session
          redirecting = true;
          leaving.current = true;
          void signOut('child')
            .catch(() => {})
            .finally(() => {
              leaving.current = false;
              router.replace('/play');
            });
        } else if (here.startsWith('/parent') && !/^\/parent\/(login|register)/.test(here)) {
          // Back to the same page after logging in again
          redirecting = true;
          leaving.current = true;
          void signOut('parent')
            .catch(() => {})
            .finally(() => {
              leaving.current = false;
              router.replace(`/parent/login?next=${encodeURIComponent(here)}`);
            });
        }
      }
      const hasRetry = Boolean(opts?.retry) && RETRYABLE.has(code);
      notify({
        id: `err-${code}`,
        kind: SEVERE.has(code) ? 'error' : 'warning',
        title: t(`${code}.title`),
        description: t(`${code}.description`),
        action: redirecting
          ? undefined
          : code === 'unauthorized'
            ? { label: t('unauthorized.action'), onClick: () => router.push(where.current.startsWith('/play') ? '/play' : '/parent/login') }
            : hasRetry
              ? { label: t('retry'), onClick: () => opts!.retry!() }
              : undefined,
      });
    });
  }, [notify, router, t]);

  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError(e.error ?? new Error(e.message));
    const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
