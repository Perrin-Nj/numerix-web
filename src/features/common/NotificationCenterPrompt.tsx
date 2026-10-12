'use client';
import { useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { PushError, getPermission, requestPermission, subscribeToPush, type Permission } from '@/lib/notify';
import { reportError } from '@/lib/errors/bridge';
import { Banner } from '@/ui/banner';

const DISMISS_KEY = 'nx:notify-prompt-dismissed';
const noopSubscribe = () => () => undefined;
function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false; // storage blocked: ask again next visit rather than hide the prompt forever
  }
}

export type EnableNotificationsPromptProps = {
  /** VAPID public key from config. Without it only in-app and open-tab reminders work (BE-26). */
  vapidPublicKey?: string;
};

/** Polite opt-in. Asks the browser only after a tap on the button, never on load. */
export function EnableNotificationsPrompt({ vapidPublicKey }: EnableNotificationsPromptProps) {
  const t = useTranslations('lib.notify.ui.prompt');
  // Browser-only values read without an effect: the server snapshot keeps the first render empty.
  const initialPermission = useSyncExternalStore(noopSubscribe, getPermission, () => null);
  const storedDismissed = useSyncExternalStore(noopSubscribe, readDismissed, () => true);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [result, setResult] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null);
  const currentPermission = permission ?? initialPermission;

  async function enable() {
    const p = await requestPermission();
    setPermission(p);
    if (p !== 'granted') {
      setResult({ tone: 'warning', text: t(p === 'unsupported' ? 'unsupported' : 'denied') });
      return;
    }
    try {
      await subscribeToPush(vapidPublicKey);
      setResult({ tone: 'success', text: t('granted') });
    } catch (e) {
      if (e instanceof PushError) setResult({ tone: 'warning', text: t(`push.${e.reason}`) });
      else reportError(e);
    }
  }

  function later() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // storage blocked: hidden for this visit only
    }
  }

  if (result) return <Banner tone={result.tone} title={result.text} onDismiss={() => setResult(null)} />;
  if (currentPermission !== 'default' || dismissed || storedDismissed) return null;
  return (
    <Banner
      tone="info"
      title={t('title')}
      description={t('text')}
      action={{ label: t('enable'), onClick: () => void enable().catch(reportError) }}
      onDismiss={later}
    />
  );
}
