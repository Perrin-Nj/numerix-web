'use client';
import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { Icon, type IconName } from '@/ui/icon';

export type ReactionState = { liked: boolean; saved: boolean };
export type ReactionBarProps = ReactionState & {
  onChange: (next: ReactionState) => void;
  disabled?: boolean;
  className?: string;
};

const BURST_ANGLES = [0, 60, 120, 180, 240, 300];

function ReactionBarBase({ liked, saved, onChange, disabled, className }: ReactionBarProps) {
  const t = useTranslations('game.reactionBar');
  const { play } = useSound();
  const [burst, setBurst] = useState(0);

  const btn = (on: boolean) =>
    cn(
      'lift relative flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full px-4 font-display text-base font-semibold shadow-1 disabled:opacity-60',
      on ? 'bg-brand-soft text-brand-strong' : 'bg-sunken text-fg',
    );
  const icon = (name: IconName, on: boolean) => (
    <Icon name={name} size={26} className={cn(on && 'fill-current')} />
  );

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={liked}
        onClick={() => {
          if (!liked) {
            play('pluck');
            setBurst((n) => n + 1);
          }
          onChange({ liked: !liked, saved });
        }}
        className={btn(liked)}
      >
        {icon('heart', liked)}
        <span>{liked ? t('liked') : t('like')}</span>
        {burst > 0 && liked && (
          <span key={burst} aria-hidden className="nx-burst pointer-events-none absolute left-7 top-1/2">
            {BURST_ANGLES.map((a) => (
              <i key={a} style={{ '--a': `${a}deg` } as React.CSSProperties} className="absolute size-2 rounded-full bg-brand" />
            ))}
          </span>
        )}
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={saved}
        onClick={() => {
          if (!saved) play('drop');
          onChange({ liked, saved: !saved });
        }}
        className={btn(saved)}
      >
        {icon('bookmark', saved)}
        <span>{saved ? t('saved') : t('save')}</span>
      </button>
    </div>
  );
}

/** Memoized row of emoji reactions on a feed card. */
export const ReactionBar = memo(ReactionBarBase);
