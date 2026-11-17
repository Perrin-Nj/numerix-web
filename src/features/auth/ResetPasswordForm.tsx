'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/ui/button';
import { FormField } from '@/ui/form-field';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { InlineError } from '@/ui/inline-error';
import { Panel } from '@/ui/panel';
import { PASSWORD_MIN, passwordProblem } from './reset-logic';

export type ResetPasswordFormProps = {
  /** form: choose the password. invalid: the link is unknown, expired or used. success: done, go sign in. */
  view: 'form' | 'invalid' | 'success';
  pending?: boolean;
  /** What the server or the network said on the last try. */
  error?: { kind: 'policy' } | { kind: 'rateLimited'; minutes: number | null } | { kind: 'network' } | { kind: 'generic' };
  onSubmit: (password: string) => void;
  /** Retry after a network error with the same values. */
  onRetry?: () => void;
  onRequestNewLink: () => void;
  onSignIn: () => void;
};

/** "Choose a new password": two fields, live checks, clear states for a bad link and for success. Presentational. */
export function ResetPasswordForm({ view, pending, error, onSubmit, onRetry, onRequestNewLink, onSignIn }: ResetPasswordFormProps) {
  const t = useTranslations('screens.auth.reset');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [tried, setTried] = useState(false);

  if (view === 'invalid') {
    return (
      <Panel className="nx-rise flex flex-col gap-4 p-6 shadow-2">
        <div role="alert" className="flex flex-col gap-3">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-sunken text-danger">
            <Icon name="alert" size={26} />
          </span>
          <h1 className="font-display text-2xl font-bold">{t('invalid.title')}</h1>
          <p className="text-lg">{t('invalid.body')}</p>
        </div>
        <Button size="lg" fullWidth onClick={onRequestNewLink}>
          {t('invalid.action')}
        </Button>
        <Button size="lg" fullWidth variant="ghost" onClick={onSignIn}>
          {t('backToSignIn')}
        </Button>
      </Panel>
    );
  }

  if (view === 'success') {
    return (
      <Panel className="nx-rise flex flex-col gap-4 p-6 shadow-2">
        <div role="status" className="flex flex-col gap-3">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
            <Icon name="check" size={26} />
          </span>
          <h1 className="font-display text-2xl font-bold">{t('success.title')}</h1>
          <p className="text-lg">{t('success.body')}</p>
        </div>
        <Button size="lg" fullWidth autoFocus onClick={onSignIn}>
          {t('success.action')}
        </Button>
      </Panel>
    );
  }

  const problem = passwordProblem(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = !problem && confirm === password;
  const passwordError = tried && problem ? t(problem === 'short' ? 'errors.short' : 'errors.long') : undefined;
  const confirmError = mismatch || (tried && confirm !== password) ? t('errors.mismatch') : undefined;
  const type = show ? 'text' : 'password';
  const errorText =
    error?.kind === 'policy'
      ? t('errors.policy')
      : error?.kind === 'rateLimited'
        ? error.minutes
          ? t('errors.rateLimited', { minutes: error.minutes })
          : t('errors.rateLimitedNoWait')
        : error?.kind === 'network'
          ? t('errors.network')
          : error
            ? t('errors.generic')
            : null;

  return (
    <Panel className="nx-rise p-6 shadow-2">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (ready) onSubmit(password);
        }}
      >
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <p className="text-lg text-muted">{t('lead', { min: PASSWORD_MIN })}</p>
        <FormField label={t('password')} htmlFor="new-password" error={passwordError} required>
          <Input
            id="new-password"
            name="new-password"
            type={type}
            autoComplete="new-password"
            autoFocus
            value={password}
            invalid={Boolean(passwordError)}
            aria-describedby={['new-password-check', passwordError ? 'new-password-error' : ''].filter(Boolean).join(' ')}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p id="new-password-check" aria-live="polite" className={`flex items-center gap-2 text-sm ${problem ? 'text-muted' : 'text-brand-strong'}`}>
            <Icon name={problem ? 'info' : 'check'} size={16} />
            {problem === 'short' ? t('count', { count: password.length, min: PASSWORD_MIN }) : problem === 'long' ? t('errors.long') : t('countOk')}
          </p>
        </FormField>
        <FormField label={t('confirm')} htmlFor="confirm-password" error={confirmError} required>
          <Input
            id="confirm-password"
            name="confirm-password"
            type={type}
            autoComplete="new-password"
            value={confirm}
            invalid={Boolean(confirmError)}
            aria-describedby={confirmError ? 'confirm-password-error' : undefined}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </FormField>
        <Button type="button" variant="ghost" size="sm" aria-pressed={show} sound={null} iconLeft={<Icon name={show ? 'eye-off' : 'eye'} size={18} />} onClick={() => setShow((v) => !v)} className="self-start">
          {show ? t('hide') : t('show')}
        </Button>
        {errorText && (
          <div className="flex flex-col gap-2">
            <InlineError message={errorText} />
            {error?.kind === 'network' && onRetry && (
              <Button type="button" variant="secondary" onClick={onRetry}>
                {t('retry')}
              </Button>
            )}
          </div>
        )}
        <Button type="submit" size="lg" fullWidth loading={pending}>
          {t('submit')}
        </Button>
      </form>
    </Panel>
  );
}
