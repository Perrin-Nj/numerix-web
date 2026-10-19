'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound, type SoundName } from '@/platform/audio';
import { useReducedMotion } from '@/platform/motion';
import type { Reward } from '@/data/api/types';
import { StoryCard, familyOf, sourceOf, type Family } from '@/game/story-card';
import { DailyGoalRing } from '@/game/daily-goal-ring';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';

export type RewardBurstProps = { reward: Reward; onDone: () => void };

const SOUND: Partial<Record<Reward['type'], SoundName>> = {
  card_earned: 'card_earned',
  chapter_complete: 'chapter_complete',
  streak_extended: 'streak_up',
  skill_mastered: 'sparkle',
};

// Brief and light confetti (about 1.5 s) with a different shape and palette per reward.
type Confetti = { shapes: ('circle' | 'square' | 'star')[]; colors: string[]; count: number; origin: { y: number }; spread: number };
// Card reveals: each family gets its own sequence (postcard drifts paper stars, badge bursts gold, present showers ribbons).
const CARD_CONFETTI: Record<Family, Confetti> = {
  postcard: { shapes: ['star'], colors: ['#ffd23f', '#f4a261', '#fbf3e2'], count: 36, origin: { y: 0.5 }, spread: 80 },
  badge: { shapes: ['circle', 'star'], colors: ['#ffd700', '#c0c0c0', '#cd7f32', '#ffffff'], count: 60, origin: { y: 0.45 }, spread: 120 },
  present: { shapes: ['square', 'star'], colors: ['#e63946', '#f6c945', '#7bdff2', '#b8a1ff', '#4dd599'], count: 80, origin: { y: 0.4 }, spread: 140 },
};
const CONFETTI: Partial<Record<Reward['type'], Confetti>> = {
  card_earned: { shapes: ['star'], colors: ['#ffd23f', '#7bdff2', '#b8a1ff'], count: 36, origin: { y: 0.5 }, spread: 80 },
  skill_mastered: { shapes: ['circle'], colors: ['#4dd599', '#8be9fd', '#ffffff'], count: 40, origin: { y: 0.55 }, spread: 100 },
  chapter_complete: { shapes: ['square', 'circle'], colors: ['#ff6b6b', '#ffd23f', '#4dd599', '#6c8cff'], count: 50, origin: { y: 0.6 }, spread: 70 },
  streak_extended: { shapes: ['star'], colors: ['#ff9f1c', '#ff5d3b', '#ffd23f'], count: 30, origin: { y: 0.8 }, spread: 60 },
};

const GROW = 'transition-transform duration-(--dur-4) ease-(--ease-spring) starting:scale-50';

/** One-shot light rays behind the art; hidden under reduced motion. */
function Rays() {
  const reduced = useReducedMotion();
  return reduced ? null : <span aria-hidden className="nx-gift-rays pointer-events-none absolute left-1/2 top-1/2 -z-10 size-72 -translate-x-1/2 -translate-y-1/2" />;
}

/** One-shot confetti and rays for a reward; calls onDone when it ends. */
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
    const c = reward.type === 'card_earned' && reward.card ? CARD_CONFETTI[familyOf(sourceOf(reward.card.id))] : CONFETTI[reward.type];
    if (!c || reduced) return;
    let cancelled = false;
    import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return;
      void confetti({ particleCount: c.count, spread: c.spread, ticks: 90, origin: c.origin, shapes: c.shapes, colors: c.colors, scalar: c.shapes[0] === 'star' ? 1.2 : 1, disableForReducedMotion: true });
    });
    return () => {
      cancelled = true;
    };
  }, [reward.type, reward.card, reduced]);

  let art: ReactNode;
  switch (reward.type) {
    case 'card_earned':
      art = reward.card ? (
        <span className="relative block w-52">
          <Rays />
          {familyOf(sourceOf(reward.card.id)) === 'badge' && !reduced && (
            <span aria-hidden className="nx-rb-ring absolute inset-0 -z-10 rounded-full border-4 border-warning" />
          )}
          <StoryCard card={reward.card} variant="reveal" />
        </span>
      ) : (
        <Icon name="book" size={72} className="text-brand" />
      );
      break;
    case 'chapter_complete':
      art = (
        <span className="relative flex items-center justify-center">
          <Rays />
          <Icon name="trophy" size={96} className={cn('text-brand', !reduced && 'nx-pop')} />
        </span>
      );
      break;
    case 'streak_extended':
      art = (
        <span className={cn('flex flex-col items-center gap-2 text-brand', GROW)}>
          <Icon name="flame" size={112} className={reduced ? undefined : 'nx-rb-flicker'} />
          {reward.streak_days ? (
            <span className="font-display text-4xl font-bold text-fg">{reward.streak_days}</span>
          ) : null}
        </span>
      );
      break;
    case 'skill_mastered':
      art = (
        <span className="relative flex size-32 items-center justify-center">
          {!reduced && <span aria-hidden className="nx-rb-ring absolute inset-0 rounded-full border-4 border-brand" />}
          <span className={cn('flex size-32 items-center justify-center rounded-full bg-brand text-brand-fg shadow-3 ring-8 ring-brand/40', GROW)}>
            <Icon name="star" size={64} />
          </span>
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
