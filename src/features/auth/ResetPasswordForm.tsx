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
import { PASSWORD_MIN, formatCode, isCodeComplete, normalizeCode, passwordProblem } from './reset-logic';

export type ResetPasswordFormProps = {
  /** form: email, code and new password. success: done, go sign in. */
  view: 'form' | 'success';
  pending?: boolean;
  /** What the server or the network said on the last try. */
  error?: { kind: 'codeInvalid' } | { kind: 'policy' } | { kind: 'rateLimited'; minutes: number | null } | { kind: 'network' } | { kind: 'generic' };
  /** Where to ask for a code. Empty: the screen says to contact the team without an address. */
  supportEmail?: string;
  onSubmit: (values: { email: string; code: string; password: string }) => void;
  onSignIn: () => void;
};

/** "Reset my password": how it works, then email + code from the team + new password twice. Presentational, values live in memory only. */
export function ResetPasswordForm({ view, pending, error, supportEmail, onSubmit, onSignIn }: ResetPasswordFormProps) {
  const t = useTranslations('screens.auth.reset');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [tried, setTried] = useState(false);

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
  const emailBad = tried && !isEmail(email.trim());
  const codeBad = tried && !isCodeComplete(code);
  const passwordError = tried && problem ? t(problem === 'short' ? 'errors.short' : 'errors.long') : undefined;
  const confirmError = mismatch || (tried && confirm !== password) ? t('errors.mismatch') : undefined;
  const ready = isEmail(email.trim()) && isCodeComplete(code) && !problem && confirm === password;
  const type = show ? 'text' : 'password';
  const errorText =
    error?.kind === 'codeInvalid'
      ? t('errors.codeInvalid')
      : error?.kind === 'policy'
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
          if (ready) onSubmit({ email: email.trim(), code: normalizeCode(code), password });
        }}
      >
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <div className="flex flex-col gap-1 text-lg text-muted">
          <p>{t('how')}</p>
          <p>
            {t('contact')}{' '}
            {supportEmail && (
              <a className="font-semibold text-brand underline" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
            )}
          </p>
        </div>
        <FormField label={t('email')} htmlFor="reset-email" error={emailBad ? t('errors.email') : undefined} required>
          <Input
            id="reset-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            value={email}
            invalid={emailBad}
            aria-describedby={emailBad ? 'reset-email-error' : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        <FormField label={t('code')} htmlFor="reset-code" hint={t('codeHint')} error={codeBad ? t('errors.code') : undefined} required>
          <Input
            id="reset-code"
            name="reset-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            spellCheck={false}
            placeholder="0000-0000"
            className="text-center font-mono text-2xl tracking-widest"
            value={code}
            invalid={codeBad}
            aria-describedby={['reset-code-hint', codeBad ? 'reset-code-error' : ''].filter(Boolean).join(' ')}
            onChange={(e) => setCode(formatCode(e.target.value))}
          />
        </FormField>
        <FormField label={t('password')} htmlFor="new-password" error={passwordError} required>
          <Input
            id="new-password"
            name="new-password"
            type={type}
            autoComplete="new-password"
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
        {errorText && <InlineError message={errorText} />}
        <Button type="submit" size="lg" fullWidth loading={pending}>
          {t('submit')}
        </Button>
        <Button type="button" variant="ghost" size="lg" fullWidth onClick={onSignIn}>
          {t('backToSignIn')}
        </Button>
      </form>
    </Panel>
  );
}
