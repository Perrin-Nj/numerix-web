'use client';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useCollection, useSessionStatus } from '@/features/api/hooks';
import { StoryCard } from '@/game/story-card';
import { VirtualFeed } from '@/ui/virtual-feed';
import type { StoryCard as StoryCardData } from '@/lib/api/types';

export function CollectionScreen() {
  const t = useTranslations('screens.play.collection');
  const tw = useTranslations('worlds');
  const status = useSessionStatus();
  const col = useCollection(status.data?.childId ?? null);

  const items = useMemo(
    () =>
      (col.data?.pages.flatMap((p) => p.items) ?? [])
        .slice()
        .sort((a: StoryCardData, b: StoryCardData) => a.world.localeCompare(b.world)),
    [col.data],
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-4 font-display text-4xl font-bold">{t('title')}</h1>
      <VirtualFeed
        ariaLabel={t('title')}
        items={items}
        getKey={(c) => c.id}
        estimateSize={220}
        hasMore={Boolean(col.hasNextPage)}
        loadMore={() => void col.fetchNextPage()}
        loading={col.isLoading || col.isFetchingNextPage}
        error={col.isError}
        onRetry={() => void col.refetch()}
        groupBy={(c) => tw(c.world)}
        renderItem={(c) => (
          <div className="py-2">
            <StoryCard card={c} variant="tile" />
          </div>
        )}
      />
    </main>
  );
}
