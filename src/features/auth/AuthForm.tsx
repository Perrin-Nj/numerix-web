'use client';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiError, isConnectionProblem } from '@/data/api/client';
import { useLogin, useRegister } from '@/data/hooks';
import { passkeysSupported, useDeviceLogin, usePasskeyLogin } from '@/data/hooks/devices';
import { PasskeyLoginButton } from './PasskeyLoginButton';
import { PARENT_EMAIL_KEY } from '@/features/common/ParentGate';
import { Button } from '@/ui/button';
import { FormField } from '@/ui/form-field';
import { InlineError } from '@/ui/inline-error';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { IconButton } from '@/ui/icon-button';
import { Panel } from '@/ui/panel';

type Mode = 'login' | 'register';

/** Where to go after signing in: the page that sent the user here (same site, parent area only), else the parent home. */
function landing(): string {
  const next = new URLSearchParams(window.location.search).get('next') ?? '';
  return /^\/parent(\/[\w\-/]*)?$/.test(next) && !next.startsWith('//') ? next : '/parent';
}

/** Login or register form for the parent area; redirects to the page that sent the user, else the parent home. */
export function AuthForm({ mode }: { mode: Mode }) {
  const t = useTranslations('screens.auth');
  const te = useTranslations('errors');
  const locale = useLocale() as 'fr-CA' | 'en-CA';
  const router = useRouter();
  const login = useLogin();
  const register = useRegister();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const deviceLogin = useDeviceLogin();
  const passkeyLogin = usePasskeyLogin();
  const [passkeyFailed, setPasskeyFailed] = useState(false);
  const [passkeyCancelled, setPasskeyCancelled] = useState(false);
  // browser support is only known on the client: false on the server render, then the real answer
  const canPasskey = useSyncExternalStore(() => () => {}, passkeysSupported, () => false);
  const deviceTried = useRef(false);

  // A known device opens without signing in: one try when the login screen shows, a miss is silent
  useEffect(() => {
    if (mode !== 'login' || deviceTried.current) return;
    deviceTried.current = true;
    deviceLogin.mutateAsync().then((opened) => opened && router.replace(landing()), () => {});
  }, [mode, deviceLogin, router]);

  async function onPasskey() {
    setPasskeyFailed(false);
    setPasskeyCancelled(false);
    try {
      if (await passkeyLogin.mutateAsync()) router.replace(landing());
      else setPasskeyCancelled(true);
    } catch {
      setPasskeyFailed(true);
    }
  }

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
      router.replace(mode === 'login' ? landing() : '/parent/children/new');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setFormError(t('errors.emailTaken'));
      else if (e instanceof ApiError && (e.code === 'unauthorized' || e.status === 401)) setFormError(t('errors.wrongCredentials'));
      else if (e instanceof ApiError && isConnectionProblem(e.code)) setFormError(`${te(`${e.code}.title`)}. ${te(`${e.code}.description`)}`);
      else setFormError(t('errors.generic'));
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="nx-rise flex flex-col gap-3">
        <Link href="/" className="inline-flex w-fit items-center gap-2 rounded-full" aria-label={t('backHome')}>
          <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-brand text-brand-fg shadow-[var(--shadow-press),var(--shadow-inset)] [background-image:var(--brand-grad)]">
            <Icon name="sparkles" size={22} />
          </span>
          <span className="font-display text-2xl font-extrabold text-brand">Numerix</span>
        </Link>
        <h1 className="font-display text-3xl font-bold leading-tight">{t(`${mode}.title`)}</h1>
        <p className="text-lg text-muted">{t('tagline')}</p>
      </header>
      <Panel className="nx-rise p-6 shadow-2" >
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
            <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="pe-14"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              invalid={Boolean(errors.password)}
              aria-describedby={[mode === 'register' ? 'password-hint' : '', errors.password ? 'password-error' : ''].filter(Boolean).join(' ') || undefined}
              {...field('password')}
            />
            <IconButton
              label={showPassword ? t('hidePassword') : t('showPassword')}
              aria-pressed={showPassword}
              tooltip={false}
              sound={null}
              className="absolute end-0 top-1/2 -translate-y-1/2"
              icon={<Icon name={showPassword ? 'eye-off' : 'eye'} size={20} />}
              onClick={() => setShowPassword((v) => !v)}
            />
            </div>
          </FormField>
          {formError && <InlineError message={formError} />}
          <Button type="submit" size="lg" fullWidth loading={pending}>
            {t(`${mode}.submit`)}
          </Button>
        </form>
        {mode === 'login' && canPasskey && (
          <div className="mt-4 border-t border-line pt-4">
            <PasskeyLoginButton busy={passkeyLogin.isPending} error={passkeyFailed} cancelled={passkeyCancelled} onClick={() => void onPasskey()} />
          </div>
        )}
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
