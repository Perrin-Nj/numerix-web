'use client';
import { useTranslations } from 'next-intl';
import { useChallenges, useSessionStatus } from '@/data/hooks';
import { useGameStore } from '@/data/local/store';
import { ChallengeCard } from '@/game/challenge-card';
import { MascotBubble } from '@/game/mascot-bubble';
import { Reveal } from '@/ui/reveal';

/** Challenges are taken on from here. Progress counts only after acceptance (local state until BE-20). */
export function ChallengesScreen() {
  const t = useTranslations('screens.play.challenges');
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const challenges = useChallenges(childId);
  const record = useGameStore((g) => g.append);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <h1 className="font-display text-4xl font-bold">{t('title')}</h1>
      <MascotBubble pose="cheer">{t('intro')}</MascotBubble>
      <ul className="flex flex-col gap-4">
        {challenges.map((c, i) => (
          <li key={c.id}>
            <Reveal delayMs={60 * i}>
              <ChallengeCard {...c} onAccept={(id) => childId && record(childId, { k: 'accept', id })} />
            </Reveal>
          </li>
        ))}
      </ul>
    </main>
  );
}
