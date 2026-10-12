'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getSession, keys, useEngagement, useSessionStatus } from '@/features/api/hooks';
import { useStartChapter } from './useStartChapter';
import { appConfig } from '@/config/app';
import { ChapterComplete } from '@/game/chapter-complete';
import { MascotBubble } from '@/game/mascot-bubble';
import { useGameEvents } from '@/lib/game/store';
import { Skeleton } from '@/ui/skeleton';
import type { Reward } from '@/lib/api/types';

function readRewards(sessionId: string): Reward[] {
  try {
    const raw = sessionStorage.getItem(`nx:rewards:${sessionId}`);
    return raw ? (JSON.parse(raw) as Reward[]) : [];
  } catch {
    return [];
  }
}

export function DoneScreen({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const session = useQuery({ queryKey: keys.session_one(sessionId), queryFn: () => getSession(sessionId) });
  const engagement = useEngagement(childId);
  const { begin, dialog } = useStartChapter(childId);
  const rewards = useMemo(() => readRewards(sessionId), [sessionId]);
  const t = useTranslations('screens.play.done');
  const noCard = !rewards.some((r) => r.type === 'card_earned');
  const events = useGameEvents(childId);
  const answers = events.flatMap((e) => (e.k === 'answer' && e.sid === sessionId ? [e] : []));
  const right = answers.filter((e) => e.outcome === 'correct').length;
  const missed = appConfig.stateSource === 'local' && answers.length > 0 && right < answers.length;

  if (session.isLoading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <Skeleton height={320} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-5 px-4 py-10">
      {noCard && (
        <MascotBubble pose="think">{missed ? t('missed', { right, total: answers.length, pct: appConfig.cardThresholdPct }) : t('noCard', { pct: appConfig.cardThresholdPct })}</MascotBubble>
      )}
      <ChapterComplete
        title={session.data?.story_title ?? undefined}
        rewards={rewards}
        streakDays={engagement.data?.streak.current_days}
        onNext={() => session.data && begin(session.data.world)}
        onBack={() => router.replace('/play/home')}
      />
      {dialog}
    </main>
  );
}
