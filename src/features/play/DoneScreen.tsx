'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { usePickLine } from '@/platform/lines';
import { useSpokenLine } from '@/platform/speech/useSpokenLine';
import { useRouter } from 'next/navigation';
import { getSession, keys, useEngagement, useSessionStatus } from '@/data/hooks';
import { useStartChapter } from './useStartChapter';
import { ChapterComplete } from '@/game/chapter-complete';
import { MascotBubble } from '@/game/mascot-bubble';
import { ScreenState } from '@/game/screen-state';
import { Skeleton } from '@/ui/skeleton';
import type { Reward } from '@/data/api/types';

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
  const pick = usePickLine();
  const noCard = !rewards.some((r) => r.type === 'card_earned');
  const [appreciation] = useState(() => pick(noCard ? 'appreciation.miss' : 'appreciation.pass'));
  const lang = useLocale();
  // The appreciation is spoken. Only a device with no voice for this language shows it as text.
  const voice = useSpokenLine(appreciation, { lang });
  const mute = !voice.supported || (voice.voicesLoaded && !voice.voiceLabel);

  if (session.isLoading || session.error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <ScreenState isLoading={session.isLoading} error={session.error} onRetry={() => void session.refetch()} area="play" skeleton={<Skeleton height={320} />}>
          {null}
        </ScreenState>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-5 px-4 py-10">
      <MascotBubble pose={noCard ? 'sad' : 'happy'}>{mute ? appreciation : ' '}</MascotBubble>
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
