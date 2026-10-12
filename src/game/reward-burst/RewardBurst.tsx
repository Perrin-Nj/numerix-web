'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { useSound, type SoundName } from '@/lib/audio';
import { useReducedMotion } from '@/lib/motion';
import type { Reward } from '@/lib/api/types';
import { StoryCard } from '@/game/story-card';
import { DailyGoalRing } from '@/game/daily-goal-ring';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';

export type RewardBurstProps = { reward: Reward; onDone: () => void };

const SOUND: Partial<Record<Reward['type'], SoundName>> = {
  card_earned: 'card_earned',
  chapter_complete: 'chapter_complete',
  streak_extended: 'streak_up',
};

const GROW = 'transition-transform duration-(--dur-4) ease-(--ease-spring) starting:scale-50';

export function RewardBurst({ reward, onDone }: RewardBurstProps) {
  const t = useTranslations('game.rewardBurst');
  const { play } = useSound();
  const reduced = useReducedMotion();
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return;
    played.current = true;
    const s = SOUND[reward.type];
    if (s) play(s);
  }, [play, reward.type]);

  useEffect(() => {
    if (reward.type !== 'chapter_complete' || reduced) return;
    let cancelled = false;
    import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return;
      // Brief and light: about 1.5 s, low density.
      void confetti({ particleCount: 50, spread: 70, ticks: 90, origin: { y: 0.6 }, disableForReducedMotion: true });
    });
    return () => {
      cancelled = true;
    };
  }, [reward.type, reduced]);

  let art: ReactNode;
  switch (reward.type) {
    case 'card_earned':
      art = reward.card ? (
        <StoryCard card={reward.card} variant="reveal" />
      ) : (
        <Icon name="book" size={72} className="text-brand" />
      );
      break;
    case 'chapter_complete':
      art = <Icon name="trophy" size={96} className={cn('text-brand', !reduced && 'nx-pop')} />;
      break;
    case 'streak_extended':
      art = (
        <span className={cn('flex flex-col items-center gap-2 text-brand', GROW)}>
          <Icon name="flame" size={112} />
          {reward.streak_days ? (
            <span className="font-display text-4xl font-bold text-fg">{reward.streak_days}</span>
          ) : null}
        </span>
      );
      break;
    case 'skill_mastered':
      art = (
        <span className="flex size-32 items-center justify-center rounded-full bg-brand text-brand-fg shadow-3 ring-8 ring-brand/40">
          <Icon name="star" size={64} />
        </span>
      );
      break;
    case 'daily_goal_met':
      art = <DailyGoalRing done={1} target={1} className="size-40" />;
      break;
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="reward-title"
      className="nx-pop mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-lg border-2 border-line bg-elevated p-6 text-center shadow-3"
    >
      <div className="flex min-h-32 items-center justify-center">{art}</div>
      <div aria-live="polite" className="flex flex-col gap-1">
        <h2 id="reward-title" className="font-display text-2xl font-bold text-fg">
          {t(`${reward.type}.title`)}
        </h2>
        <p className="text-base text-muted">
          {reward.type === 'streak_extended' && reward.streak_days
            ? t('streak_extended.detail', { count: reward.streak_days })
            : reward.type === 'card_earned' && reward.card
              ? reward.card.title
              : t(`${reward.type}.detail`)}
        </p>
      </div>
      {/* No auto-advance: the child taps when ready. */}
      <Button size="lg" onClick={onDone} autoFocus>
        {t('continue')}
      </Button>
    </section>
  );
}
