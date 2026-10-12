'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useChildren } from '@/features/api/hooks';
import { ParentPage } from './ParentPage';
import { MascotBubble } from '@/game/mascot-bubble';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Card, CardBody, CardFooter } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Skeleton } from '@/ui/skeleton';

export function ParentHome() {
  const t = useTranslations('screens.parent.home');
  const router = useRouter();
  const children = useChildren();

  return (
    <ParentPage title={t('title')}>
      {children.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton height={160} />
          <Skeleton height={160} />
        </div>
      )}
      {children.data && children.data.length === 0 && (
        <div className="flex flex-col items-start gap-4">
          <MascotBubble pose="greet">{t('empty')}</MascotBubble>
          <Button size="lg" iconLeft={<Icon name="plus" />} onClick={() => router.push('/parent/children/new')}>
            {t('add')}
          </Button>
        </div>
      )}
      {children.data && children.data.length > 0 && (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            {children.data.map((c) => (
              <li key={c.id}>
                <Card>
                  <CardBody>
                    <div className="flex items-center gap-4">
                      <Avatar avatarId={c.avatar_id} name={c.display_name} size="lg" />
                      <div>
                        <p className="font-display text-xl font-bold">{c.display_name}</p>
                        <p className="text-muted">{t('grade', { grade: c.grade })}</p>
                        <p className={c.consent_given ? 'text-success' : 'text-warning'}>
                          {c.consent_given ? t('consentOk') : t('consentNeeded')}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                  <CardFooter>
                    <div className="flex flex-wrap gap-2">
                      {c.consent_given ? (
                        <Button onClick={() => router.push('/play')} iconLeft={<Icon name="play" />}>
                          {t('play')}
                        </Button>
                      ) : (
                        <Button onClick={() => router.push(`/parent/children/${c.id}/consent`)}>{t('giveConsent')}</Button>
                      )}
                      <Link
                        href={`/parent/children/${c.id}`}
                        className="lift inline-flex min-h-12 items-center rounded-md border-2 border-line bg-elevated px-5 font-display font-semibold"
                      >
                        {t('overview')}
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
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
    </ParentPage>
  );
}
