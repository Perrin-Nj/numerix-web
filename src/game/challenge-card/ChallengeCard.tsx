'use client';
import { memo, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import type { ChallengeView } from '@/domain/game/types';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Progress } from '@/ui/progress';

export type ChallengeCardProps = ChallengeView & {
  onAccept?: (id: string) => void;
  onClaim?: (id: string) => void;
  className?: string;
};

function ChallengeCardBase({
  id,
  title,
  description,
  target,
  progress,
  status,
  rewardLabel,
  emoji,
  onAccept,
  onClaim,
  className,
}: ChallengeCardProps) {
  const t = useTranslations('game.challengeCard');
  const done = status === 'done';
  return (
    <article
      data-status={status}
      className={cn(
        'flex flex-col gap-3 rounded-lg border-2 bg-elevated p-4 text-fg shadow-1',
        done ? 'nx-glow-pulse border-beat-detour' : 'border-line',
        className,
      )}
    >
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-3xl',
            status === 'available' && 'nx-wobble',
          )}
        >
          {emoji}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <p className="text-base text-muted">{description}</p>
        </div>
        {done && (
          <span aria-hidden className="relative flex size-12 shrink-0 items-center justify-center">
            <Icon name="trophy" size={40} className="nx-pop text-warning" />
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn('nx-twinkle absolute text-warning', ['-top-1 -left-1', '-top-2 right-0', 'bottom-0 -right-2'][i])}
                style={{ '--i': i } as CSSProperties}
              >
                <Icon name="sparkles" size={14} />
              </span>
            ))}
          </span>
        )}
      </header>

      {status === 'active' && <Progress value={progress} max={target} label={t('progress')} />}

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Icon name="gift" size={18} className="text-brand" />
          {t('reward', { reward: rewardLabel })}
        </span>
        {status === 'available' && onAccept && (
          <Button iconLeft={<Icon name="play" size={20} />} onClick={() => onAccept(id)}>
            {t('accept')}
          </Button>
        )}
        {done && onClaim && (
          <Button sound="card_earned" iconLeft={<Icon name="sparkles" size={20} />} onClick={() => onClaim(id)}>
            {t('claim')}
          </Button>
        )}
      </footer>
    </article>
  );
}

export const ChallengeCard = memo(ChallengeCardBase);
