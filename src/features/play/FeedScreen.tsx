'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminCopy } from '@/features/common/useAdminCopy';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { reportError } from '@/platform/errors/bridge';
import type { AnswerValue, DiscoverItem, DiscoverPage, FeedItem } from '@/data/api/types';
import { answerFeedPuzzle, FEED_RETAP, newDiscoverSeed, reactToFeedItem, useDiscover, useSessionStatus } from '@/data/hooks';
import { useStartChapter } from './useStartChapter';
import { FeedCard } from '@/game/feed-card';
import { MediaCard } from '@/game/media-card';
import { Button } from '@/ui/button';
import { InlineError } from '@/ui/inline-error';
import { Skeleton } from '@/ui/skeleton';
import { ScreenState } from '@/game/screen-state';
import { SnapFeed } from '@/ui/snap-feed';

type Reaction = { liked: boolean; saved: boolean };
type Cache = InfiniteData<DiscoverPage, string | undefined>;

const CARD_H = 'min-h-[calc(100dvh-7rem)]';
/** Cards this far from the one on screen stay mounted; the others are replaced by an empty box of the same height. */
const WINDOW = 3;
const FALLBACK_HEIGHT = 620;

function LoadingCard() {
  return (
    <div className={`flex ${CARD_H} flex-col gap-4 rounded-lg bg-elevated p-4 shadow-2`}>
      <Skeleton className="aspect-[4/3] w-full" shape="block" />
      <Skeleton height={32} width="60%" />
      <Skeleton height={24} width="90%" />
      <Skeleton height={56} />
    </div>
  );
}

/**
 * The Discover feed: 200 real photos, animations and short captioned videos in a private random order, with a
 * puzzle now and then. Endless: the next page is requested well before the end. Only the cards near the one on
 * screen are mounted, so memory stays flat however far the child scrolls.
 */
export function FeedScreen() {
  const t = useTranslations('screens.play.feed');
  const emptyCopy = useAdminCopy('feed_empty');
  const qc = useQueryClient();
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  // A new random order every time the tab opens (this component mounts again on every visit) or is tapped again.
  const [seed, setSeed] = useState(newDiscoverSeed);
  const [fading, setFading] = useState(false);
  const feed = useDiscover(childId, seed);
  const { begin, dialog } = useStartChapter(childId);
  const [active, setActive] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const lastActive = useRef(0);
  const [heights] = useState(() => new Map<string, number>()); // measured card heights, so a far card keeps its place in the scroll

  // Page index is part of the key: the endless feed repeats items after a full pass.
  const entries = useMemo(
    () => (feed.data?.pages ?? []).flatMap((page, p) => page.items.map((item) => ({ key: `${p}-${item.id}`, item }))),
    [feed.data],
  );
  const total = entries.length;

  // Tab tapped while already here (or page restored from the back-forward cache): top of the page, new order.
  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reshuffle = () => {
      const swap = () => {
        heights.clear();
        lastActive.current = 0;
        setActive(0);
        setSeed(newDiscoverSeed());
        setFading(false);
      };
      window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
      if (calm) return swap(); // reduced motion: no animation at all
      setFading(true);
      clearTimeout(timer);
      timer = setTimeout(swap, 180);
    };
    const onShow = (e: PageTransitionEvent) => e.persisted && reshuffle();
    window.addEventListener(FEED_RETAP, reshuffle);
    window.addEventListener('pageshow', onShow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(FEED_RETAP, reshuffle);
      window.removeEventListener('pageshow', onShow);
    };
  }, [heights]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;

  const onActiveChange = useCallback(
    (i: number) => {
      if (i !== lastActive.current) {
        lastActive.current = i;
        setActive(i);
        setScrolled(true); // the feed scrolls silently
      }
      // Preload: ask for the next page while five cards are still ahead
      if (i >= total - 5 && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
    [total, hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const patch = useCallback(
    (id: string, next: Reaction) =>
      qc.setQueryData<Cache>(['discover', childId ?? '', seed], (d) =>
        d && { ...d, pages: d.pages.map((pg) => ({ ...pg, items: pg.items.map((it) => (it.id === id ? { ...it, ...next } : it)) })) },
      ),
    [qc, childId, seed],
  );

  const react = useCallback(
    async (id: string, before: Reaction, next: Reaction) => {
      if (!childId) return;
      patch(id, next);
      try {
        await reactToFeedItem(childId, id, next);
      } catch (e) {
        patch(id, before);
        reportError(e);
      }
    },
    [childId, patch],
  );

  const onAnswer = useCallback(
    async (item: FeedItem, answer: AnswerValue) => {
      try {
        return await answerFeedPuzzle(childId ?? '', item.id, answer);
      } catch (e) {
        reportError(e);
        throw e;
      }
    },
    [childId],
  );

  const onCta = useCallback(
    (item: FeedItem) => {
      if (item.cta) void begin(item.cta.world, { skillId: item.cta.skill_id ?? null });
    },
    [begin],
  );

  const loading = status.isLoading || feed.isLoading;

  function card(item: DiscoverItem, key: string, near: boolean) {
    if (item.media) {
      return (
        <MediaCard
          media={item.media}
          liked={item.liked}
          saved={item.saved}
          near={near}
          onReact={(next) => void react(item.id, { liked: item.liked, saved: item.saved }, next)}
        />
      );
    }
    if (item.puzzle_item) {
      const fi = { ...item.puzzle_item, liked: item.liked, saved: item.saved };
      return <FeedCard key={key} item={fi} active={near} onReact={(it, next) => void react(it.id, { liked: it.liked, saved: it.saved }, next)} onAnswer={onAnswer} onCta={onCta} />;
    }
    return null;
  }

  return (
    <main className="relative mx-auto w-full max-w-2xl px-4 pt-2">
      <h1 className="sr-only">{t('title')}</h1>
      {total === 0 && (
        <ScreenState
          isLoading={loading}
          error={feed.error ?? status.error}
          onRetry={() => (feed.isError ? void feed.refetch() : void status.refetch())}
          area="play"
          skeleton={<LoadingCard />}
        >
          {null}
        </ScreenState>
      )}
      {!loading && feed.data && total === 0 && <p className="py-10 text-center font-display text-xl text-muted">{emptyCopy || t('empty')}</p>}
      {total > 0 && (
        <>
          <div className={`motion-safe:transition-opacity motion-safe:duration-150 ${fading ? 'opacity-0' : 'opacity-100'}`}>
          <SnapFeed ariaLabel={t('label')} scroll="page" onActiveChange={onActiveChange}>
            {entries.map(({ key, item }, i) => {
              const near = Math.abs(i - active) <= WINDOW;
              if (!near) {
                return <div key={key} aria-hidden style={{ height: heights.get(key) ?? FALLBACK_HEIGHT }} />;
              }
              return (
                <div
                  key={key}
                  ref={(el) => {
                    if (el) heights.set(key, el.offsetHeight);
                  }}
                >
                  {card(item, key, Math.abs(i - active) <= 1)}
                </div>
              );
            })}
            {isFetchingNextPage && <LoadingCard key="loading-more" />}
            {feed.isFetchNextPageError && !isFetchingNextPage && (
              <div key="more-error" className={`flex ${CARD_H} flex-col items-start justify-center gap-3`}>
                <InlineError message={t('moreError')} />
                <Button onClick={() => void fetchNextPage()}>{t('retry')}</Button>
              </div>
            )}
          </SnapFeed>
          </div>
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
