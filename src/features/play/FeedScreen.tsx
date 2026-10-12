'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { appConfig } from '@/config/app';
import { useGameStore } from '@/lib/game/store';
import { reportError } from '@/lib/errors/bridge';
import type { AnswerValue, FeedItem, FeedPage } from '@/lib/api/types';
import { answerFeedPuzzle, reactToFeedItem, useFeed, useSessionStatus } from '@/features/api/hooks';
import { useStartChapter } from './useStartChapter';
import { FeedCard } from '@/game/feed-card';
import { Button } from '@/ui/button';
import { InlineError } from '@/ui/inline-error';
import { Skeleton } from '@/ui/skeleton';
import { SnapFeed } from '@/ui/snap-feed';

type Reaction = { liked: boolean; saved: boolean };
type Cache = InfiniteData<FeedPage, string | undefined>;

const CARD_H = 'min-h-[calc(100dvh-7rem)]';

function LoadingCard() {
  return (
    <div className={`flex ${CARD_H} flex-col gap-4 rounded-lg border-2 border-line bg-elevated p-4`}>
      <Skeleton height={32} width="40%" />
      <Skeleton className="min-h-40 flex-1" shape="block" />
      <Skeleton height={28} width="70%" />
      <Skeleton height={56} />
    </div>
  );
}

export function FeedScreen() {
  const t = useTranslations('screens.play.feed');
  const qc = useQueryClient();
  const record = useGameStore((s) => s.append);
  const local = appConfig.stateSource === 'local';
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const feed = useFeed(childId);
  const { begin, dialog } = useStartChapter(childId);
  const [active, setActive] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const lastActive = useRef(0);

  // Page index is part of the key: the endless mock feed can repeat item ids across pages.
  const entries = useMemo(
    () => (feed.data?.pages ?? []).flatMap((page, p) => page.items.map((item) => ({ key: `${p}-${item.id}`, item }))),
    [feed.data],
  );
  const total = entries.length;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;

  const onActiveChange = useCallback(
    (i: number) => {
      if (i !== lastActive.current) {
        lastActive.current = i;
        setActive(i);
        setScrolled(true); // no sound here: the feed scrolls silently
      }
      // Second-to-last card in view: ask for more, the feed never ends.
      if (i >= total - 2 && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
    [total, hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const patch = useCallback(
    (id: string, next: Reaction) =>
      qc.setQueryData<Cache>(['feed', childId ?? ''], (d) =>
        d && { ...d, pages: d.pages.map((pg) => ({ ...pg, items: pg.items.map((it) => (it.id === id ? { ...it, ...next } : it)) })) },
      ),
    [qc, childId],
  );

  const onReact = useCallback(
    async (item: FeedItem, next: Reaction) => {
      if (!childId) return;
      const before = { liked: item.liked, saved: item.saved };
      patch(item.id, next);
      if (local) record(childId, { k: 'react', item: item.id, liked: next.liked, saved: next.saved });
      try {
        await reactToFeedItem(childId, item.id, next);
      } catch (e) {
        patch(item.id, before);
        reportError(e);
      }
    },
    [childId, patch, local, record],
  );

  const onAnswer = useCallback(
    async (item: FeedItem, answer: AnswerValue) => {
      try {
        const res = await answerFeedPuzzle(childId ?? '', item.id, answer);
        if (local && childId) record(childId, { k: 'puzzle', item: item.id, outcome: res.outcome });
        return res;
      } catch (e) {
        reportError(e);
        throw e;
      }
    },
    [childId, local, record],
  );

  const onCta = useCallback(
    (item: FeedItem) => {
      if (item.cta) void begin(item.cta.world, { skillId: item.cta.skill_id ?? null });
    },
    [begin],
  );

  const loading = status.isLoading || feed.isLoading;

  return (
    <main className="relative mx-auto w-full max-w-2xl px-4 pt-2">
      <h1 className="sr-only">{t('title')}</h1>
      {loading && <LoadingCard />}
      {!loading && (feed.isError || status.isError) && (
        <div className="flex flex-col items-start gap-3 py-6">
          <InlineError message={t('error')} />
          <Button onClick={() => (feed.isError ? void feed.refetch() : void status.refetch())}>{t('retry')}</Button>
        </div>
      )}
      {!loading && feed.data && total === 0 && <p className="py-10 text-center font-display text-xl text-muted">{t('empty')}</p>}
      {total > 0 && (
        <>
          <SnapFeed
            ariaLabel={t('label')}
            scroll="page"
            onActiveChange={onActiveChange}
          >
            {entries.map(({ key, item }, i) => (
              <FeedCard key={key} item={item} active={i === active} onReact={onReact} onAnswer={onAnswer} onCta={onCta} />
            ))}
            {isFetchingNextPage && <LoadingCard key="loading-more" />}
            {feed.isFetchNextPageError && !isFetchingNextPage && (
              <div key="more-error" className={`flex ${CARD_H} flex-col items-start justify-center gap-3`}>
                <InlineError message={t('moreError')} />
                <Button onClick={() => void fetchNextPage()}>{t('retry')}</Button>
              </div>
            )}
          </SnapFeed>
          {!scrolled && (
            <p
              role="status"
              className="nx-rise pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-fg px-4 py-2 font-display text-base font-semibold text-bg shadow-2"
            >
              {t('hint')}
            </p>
          )}
        </>
      )}
      {isFetchingNextPage && <span className="sr-only" role="status">{t('loadingMore')}</span>}
      {dialog}
    </main>
  );
}
