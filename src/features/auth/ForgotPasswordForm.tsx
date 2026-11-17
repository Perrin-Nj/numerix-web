'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { isEmail } from '@/shared/form-resolver';
import { Button } from '@/ui/button';
import { FormField } from '@/ui/form-field';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { InlineError } from '@/ui/inline-error';
import { Panel } from '@/ui/panel';

export type ForgotPasswordFormProps = {
  /** form: ask for the email. sent: the same confirmation every time. unavailable: the server cannot send email. */
  view: 'form' | 'sent' | 'unavailable';
  /** A request is running. */
  pending?: boolean;
  /** What went wrong on the last try. rateLimited may carry the wait in minutes. */
  error?: { kind: 'rateLimited'; minutes: number | null } | { kind: 'network' } | { kind: 'generic' };
  /** Seconds left before the link can be sent again (view sent). 0 or missing: the button is ready. */
  cooldown?: number;
  /** Where to write when email is off. Empty: no address shown. */
  supportEmail?: string;
  onSubmit: (email: string) => void;
  onResend: () => void;
  onBack: () => void;
};

/** "Forgot your password": one email field and a big button, then one friendly confirmation. Presentational. */
export function ForgotPasswordForm({ view, pending, error, cooldown = 0, supportEmail, onSubmit, onResend, onBack }: ForgotPasswordFormProps) {
  const t = useTranslations('screens.auth.forgot');
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);

  const errorText =
    error?.kind === 'rateLimited'
      ? error.minutes
        ? t('rateLimited', { minutes: error.minutes })
        : t('rateLimitedNoWait')
      : error?.kind === 'network'
        ? t('network')
        : error
          ? t('generic')
          : null;

  if (view === 'unavailable') {
    return (
      <Panel className="nx-rise flex flex-col gap-4 p-6 shadow-2">
        <h1 className="font-display text-2xl font-bold">{t('unavailable.title')}</h1>
        <p className="text-lg">{t('unavailable.body')}</p>
        {supportEmail && (
          <p className="text-lg">
            <a className="font-semibold text-brand underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </p>
        )}
        <Button size="lg" fullWidth variant="secondary" onClick={onBack}>
          {t('back')}
        </Button>
      </Panel>
    );
  }

  if (view === 'sent') {
    return (
      <Panel className="nx-rise flex flex-col gap-4 p-6 shadow-2">
        <div role="status" className="flex flex-col gap-3">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
            <Icon name="check" size={26} />
          </span>
          <h1 className="font-display text-2xl font-bold">{t('sent.title')}</h1>
          <p className="text-lg">{t('sent.body')}</p>
        </div>
        {errorText && <InlineError message={errorText} />}
        <Button size="lg" fullWidth onClick={onBack}>
          {t('back')}
        </Button>
        <Button size="lg" fullWidth variant="ghost" disabled={cooldown > 0} loading={pending} onClick={onResend}>
          {cooldown > 0 ? t('resendWait', { seconds: cooldown }) : t('resend')}
        </Button>
      </Panel>
    );
  }

  return (
    <Panel className="nx-rise p-6 shadow-2">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const value = email.trim();
          if (!isEmail(value)) return setInvalid(true);
          setInvalid(false);
          onSubmit(value);
        }}
      >
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <p className="text-lg text-muted">{t('lead')}</p>
        <FormField label={t('email')} htmlFor="forgot-email" error={invalid ? t('emailInvalid') : undefined} required>
          <Input
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            value={email}
            invalid={invalid}
            aria-describedby={invalid ? 'forgot-email-error' : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        {errorText && <InlineError message={errorText} />}
        <Button type="submit" size="lg" fullWidth loading={pending}>
          {t('submit')}
        </Button>
        <Button type="button" variant="ghost" size="lg" fullWidth onClick={onBack}>
          {t('back')}
        </Button>
      </form>
    </Panel>
  );
}
