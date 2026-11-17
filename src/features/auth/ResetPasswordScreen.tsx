'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, isConnectionProblem } from '@/data/api/client';
import { useResetPassword } from '@/data/hooks';
import { Skeleton } from '@/ui/skeleton';
import { ResetPasswordForm, type ResetPasswordFormProps } from './ResetPasswordForm';
import { parseTokenFragment, waitMinutes } from './reset-logic';

let kept: string | null | undefined;
const noSubscribe = () => () => {};
/**
 * Reads the token from the fragment once, removes the fragment from the address bar and keeps the token in this
 * module's memory (never in storage). Repeated calls, Strict Mode included, return the same token.
 */
function keepToken(): string | null {
  if (window.location.hash) {
    kept = parseTokenFragment(window.location.hash);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return (kept ??= null);
}

/**
 * /parent/reset: takes the token from the URL fragment, removes it from the address bar at once and keeps it in
 * memory only. After success the parent signs in again, nobody is signed in here.
 */
export function ResetPasswordScreen() {
  const router = useRouter();
  const reset = useResetPassword();
  // undefined on the server render, then the token from the link (null when the link has none)
  const token = useSyncExternalStore(noSubscribe, keepToken, () => undefined);
  const [invalid, setInvalid] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<ResetPasswordFormProps['error']>();
  const lastPassword = useRef('');

  async function submit(password: string) {
    if (!token) return;
    lastPassword.current = password;
    setError(undefined);
    try {
      await reset.mutateAsync({ token, password });
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'reset_token_invalid') setInvalid(true);
      else if (e instanceof ApiError && e.status === 422) setError({ kind: 'policy' });
      else if (e instanceof ApiError && e.status === 429) setError({ kind: 'rateLimited', minutes: waitMinutes(e.retryAfterSeconds) });
      else if (e instanceof ApiError && isConnectionProblem(e.code)) setError({ kind: 'network' });
      else setError({ kind: 'generic' });
    }
  }

  const view = done ? 'success' : invalid || token === null ? 'invalid' : 'form';

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      {token === undefined ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <ResetPasswordForm
          view={view}
          pending={reset.isPending}
          error={error}
          onSubmit={(p) => void submit(p)}
          onRetry={() => void submit(lastPassword.current)}
          onRequestNewLink={() => router.push('/parent/forgot')}
          onSignIn={() => router.push('/parent/login')}
        />
      )}
    </main>
  );
}
