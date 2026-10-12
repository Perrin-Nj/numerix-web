'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { signOut } from '@/features/api/hooks';
import { OfflineBanner } from '@/features/common/OfflineBanner';
import { reportError } from '@/lib/errors/bridge';
import { AppHeader } from '@/ui/app-header';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';
import { PageContainer } from '@/ui/page-container';

type Props = { title: string; backHref?: string; children: ReactNode };

/** Common frame for parent screens: header, optional back link, offline notice, content. */
export function ParentPage({ title, backHref, children }: Props) {
  const t = useTranslations('screens.parent.shell');
  const router = useRouter();
  return (
    <>
      <AppHeader
        title={title}
        left={
          backHref ? (
            <Link href={backHref} aria-label={t('back')} className="lift flex size-12 items-center justify-center rounded-md text-fg">
              <Icon name="chevron-left" size={26} />
            </Link>
          ) : undefined
        }
        right={
          <>
            <IconButton label={t('account')} variant="ghost" icon={<Icon name="settings" />} onClick={() => router.push('/parent/account')} />
            <IconButton
              label={t('signOut')}
              variant="ghost"
              icon={<Icon name="log-out" />}
              onClick={async () => {
                try {
                  await signOut('all');
                  router.replace('/');
                  router.refresh();
                } catch (e) {
                  reportError(e);
                }
              }}
            />
          </>
        }
      />
      <OfflineBanner />
      <PageContainer>
        <div className="flex flex-col gap-6 py-6">{children}</div>
      </PageContainer>
    </>
  );
}
