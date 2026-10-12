'use client';
import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { useSound } from '@/lib/audio';
import type { JourneyNode as JourneyNodeData } from '@/lib/api/types';
import { Icon, type IconName } from '@/ui/icon';

export type JourneyNodeProps = {
  node: JourneyNodeData;
  /** Any CSS color, usually the world accent. Falls back to the brand token. */
  accent?: string;
  current?: boolean;
  onSelect: (node: JourneyNodeData) => void;
};

const ICON: Record<JourneyNodeData['state'], IconName> = {
  locked: 'lock',
  available: 'play',
  in_progress: 'play',
  mastered: 'check',
  needs_review: 'refresh',
};

// Shine grows with the level (0 to 5); stars below the node repeat it for people who cannot see the glow.
const SHINE = ['', 'ring-2', 'ring-4', 'ring-[6px]', 'ring-8', 'ring-[10px]'];

function JourneyNodeBase({ node, accent, current = false, onSelect }: JourneyNodeProps) {
  const t = useTranslations('game.journeyNode');
  const { play } = useSound();
  const { state } = node;
  const level = Math.max(0, Math.min(5, node.level ?? 0));
  const locked = state === 'locked';
  const ringColor = accent ? { borderColor: accent } : undefined;

  return (
    <button
      type="button"
      aria-disabled={locked || undefined}
      aria-current={current ? 'step' : undefined}
      data-state={state}
      onClick={() => {
        if (locked) {
          play('close');
          return;
        }
        play('select');
        onSelect(node);
      }}
      className={cn('lift group flex w-28 flex-col items-center gap-2 rounded-lg p-1 text-fg', locked && 'cursor-not-allowed')}
    >
      <span className="relative flex size-[4.5rem] items-center justify-center">
        {state === 'available' && (
          <span
            aria-hidden
            style={ringColor}
            className="nx-pulse absolute -inset-1.5 rounded-full border-4 border-brand"
          />
        )}
        {state === 'in_progress' && (
          <svg aria-hidden viewBox="0 0 100 100" className="absolute -inset-1.5 size-[calc(100%+0.75rem)] -rotate-90">
            <circle cx="50" cy="50" r="46" fill="none" strokeWidth="8" className="stroke-line" />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${Math.PI * 46} ${2 * Math.PI * 46}`}
              className="stroke-brand"
              style={accent ? { stroke: accent } : undefined}
            />
          </svg>
        )}
        <span
          className={cn(
            'relative flex size-full items-center justify-center rounded-full border-4',
            locked && 'border-dashed border-line bg-sunken text-muted',
            state === 'available' && 'border-brand bg-elevated text-brand shadow-2',
            state === 'in_progress' && 'border-line bg-elevated text-brand shadow-2',
            state === 'mastered' && cn('border-brand bg-brand text-brand-fg shadow-2 ring-brand/40', SHINE[level]),
            'transition-transform duration-[var(--dur-2)] group-hover:scale-105 group-focus-visible:scale-105',
            state === 'needs_review' && 'border-brand bg-brand-soft text-fg shadow-1',
            current && 'scale-110',
          )}
        >
          <Icon name={ICON[state]} size={32} />
          {state === 'mastered' && (
            <span aria-hidden className="nx-sparkle absolute -right-2 -top-2 text-lg">
              ✨
            </span>
          )}
          {state === 'needs_review' && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full bg-brand text-brand-fg"
            >
              <Icon name="refresh" size={16} className="animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
            </span>
          )}
        </span>
      </span>
      {state === 'mastered' && level > 0 && (
        <span aria-hidden className="flex gap-0.5 text-brand">
          {Array.from({ length: level }, (_, i) => (
            <Icon key={i} name="star" size={12} />
          ))}
        </span>
      )}
      <span className="text-center font-display text-base font-bold leading-tight">{node.label}</span>
      <span className="text-sm text-muted">{t(state)}</span>
    </button>
  );
}

export const JourneyNode = memo(JourneyNodeBase);
