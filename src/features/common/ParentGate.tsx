'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError, api, isConnectionProblem, unwrap } from '@/lib/api/client';
import { Button } from '@/ui/button';
import { Dialog } from '@/ui/dialog';
import { FormField } from '@/ui/form-field';
import { InlineError } from '@/ui/inline-error';
import { Input } from '@/ui/input';

export const PARENT_EMAIL_KEY = 'nx:parent-email';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onUnlocked: () => void };

/** Leaving child mode needs the account password. A wrong password is reported, never ignored. */
export function ParentGate({ open, onOpenChange, onUnlocked }: Props) {
  const t = useTranslations('screens.parentGate');
  const te = useTranslations('errors');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const email = localStorage.getItem(PARENT_EMAIL_KEY) ?? '';
      await unwrap(api.POST('/auth/login', { body: { email, password } }));
      setPassword('');
      onUnlocked();
    } catch (e) {
      setError(e instanceof ApiError && isConnectionProblem(e.code) ? `${te(`${e.code}.title`)}. ${te(`${e.code}.description`)}` : t('wrong'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description')}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} loading={busy} disabled={password.length === 0}>
            {t('unlock')}
          </Button>
        </>
      }
    >
      <FormField label={t('password')} htmlFor="gate-password" error={error ?? undefined}>
        <Input
          id="gate-password"
          type="password"
          autoComplete="current-password"
          value={password}
          invalid={Boolean(error)}
          aria-describedby={error ? 'gate-password-error' : undefined}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && password && submit()}
        />
      </FormField>
      {error && <InlineError id="gate-password-error" message={error} />}
    </Dialog>
  );
}
