'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/ui/button';
import { InlineError } from '@/ui/inline-error';

export type PasskeyLoginButtonProps = {
  /** A sign in is running. */
  busy?: boolean;
  /** The last attempt failed (not a cancel). */
  error?: boolean;
  /** The browser prompt was closed without choosing. Calm hint, not an error. */
  cancelled?: boolean;
  onClick: () => void;
};

/** "Sign in with a passkey" under the login form. The container hides it when the browser has no passkey support. */
export function PasskeyLoginButton({ busy, error, cancelled, onClick }: PasskeyLoginButtonProps) {
  const t = useTranslations('screens.auth.passkey');
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" size="lg" fullWidth loading={busy} onClick={onClick}>
        {t('signIn')}
      </Button>
      {error && <InlineError message={t('error')} />}
      {cancelled && !error && <p role="status" className="text-sm text-muted">{t('cancelled')}</p>}
    </div>
  );
}
