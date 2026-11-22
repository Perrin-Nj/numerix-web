'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useChildren } from '@/data/hooks';
import { ParentPage } from './ParentPage';
import { PlayAsButton } from './PlayAsButton';
import { SubscriptionPill } from '@/features/common/SubscriptionPill';
import { Button } from '@/ui/button';
import { Card, CardBody } from '@/ui/card';
import { ChildCard } from '@/game/child-card';
import { DeleteChildDialog } from './DeleteChildDialog';
import { Chip } from '@/ui/chip';
import { EmptyState } from '@/ui/empty-state';
import { Icon } from '@/ui/icon';
import { Skeleton } from '@/ui/skeleton';
import { ScreenState } from '@/game/screen-state';
import { appConfig } from '@/config/app';

/** Parent home: the children with consent, PIN and subscription status, and the add-child entry. */
export function ParentHome() {
  const t = useTranslations('screens.parent.home');
  const router = useRouter();
  const children = useChildren();
  const [toDelete, setToDelete] = useState<{ id: string; display_name: string } | null>(null);

  return (
    <ParentPage title={t('title')} wide>
      {appConfig.features.subscriptionUi && (
        <Card tone="brand">
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-display text-lg font-semibold">{t('subscription')}</span>
                <SubscriptionPill variant="settings" href={null} />
              </div>
              <Button variant="secondary" iconLeft={<Icon name="settings" />} onClick={() => router.push('/parent/subscription')}>
                {t('manageSubscription')}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
      <ScreenState
        isLoading={children.isLoading}
        error={children.error}
        onRetry={() => void children.refetch()}
        area="parent"
        skeleton={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton shape="block" className="nx-skeleton-card" height={220} />
            <Skeleton shape="block" className="nx-skeleton-card" height={220} />
          </div>
        }
      >
      {children.data && children.data.length === 0 && (
        <Card>
          <CardBody>
            <EmptyState
              size="page"
              icon="users"
              title={t('empty')}
              action={
                <Button size="lg" iconLeft={<Icon name="plus" />} onClick={() => router.push('/parent/children/new')}>
                  {t('add')}
                </Button>
              }
            />
          </CardBody>
        </Card>
      )}
      {children.data && children.data.length > 0 && (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 sm:[&>:last-child:nth-child(odd)]:col-span-full">
            {children.data.map((c, i) => (
              <li key={c.id} className="nx-stagger" style={{ '--i': i } as React.CSSProperties}>
                <ChildCard
                  avatarId={c.avatar_id}
                  name={c.display_name}
                  gradeLabel={t('grade', { grade: c.grade })}
                  badges={
                    <>
                      <Chip tone={c.consent_given ? 'success' : 'warning'} icon={c.consent_given ? 'check' : 'alert'}>
                        {c.consent_given ? t('consentOk') : t('consentNeeded')}
                      </Chip>
                      <Chip icon={c.has_pin ? 'lock' : 'info'}>{c.has_pin ? t('pinOn') : t('pinOff')}</Chip>
                    </>
                  }
                  actions={
                    <>
                      {c.consent_given ? (
                        <PlayAsButton child={c} />
                      ) : (
                        <Button onClick={() => router.push(`/parent/children/${c.id}/consent`)}>{t('giveConsent')}</Button>
                      )}
                      <Link
                        href={`/parent/children/${c.id}`}
                        className="inline-flex min-h-12 items-center rounded-[var(--radius-control)] bg-brand-soft px-5 font-display font-semibold text-brand-strong transition-[filter] duration-[var(--dur-1)] hover:brightness-95"
                      >
                        {t('overview')}
                      </Link>
                    </>
                  }
                  onDelete={() => setToDelete(c)}
                />
              </li>
            ))}
          </ul>
          <div>
            <Button variant="secondary" iconLeft={<Icon name="plus" />} onClick={() => router.push('/parent/children/new')}>
              {t('add')}
            </Button>
          </div>
        </>
      )}
      </ScreenState>
      {toDelete && <DeleteChildDialog key={toDelete.id} childId={toDelete.id} name={toDelete.display_name} open onOpenChange={(o) => !o && setToDelete(null)} />}
    </ParentPage>
  );
}
