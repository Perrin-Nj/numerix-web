'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ApiError, setApiMode } from '@/data/api/client';
import { reportError } from '@/platform/errors/bridge';
import { rememberChild } from '@/data/local/who';
import { useChildToken } from '@/data/hooks';
import { Button } from '@/ui/button';
import { Dialog } from '@/ui/dialog';
import { Icon } from '@/ui/icon';
import { PinInput } from '@/ui/pin-input';
import type { Child } from '@/data/api/types';

/** Starts play as this child straight away. A PIN is asked only when the profile has one. */
export function PlayAsButton({ child }: { child: Pick<Child, 'id' | 'display_name' | 'avatar_id' | 'has_pin'> }) {
  const t = useTranslations('screens.play.picker');
  const te = useTranslations('errors');
  const router = useRouter();
  const token = useChildToken();
  const [askPin, setAskPin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | undefined>();

  async function enter(withPin?: string) {
    try {
      await token.mutateAsync({ id: child.id, pin: withPin });
      setApiMode('child');
      rememberChild(child.id, child.display_name, child.avatar_id);
      setAskPin(false);
      router.push('/play/home');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_pin') {
        setPinError(te('invalid_pin.title'));
        setPin('');
      } else reportError(e, { retry: () => void enter(withPin) });
    }
  }

  return (
    <>
      <Button
        loading={token.isPending && !askPin}
        iconLeft={<Icon name="play" />}
        onClick={() => {
          if (child.has_pin) {
            setPin('');
            setPinError(undefined);
            setAskPin(true);
          } else void enter();
        }}
      >
        {t('playNow', { name: child.display_name })}
      </Button>
      <Dialog open={askPin} onOpenChange={setAskPin} title={t('pinTitle', { name: child.display_name })}>
        <PinInput
          label={t('pinLabel')}
          value={pin}
          onChange={(v) => {
            setPin(v);
            setPinError(undefined);
          }}
          onComplete={(v) => void enter(v)}
          disabled={token.isPending}
          error={pinError}
        />
      </Dialog>
    </>
  );
}
