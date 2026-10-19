'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ApiError, setApiMode } from '@/data/api/client';
import { reportError } from '@/platform/errors/bridge';
import { useChildren, useChildToken, useSessionStatus, signOut } from '@/data/hooks';
import { useDeviceLogin } from '@/data/hooks/devices';
import { MascotBubble } from '@/game/mascot-bubble';
import { Avatar } from '@/game/avatar';
import { Button } from '@/ui/button';
import { Dialog } from '@/ui/dialog';
import { EmptyState } from '@/ui/empty-state';
import { Icon } from '@/ui/icon';
import { PinInput } from '@/ui/pin-input';
import { Reveal } from '@/ui/reveal';
import { Skeleton } from '@/ui/skeleton';
import { ScreenState } from '@/game/screen-state';
import { rememberChild } from '@/data/local/who';
import type { Child } from '@/data/api/types';

/** Kid door: pick a child profile and enter the PIN. */
export function ProfilePicker() {
  const t = useTranslations('screens.play.picker');
  const te = useTranslations('errors');
  const router = useRouter();
  const status = useSessionStatus();
  const hasParent = Boolean(status.data?.parent);
  const children = useChildren(hasParent);
  const token = useChildToken();
  const [pinFor, setPinFor] = useState<Child | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | undefined>();
  const [blocked, setBlocked] = useState(false);
  const [entering, setEntering] = useState(false);

  // A known device (long-lived cookie) reopens the parent session by itself, so the picker shows at once.
  const deviceLogin = useDeviceLogin();
  const deviceTried = useRef(false);
  const [unknownDevice, setUnknownDevice] = useState(false);
  const needsParent = Boolean(status.data && !status.data.parent && !status.data.child);
  useEffect(() => {
    if (!needsParent || deviceTried.current) return;
    deviceTried.current = true;
    deviceLogin.mutateAsync().then(
      (opened) => !opened && setUnknownDevice(true),
      () => setUnknownDevice(true),
    );
  }, [needsParent, deviceLogin]);

  const hasChild = Boolean(status.data?.child);
  useEffect(() => {
    if (!hasChild) return;
    setApiMode('child'); // the picker page is parent mode; the home it opens must call the API as the child
    router.replace('/play/home');
  }, [hasChild, router]);

  async function enter(child: Child, withPin?: string) {
    try {
      await token.mutateAsync({ id: child.id, pin: withPin });
      setApiMode('child');
      rememberChild(child.id, child.display_name, child.avatar_id);
      setPinFor(null);
      setEntering(true);
      router.push('/play/home');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_pin') {
        setPinError(te('invalid_pin.title'));
        setPin('');
      } else if (e instanceof ApiError && e.code === 'consent_missing') setBlocked(true);
      else reportError(e, { retry: () => void enter(child, withPin) });
    }
  }

  function choose(child: Child) {
    if (!child.consent_given) return setBlocked(true);
    if (child.has_pin) {
      setPin('');
      setPinError(undefined);
      setPinFor(child);
    } else void enter(child);
  }

  // A profile is already chosen on this device: go straight to play. Switching player lives in the Me screen.
  if (entering || status.data?.child) return null;

  if (needsParent && !unknownDevice) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-4 px-4 py-10" role="status" aria-busy="true">
        <Skeleton height={160} />
      </main>
    );
  }
  if (status.data && !status.data.parent) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">{t('needAdultTitle')}</h1>
        <MascotBubble pose="think" size="lg">
          {t('needAdultText')}
        </MascotBubble>
        <Button size="lg" onClick={() => router.push('/parent/login')}>
          {t('needAdultAction')}
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-8 px-4 py-10">
      <Reveal>
        <MascotBubble pose="greet" size="lg">
          {t('who')}
        </MascotBubble>
      </Reveal>

      {(children.isLoading || children.error) && (
        <ScreenState
          isLoading={children.isLoading}
          error={children.error}
          onRetry={() => void children.refetch()}
          area="play"
          skeleton={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Skeleton shape="block" className="nx-skeleton-card" height={200} />
              <Skeleton shape="block" className="nx-skeleton-card" height={200} />
            </div>
          }
        >
          {null}
        </ScreenState>
      )}
      {children.data && children.data.length === 0 && (
        <EmptyState
          icon="users"
          title={t('none')}
          action={
            <Button iconLeft={<Icon name="shield" />} onClick={() => router.push('/parent')}>
              {t('parentArea')}
            </Button>
          }
        />
      )}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {(children.data ?? []).map((c, i) => (
          <li key={c.id}>
            <Reveal delayMs={80 * i}>
              <button
                type="button"
                onClick={() => choose(c)}
                className="flex min-h-48 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-line bg-elevated p-5 shadow-[var(--shadow-press-neutral)] transition-[transform,box-shadow,border-color] duration-[var(--dur-1)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-brand active:translate-y-[3px] active:scale-[0.98] active:shadow-none"
              >
                <Avatar avatarId={c.avatar_id} name={c.display_name} size="lg" />
                <span className="font-display text-2xl font-bold leading-tight">{c.display_name}</span>
                {c.has_pin && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-1 text-sm text-muted">
                    <Icon name="lock" size={14} />
                    {t('pinProtected')}
                  </span>
                )}
              </button>
            </Reveal>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" iconLeft={<Icon name="shield" />} onClick={() => router.push('/parent')}>
          {t('parentArea')}
        </Button>
        <Button
          variant="ghost"
          iconLeft={<Icon name="log-out" />}
          onClick={async () => {
            try {
              await signOut('all');
              router.replace('/');
              router.refresh();
            } catch (e) {
              reportError(e);
            }
          }}
        >
          {t('signOut')}
        </Button>
      </div>

      <Dialog
        open={pinFor !== null}
        onOpenChange={(o) => !o && setPinFor(null)}
        title={t('pinTitle', { name: pinFor?.display_name ?? '' })}
      >
        <PinInput
          label={t('pinLabel')}
          value={pin}
          onChange={(v) => {
            setPin(v);
            setPinError(undefined);
          }}
          onComplete={(v) => pinFor && enter(pinFor, v)}
          disabled={token.isPending}
          error={pinError}
        />
      </Dialog>

      <Dialog
        open={blocked}
        onOpenChange={setBlocked}
        title={te('consent_missing.title')}
        description={te('consent_missing.description')}
        footer={<Button onClick={() => setBlocked(false)}>{te('ok')}</Button>}
      />
    </main>
  );
}
