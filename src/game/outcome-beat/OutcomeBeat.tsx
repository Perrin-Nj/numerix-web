'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { useSound } from '@/lib/audio';
import { usePickLine } from '@/lib/lines';
import type { Outcome } from '@/lib/api/types';
import { Icon, type IconName } from '@/ui/icon';

export type OutcomeBeatProps = {
  outcome: Outcome;
  children: ReactNode;
  className?: string;
  /** Fixed label (stories, tests). Default: a varied line from the `outcome.*` pool. */
  label?: string;
};

type Beat = {
  key: 'success' | 'detour' | 'surprise';
  sound: 'beat_success' | 'beat_detour' | 'beat_surprise';
  icon: IconName;
  box: string;
  motion: string;
};

// Same size, border and padding for all three: only the entrance and hue differ. Never red, never a shake.
const BEATS: Record<Outcome, Beat> = {
  correct: {
    key: 'success',
    sound: 'beat_success',
    icon: 'sparkles',
    box: 'border-beat-success bg-beat-success/15',
    motion: 'nx-pop shadow-2',
  },
  erreur_typique: {
    key: 'detour',
    sound: 'beat_detour',
    icon: 'map',
    box: 'border-beat-detour bg-beat-detour/15',
    // Slides in from the side and settles (CSS @starting-style, transform and opacity only).
    motion: 'transition-[transform,opacity] duration-(--dur-4) ease-(--ease-out) starting:translate-x-10 starting:opacity-0',
  },
  erreur_aleatoire: {
    key: 'surprise',
    sound: 'beat_surprise',
    icon: 'star',
    box: 'border-beat-surprise bg-beat-surprise/15',
    motion:
      'transition-[transform,opacity] duration-(--dur-4) ease-(--ease-out) starting:rotate-3 starting:scale-95 starting:opacity-0',
  },
};

export function OutcomeBeat({ outcome, children, className, label }: OutcomeBeatProps) {
  const t = useTranslations('game.outcomeBeat');
  const { play } = useSound();
  const pick = usePickLine();
  const beat = BEATS[outcome];
  // Picked once on mount. The beat only appears after an answer, so it is never server rendered.
  const [line] = useState(() => label ?? pick(`outcome.${beat.key === 'success' ? 'correct' : beat.key}`));
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    play(beat.sound);
  }, [play, beat.sound]);

  return (
    <div
      data-outcome={outcome}
      className={cn('flex flex-col gap-3 rounded-lg border-2 p-4 md:p-6', beat.box, beat.motion, className)}
    >
      <p className="flex items-center gap-2 font-display text-lg font-bold text-fg">
        <Icon name={beat.icon} size={24} />
        {label ?? (line || t(beat.key))}
      </p>
      {children}
    </div>
  );
}
