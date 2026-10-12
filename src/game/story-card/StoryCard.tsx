'use client';
import { memo } from 'react';
import { useFormatter } from 'next-intl';
import { cn } from '@/lib/cn';
import type { StoryCard as StoryCardData } from '@/lib/api/types';
import { IllustrationFrame } from '@/game/illustration-frame';

export type StoryCardProps = {
  card: StoryCardData;
  onOpen?: (card: StoryCardData) => void;
  variant?: 'tile' | 'reveal';
};

function StoryCardBase({ card, onOpen, variant = 'tile' }: StoryCardProps) {
  const format = useFormatter();
  const date = format.dateTime(new Date(card.earned_at), { dateStyle: 'medium' });
  const reveal = variant === 'reveal';

  const body = (
    <>
      <IllustrationFrame world={card.world} src={card.image_url || null} alt={card.title} className="rounded-b-none" />
      <span className="flex flex-col gap-1 p-3 text-start">
        <span className="font-display text-lg font-bold text-fg">{card.title}</span>
        <span className="text-sm text-muted">{date}</span>
      </span>
    </>
  );

  const cls = cn(
    'flex w-full flex-col overflow-hidden rounded-lg border-2 border-line bg-elevated',
    reveal
      ? // Flips in from the edge with a glow (CSS @starting-style, transform and opacity only).
        'max-w-xs border-brand shadow-3 ring-4 ring-brand/40 transition-[transform,opacity] duration-(--dur-4) ease-(--ease-spring) starting:[transform:rotateY(90deg)] starting:opacity-0'
      : 'shadow-1',
  );

  return onOpen ? (
    <button type="button" onClick={() => onOpen(card)} className={cn(cls, 'lift')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export const StoryCard = memo(StoryCardBase);
