'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { appConfig } from '@/config/app';
import { ApiError, isConnectionProblem } from '@/data/api/client';
import { useForgotPassword, usePublicConfig } from '@/data/hooks';
import { Skeleton } from '@/ui/skeleton';
import { ForgotPasswordForm, type ForgotPasswordFormProps } from './ForgotPasswordForm';
import { waitMinutes } from './reset-logic';

const RESEND_SECONDS = 30;

/** /parent/forgot: asks for the email, then always shows the same confirmation. Shows the contact route when the server cannot send email. */
export function ForgotPasswordScreen() {
  const router = useRouter();
  const locale = useLocale() as 'fr-CA' | 'en-CA';
  const config = usePublicConfig();
  const forgot = useForgotPassword();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<ForgotPasswordFormProps['error']>();
  const [cooldown, setCooldown] = useState(0);
  const lastEmail = useRef('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function send(email: string) {
    lastEmail.current = email;
    setError(undefined);
    try {
      await forgot.mutateAsync({ email, locale });
      setSent(true);
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) setError({ kind: 'rateLimited', minutes: waitMinutes(e.retryAfterSeconds) });
      else if (e instanceof ApiError && isConnectionProblem(e.code)) setError({ kind: 'network' });
      else setError({ kind: 'generic' });
    }
  }

  // Unknown config (loading failed, no cache): still show the form, a real failure will say so on submit
  const emailOff = config.isSuccess && config.data !== null && config.data.password_reset_email !== true;
  const view = emailOff ? 'unavailable' : sent ? 'sent' : 'form';

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      {config.isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <ForgotPasswordForm
          view={view}
          pending={forgot.isPending}
          error={error}
          cooldown={cooldown}
          supportEmail={appConfig.supportEmail}
          onSubmit={(email) => void send(email)}
          onResend={() => void send(lastEmail.current)}
          onBack={() => router.push('/parent/login')}
        />
      )}
    </main>
  );
}
