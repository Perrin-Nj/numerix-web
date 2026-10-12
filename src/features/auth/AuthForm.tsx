'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiError } from '@/lib/api/client';
import { useLogin, useRegister } from '@/features/api/hooks';
import { PARENT_EMAIL_KEY } from '@/features/common/ParentGate';
import { Button } from '@/ui/button';
import { FormField } from '@/ui/form-field';
import { InlineError } from '@/ui/inline-error';
import { Input } from '@/ui/input';
import { Panel } from '@/ui/panel';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const t = useTranslations('screens.auth');
  const locale = useLocale() as 'fr-CA' | 'en-CA';
  const router = useRouter();
  const login = useLogin();
  const register = useRegister();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(t('errors.email')),
        password: mode === 'register' ? z.string().min(10, t('errors.passwordShort')) : z.string().min(1, t('errors.passwordEmpty')),
      }),
    [t, mode],
  );
  type Values = z.infer<typeof schema>;
  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const pending = login.isPending || register.isPending;

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      if (mode === 'login') await login.mutateAsync(values);
      else await register.mutateAsync({ ...values, locale });
      localStorage.setItem(PARENT_EMAIL_KEY, values.email);
      router.replace(mode === 'login' ? '/parent' : '/parent/children/new');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setFormError(t('errors.emailTaken'));
      else if (e instanceof ApiError && (e.code === 'unauthorized' || e.status === 401)) setFormError(t('errors.wrongCredentials'));
      else if (e instanceof ApiError && e.code === 'network') setFormError(t('errors.network'));
      else setFormError(t('errors.generic'));
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <h1 className="font-display text-3xl font-bold">{t(`${mode}.title`)}</h1>
      <Panel>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormField label={t('email')} htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...field('email')}
            />
          </FormField>
          <FormField
            label={t('password')}
            htmlFor="password"
            hint={mode === 'register' ? t('passwordHint') : undefined}
            error={errors.password?.message}
            required
          >
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              invalid={Boolean(errors.password)}
              aria-describedby={[mode === 'register' ? 'password-hint' : '', errors.password ? 'password-error' : ''].filter(Boolean).join(' ') || undefined}
              {...field('password')}
            />
          </FormField>
          {formError && <InlineError message={formError} />}
          <Button type="submit" size="lg" fullWidth loading={pending}>
            {t(`${mode}.submit`)}
          </Button>
        </form>
      </Panel>
      <p className="text-center text-muted">
        {t(`${mode}.switchPrompt`)}{' '}
        <Link className="font-semibold text-brand underline" href={mode === 'login' ? '/parent/register' : '/parent/login'}>
          {t(`${mode}.switchAction`)}
        </Link>
      </p>
    </main>
  );
}
