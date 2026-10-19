'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCredits } from '@/data/hooks';
import { ScreenState } from '@/game/screen-state';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Skeleton } from '@/ui/skeleton';

/** Photo and sprite attributions from GET /credits. Public page: no sign-in needed. */
export function CreditsScreen() {
  const t = useTranslations('screens.credits');
  const router = useRouter();
  const credits = useCredits();
  const items = credits.data ?? [];
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Button variant="ghost" size="sm" iconLeft={<Icon name="chevron-left" />} onClick={() => (history.length > 1 ? router.back() : router.push('/'))}>
        {t('back')}
      </Button>
      <h1 className="mt-2 font-display text-4xl font-bold">{t('title')}</h1>
      <p className="mb-5 mt-2 text-lg text-muted">{t('intro')}</p>
      <ScreenState
        isLoading={credits.isLoading}
        error={credits.error}
        isEmpty={credits.isSuccess && items.length === 0}
        empty={<p className="rounded-lg bg-sunken p-4 text-lg">{t('empty')}</p>}
        onRetry={() => void credits.refetch()}
        area="play"
        skeleton={<Skeleton height={320} />}
      >
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {items.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-lg border-2 border-line bg-elevated p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.url} alt="" width={64} height={64} loading="lazy" decoding="async" className="size-16 shrink-0 rounded-md bg-sunken object-cover" />
              <div className="flex min-w-0 flex-col gap-1 text-sm">
                <p className="break-words font-semibold text-fg">{c.text}</p>
                <p className="text-muted">{t('licence', { licence: c.licence })}</p>
                <p className="flex flex-wrap gap-x-3">
                  {c.source_url && (
                    <a className="inline-flex min-h-11 min-w-11 items-center justify-center font-semibold text-brand underline underline-offset-4" href={c.source_url} target="_blank" rel="noopener noreferrer">
                      {t('source')}
                    </a>
                  )}
                  {c.licence_url && (
                    <a className="inline-flex min-h-11 min-w-11 items-center justify-center font-semibold text-brand underline underline-offset-4" href={c.licence_url} target="_blank" rel="noopener noreferrer">
                      {t('licenceLink')}
                    </a>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </ScreenState>
    </main>
  );
}
