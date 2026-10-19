'use client';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { Button, Fox, Input } from '@/components/ui';
import { Toggles } from '@/components/toggles';

export default function Login() {
  const t = useT();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('auth/login', { method: 'POST', body: { password: pw } });
      window.location.href = '/';
    } catch (x) {
      const a = x as ApiError;
      setErr(a.status === 429 ? t('login.locked') : a.status === 401 ? t('login.bad') : a.message === 'network_error' ? t('err.network') : a.message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-end">
        <Toggles />
      </div>
      <form onSubmit={submit} className="rounded-2xl border-2 border-line bg-elevated p-6 shadow-[0_12px_32px_rgb(31_27_46/0.14)]">
        <div className="mb-5 flex items-center gap-3">
          <Fox size={52} />
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">Numerix Admin</h1>
            <p className="text-sm text-muted">{t('login.sub')}</p>
          </div>
        </div>
        <Input label={t('login.password')} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        {err && (
          <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {err}
          </p>
        )}
        <Button type="submit" variant="primary" className="mt-4 w-full" disabled={busy || !pw}>
          {busy ? t('common.working') : t('login.submit')}
        </Button>
      </form>
    </main>
  );
}
