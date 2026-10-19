'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useConsent } from '@/data/hooks';
import { ParentPage } from './ParentPage';
import { Button } from '@/ui/button';
import { Panel } from '@/ui/panel';
import { Switch } from '@/ui/switch';

const NOTICE_VERSION = '2026-10';

/** Shows and records the parent consent for one child (Law 25). */
export function ConsentScreen({ childId }: { childId: string }) {
  const t = useTranslations('screens.parent.consent');
  const router = useRouter();
  const consent = useConsent();
  const [agreed, setAgreed] = useState(false);

  async function accept() {
    await consent.mutateAsync({ child_id: childId, version: NOTICE_VERSION });
    router.replace('/parent');
  }

  return (
    <ParentPage title={t('title')} backHref="/parent">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <Panel title={t('whatTitle')}>
          <ul className="list-disc space-y-2 ps-5 text-base">
            {(['collect', 'noPhoto', 'noAds', 'control'] as const).map((k) => (
              <li key={k}>{t(`points.${k}`)}</li>
            ))}
          </ul>
        </Panel>
        <Switch checked={agreed} onCheckedChange={setAgreed} label={t('agree')} />
        <Button size="lg" onClick={accept} disabled={!agreed} loading={consent.isPending}>
          {t('accept')}
        </Button>
      </div>
    </ParentPage>
  );
}
