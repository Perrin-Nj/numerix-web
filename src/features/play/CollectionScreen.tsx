'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useCollection, useSessionStatus } from '@/data/hooks';
import { StoryCard } from '@/game/story-card';
import { Button } from '@/ui/button';
import { ScreenState } from '@/game/screen-state';
import { Skeleton } from '@/ui/skeleton';
import type { StoryCard as StoryCardData } from '@/data/api/types';

/** Cards in a plain grid grouped by world. The page scrolls, there is no scroller inside the page. */
export function CollectionScreen() {
  const t = useTranslations('screens.play.collection');
  const tw = useTranslations('worlds');
  const status = useSessionStatus();
  const col = useCollection(status.data?.childId ?? null);
  const more = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const items = (col.data?.pages.flatMap((p) => p.items) ?? []) as StoryCardData[];
    const map = new Map<string, StoryCardData[]>();
    for (const c of items) map.set(c.world, [...(map.get(c.world) ?? []), c]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [col.data]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = col;
  useEffect(() => {
    const el = more.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && !isFetchingNextPage && void fetchNextPage(), { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-4 font-display text-4xl font-bold">{t('title')}</h1>
      <ScreenState
        isLoading={status.isLoading || col.isLoading}
        error={status.error ?? col.error}
        isEmpty={Boolean(col.data) && groups.length === 0}
        onRetry={() => void (status.error ? status.refetch() : col.refetch())}
        area="play"
        skeleton={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Skeleton height={190} />
            <Skeleton height={190} />
          </div>
        }
        empty={<p className="rounded-lg border-2 border-line bg-elevated p-5 text-lg text-muted">{t('empty')}</p>}
      >
      {groups.map(([world, cards]) => (
        <section key={world} className="mb-6">
          <h2 className="mb-2 font-display text-2xl font-bold">{tw(world)}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cards.map((c) => (
              <li key={c.id}>
                <StoryCard card={c} variant="tile" />
              </li>
            ))}
          </ul>
        </section>
      ))}
      </ScreenState>
      <div ref={more} />
      {col.isFetchNextPageError && <Button onClick={() => void fetchNextPage()}>{t('retry')}</Button>}
    </main>
  );
}
