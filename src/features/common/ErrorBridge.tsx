'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/client';
import { registerReporter, reportError } from '@/lib/errors/bridge';
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

  useEffect(() => {
    return registerReporter((error, opts) => {
      const raw = error instanceof ApiError ? error.code : 'unknown';
      const code = KNOWN.has(raw) ? raw : 'unknown';
      const hasRetry = Boolean(opts?.retry) && RETRYABLE.has(code);
      notify({
        id: `err-${code}`,
        kind: SEVERE.has(code) ? 'error' : 'warning',
        title: t(`${code}.title`),
        description: t(`${code}.description`),
        action:
          code === 'unauthorized'
            ? { label: t('unauthorized.action'), onClick: () => router.push('/parent/login') }
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
