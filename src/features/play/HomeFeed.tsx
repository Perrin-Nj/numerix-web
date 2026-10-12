'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { appConfig } from '@/config/app';
import { useHome, useSessionStatus } from '@/features/api/hooks';
import { useStartChapter } from './useStartChapter';
import { ContinueCard } from '@/game/continue-card';
import { DailyGoalRing } from '@/game/daily-goal-ring';
import { MascotBubble } from '@/game/mascot-bubble';
import { QuestCard } from '@/game/quest-card';
import { StoryCard } from '@/game/story-card';
import { StreakBadge } from '@/game/streak-badge';
import { WorldTeaser } from '@/game/world-teaser';
import { GuidedTour } from '@/ui/guided-tour';
import { Skeleton } from '@/ui/skeleton';
import { SnapFeed } from '@/ui/snap-feed';

const onboardingKey = (id: string) => `nx:onboarding:${id}`;

export function HomeFeed() {
  const t = useTranslations('screens.play.home');
  const router = useRouter();
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const home = useHome(childId);
  const { begin, dialog } = useStartChapter(childId);
  const [tourDone, setTourDone] = useState(false);
  // Data loads on the client only, so reading storage here cannot mismatch the server render
  const tour = Boolean(childId && home.data && !tourDone && !localStorage.getItem(onboardingKey(childId)));

  function endTour() {
    setTourDone(true);
    if (childId) localStorage.setItem(onboardingKey(childId), 'done');
  }

  const d = home.data;
  const feed = appConfig.features.feed;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="sr-only">{t('title')}</h1>
      {(home.isLoading || status.isLoading) && (
        <div className="flex flex-col gap-4">
          <Skeleton height={160} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </div>
      )}
      {d && (
        <SnapFeed ariaLabel={t('feedLabel')} className={feed ? undefined : 'snap-none'}>
          <div id="tour-continue">
            <ContinueCard
              label={d.suggested.label}
              world={d.suggested.world}
              hasOpenSession={Boolean(d.suggested.open_session)}
              onContinue={() =>
                d.suggested.open_session
                  ? router.push(`/play/session/${d.suggested.open_session!.id}`)
                  : begin(d.suggested.world, { skillId: d.suggested.skill_id })
              }
            />
          </div>
          <QuestCard quest={d.quest} onPlay={() => begin(d.suggested.world, { kind: 'daily_quest' })} />
          <div id="tour-streak" className="flex flex-wrap items-center justify-between gap-4 rounded-lg border-2 border-line bg-elevated p-4">
            <StreakBadge days={d.engagement.streak.current_days} />
            <DailyGoalRing done={d.engagement.daily_goal.done_chapters} target={d.engagement.daily_goal.target_chapters} />
          </div>
          <div id="tour-worlds" className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-bold">{t('worlds')}</h2>
            {d.worlds.map((w) => (
              <WorldTeaser key={w.id} world={w} onOpen={(world) => router.push(`/play/journey/${world.id}`)} />
            ))}
          </div>
          {d.recent_cards.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-bold">{t('recentCards')}</h2>
              <div className="grid grid-cols-2 gap-3">
                {d.recent_cards.map((c) => (
                  <StoryCard key={c.id} card={c} variant="tile" onOpen={() => router.push('/play/collection')} />
                ))}
              </div>
            </div>
          )}
          <MascotBubble pose="cheer">{t('growth', { now: d.growth.current.chapters_completed, before: d.growth.previous.chapters_completed })}</MascotBubble>
        </SnapFeed>
      )}
      {dialog}
      <GuidedTour
        open={tour}
        onClose={endTour}
        onFinish={endTour}
        steps={[
          { title: t('tour.welcomeTitle'), description: t('tour.welcome') },
          { target: '#tour-continue', title: t('tour.continueTitle'), description: t('tour.continue') },
          { target: '#tour-streak', title: t('tour.streakTitle'), description: t('tour.streak') },
          { target: '#tour-worlds', title: t('tour.worldsTitle'), description: t('tour.worlds') },
        ]}
      />
    </main>
  );
}
