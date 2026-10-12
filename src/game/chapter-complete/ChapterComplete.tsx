'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Reward } from '@/lib/api/types';
import { MascotBubble } from '@/game/mascot-bubble';
import { RewardBurst } from '@/game/reward-burst';
import { StreakBadge } from '@/game/streak-badge';
import { Button } from '@/ui/button';

export type ChapterCompleteProps = {
  title?: string;
  rewards: Reward[];
  streakDays?: number;
  onNext: () => void;
  onBack: () => void;
};

/** Plays each reward in order (the child taps Continue on each), then shows the two actions. */
export function ChapterComplete({ title, rewards, streakDays, onNext, onBack }: ChapterCompleteProps) {
  const t = useTranslations('game.chapterComplete');
  const [step, setStep] = useState(0);
  const current = rewards[step];

  if (current) {
    return <RewardBurst key={step} reward={current} onDone={() => setStep((s) => s + 1)} />;
  }

  return (
    <section
      aria-labelledby="chapter-complete-title"
      className="nx-rise mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center"
    >
      <h1 id="chapter-complete-title" className="font-display text-3xl font-bold text-fg">
        {title ?? t('fallbackTitle')}
      </h1>
      <MascotBubble pose="cheer">{t('congrats')}</MascotBubble>
      {streakDays ? <StreakBadge days={streakDays} /> : null}
      <div className="flex w-full flex-col gap-3">
        <Button size="xl" fullWidth onClick={onNext}>
          {t('next')}
        </Button>
        <Button size="lg" variant="secondary" fullWidth onClick={onBack}>
          {t('back')}
        </Button>
      </div>
    </section>
  );
}
