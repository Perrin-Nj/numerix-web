'use client';
import { useTranslations } from 'next-intl';
import { useAcceptChallenge, useChallenges, useSessionStatus } from '@/data/hooks';
import { ChallengeCard } from '@/game/challenge-card';
import { MascotBubble } from '@/game/mascot-bubble';
import { ScreenState } from '@/game/screen-state';
import { Reveal } from '@/ui/reveal';
import { Skeleton } from '@/ui/skeleton';

/** Challenges are taken on from here. Progress counts only after acceptance. */
export function ChallengesScreen() {
  const t = useTranslations('screens.play.challenges');
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const challenges = useChallenges(childId);
  const accept = useAcceptChallenge(childId);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <h1 className="font-display text-4xl font-bold">{t('title')}</h1>
      <MascotBubble pose="cheer">{t('intro')}</MascotBubble>
      <ScreenState
        isLoading={status.isLoading || challenges.isLoading}
        error={status.error ?? challenges.error}
        isEmpty={challenges.data?.length === 0}
        onRetry={() => void (status.error ? status.refetch() : challenges.refetch())}
        skeleton={<Skeleton height={140} />}
      >
        <ul className="flex flex-col gap-4">
          {challenges.data?.map((c, i) => (
            <li key={c.id}>
              <Reveal delayMs={60 * i}>
                <ChallengeCard
                  id={c.id}
                  title={c.title}
                  description={c.description}
                  target={c.target}
                  progress={c.progress}
                  status={c.status}
                  rewardLabel={c.reward_label}
                  emoji={c.emoji}
                  onAccept={(id) => accept.mutate(id)}
                />
              </Reveal>
            </li>
          ))}
        </ul>
      </ScreenState>
    </main>
  );
}
