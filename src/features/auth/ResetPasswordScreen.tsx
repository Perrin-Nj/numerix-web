'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { appConfig } from '@/config/app';
import { ApiError, isConnectionProblem } from '@/data/api/client';
import { useResetPassword } from '@/data/hooks';
import { ResetPasswordForm, type ResetPasswordFormProps } from './ResetPasswordForm';
import { waitMinutes } from './reset-logic';

/**
 * /parent/reset: email, the code from the Numerix team and the new password. The code and the password live in
 * the form's memory only: never in storage, the address bar or a log. Nobody is signed in afterwards.
 */
export function ResetPasswordScreen() {
  const router = useRouter();
  const reset = useResetPassword();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<ResetPasswordFormProps['error']>();

  async function submit(values: { email: string; code: string; password: string }) {
    setError(undefined);
    try {
      await reset.mutateAsync(values);
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'reset_code_invalid') setError({ kind: 'codeInvalid' });
      else if (e instanceof ApiError && e.status === 422) setError({ kind: 'policy' });
      else if (e instanceof ApiError && e.status === 429) setError({ kind: 'rateLimited', minutes: waitMinutes(e.retryAfterSeconds) });
      else if (e instanceof ApiError && isConnectionProblem(e.code)) setError({ kind: 'network' });
      else setError({ kind: 'generic' });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <ResetPasswordForm
        view={done ? 'success' : 'form'}
        pending={reset.isPending}
        error={error}
        supportEmail={appConfig.supportEmail}
        onSubmit={(v) => void submit(v)}
        onSignIn={() => router.push('/parent/login')}
      />
    </main>
  );
}
