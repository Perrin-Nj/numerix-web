'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { appConfig } from '@/config/app';
import { useChildSettings, useClaimGift, useHome, useSessionStatus } from '@/data/hooks';
import { useStartChapter } from './useStartChapter';
import { usePickLine } from '@/platform/lines';
import { useLocalReminders } from '@/features/notify';
import { NotificationCenterBell } from '@/features/common/NotificationCenterBell';
import { useChildName } from '@/data/local/who';
import { useSpokenLine } from '@/platform/speech/useSpokenLine';
import { ContinueCard } from '@/game/continue-card';
import { DailyGoalRing } from '@/game/daily-goal-ring';
import { MascotBubble } from '@/game/mascot-bubble';
import { MenuTile } from '@/game/menu-tile';
import { QuestCard } from '@/game/quest-card';
import { StoryCard } from '@/game/story-card';
import { StreakBadge } from '@/game/streak-badge';
import { WelcomeGift } from '@/game/welcome-gift';
import { WorldTeaser } from '@/game/world-teaser';
import { GuidedTour } from '@/ui/guided-tour';
import { ScreenState } from '@/game/screen-state';
import { Reveal } from '@/ui/reveal';
import { Skeleton } from '@/ui/skeleton';
import { ThemeToggle } from '@/ui/theme-toggle';

const onboardingKey = (id: string) => `nx:onboarding:${id}`;

/** The child's home: one normal page scroll, a clear primary action, and a menu with more to do. */
export function HomeFeed() {
  const t = useTranslations('screens.play.home');
  const router = useRouter();
  const lang = useLocale().startsWith('en') ? 'en' : 'fr';
  const pick = usePickLine();
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const home = useHome(childId);
  const claim = useClaimGift(childId);
  const d = home.data;
  const openChallenges = d?.active_challenges ?? 0;
  const { begin, dialog } = useStartChapter(childId);
  const [tourDone, setTourDone] = useState(false);
  const kidName = useChildName(childId);
  const settings = useChildSettings(childId ?? '');
  const reminders = useLocalReminders({
    childName: kidName ?? '',
    minutesToday: d?.engagement.minutes_today ?? 0,
    dailyLimit: settings.data?.daily_time_limit_minutes ?? 0,
    lastPlayedAt: d?.engagement.last_played_at ?? null,
  });
  const [greeting, setGreeting] = useState('');
  const [firstVisit, setFirstVisit] = useState(false);
  // Chosen after mount (random, and storage is client only). Never the same line twice in a session;
  // only the first visit of the session is read aloud.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (kidName === undefined) return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem('nx:greet:seen') ?? '[]') as string[];
    } catch {
      seen = [];
    }
    let line = pick('mascot.welcome', { name: kidName });
    for (let i = 0; i < 20 && seen.includes(line); i++) line = pick('mascot.welcome', { name: kidName });
    if (seen.includes(line)) {
      // every line was shown: start a new round, but never open it with the line the child just saw
      const previous = seen.at(-1);
      seen = [];
      for (let i = 0; i < 20 && line === previous; i++) line = pick('mascot.welcome', { name: kidName });
    }
    try {
      sessionStorage.setItem('nx:greet:seen', JSON.stringify([...seen, line]));
      setFirstVisit(!sessionStorage.getItem('nx:greet:spoken'));
      sessionStorage.setItem('nx:greet:spoken', '1');
    } catch {
      setFirstVisit(true);
    }
    setGreeting(line);
  }, [kidName, pick]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useSpokenLine(firstVisit && greeting ? greeting : null, { lang });
  // Data loads on the client only, so reading storage here cannot mismatch the server render
  const tour = Boolean(childId && home.data && !tourDone && !localStorage.getItem(onboardingKey(childId)));
  const [giftLater, setGiftLater] = useState(false);
  const giftOpen = appConfig.features.welcomeGift && !giftLater && Boolean(d?.gift_available && !tour);

  function endTour() {
    setTourDone(true);
    if (childId) localStorage.setItem(onboardingKey(childId), 'done');
  }


  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-6 pt-3">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold text-brand">{t('title')}</h1>
        <div className="flex items-center gap-1">
          <NotificationCenterBell reminders={reminders} enabled={false} />
          <ThemeToggle variant="icon" />
        </div>
      </header>
      {(home.isLoading || status.isLoading || home.error || status.error) && (
        <ScreenState
          isLoading={home.isLoading || status.isLoading}
          error={status.error ?? home.error}
          onRetry={() => void (status.error ? status.refetch() : home.refetch())}
          area="play"
          skeleton={
            <div className="flex flex-col gap-4">
              <Skeleton height={160} />
              <Skeleton height={120} />
              <Skeleton height={120} />
            </div>
          }
        >
          {null}
        </ScreenState>
      )}
      {d && (
        <div className="flex flex-col gap-5">
          <Reveal>
            <MascotBubble pose="greet">{greeting || ' '}</MascotBubble>
          </Reveal>
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

          <nav aria-label={t('menu.label')} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MenuTile icon="trophy" label={t('menu.challenges')} hint={t('menu.challengesHint')} badge={openChallenges || undefined} tone="warning" onSelect={() => router.push('/play/challenges')} />
            <MenuTile icon="sparkles" label={t('menu.discover')} hint={t('menu.discoverHint')} tone="brand" onSelect={() => router.push('/play/feed')} />
            <MenuTile icon="map" label={t('menu.worlds')} hint={t('menu.worldsHint')} tone="info" onSelect={() => router.push('/play/worlds')} />
            <MenuTile icon="star" label={t('menu.cards')} hint={t('menu.cardsHint')} badge={d.recent_cards.length || undefined} tone="success" onSelect={() => router.push('/play/collection')} />
            <MenuTile icon="flame" label={t('menu.progress')} hint={t('menu.progressHint')} tone="world" onSelect={() => router.push('/play/me')} />
            <MenuTile icon="book" label={t('menu.quest')} hint={t('menu.questHint')} badge={d.quest.completed ? undefined : '!'} tone="brand" onSelect={() => router.push('/play/quest')} />
          </nav>

          <QuestCard quest={d.quest} onPlay={() => begin(d.suggested.world, { kind: 'daily_quest' })} />
          <div id="tour-streak" className="flex flex-wrap items-center justify-between gap-4 rounded-lg border-2 border-line bg-elevated p-4">
            <StreakBadge days={d.engagement.streak.current_days} />
            <DailyGoalRing done={d.engagement.daily_goal.done_chapters} target={d.engagement.daily_goal.target_chapters} />
          </div>
          <div id="tour-worlds" className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-bold">{t('worlds')}</h2>
            {d.worlds.slice(0, 6).map((w) => (
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
        </div>
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
      <WelcomeGift open={giftOpen} card={{ id: 'welcome', world: 'nature', title: t('giftCard') }} onClaim={() => claim.mutate()} onLater={() => setGiftLater(true)} />
    </main>
  );
}
