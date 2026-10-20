'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound, type SoundName } from '@/platform/audio';
import type { WorldId } from '@/data/api/types';
import { WorldScene } from '@/game/world-scene';
import { Mascot } from '@/game/mascot';

// The eight first worlds have their own captions; the others share one set
const LEGACY_WORLDS = ['construction', 'nature', 'espace', 'cuisine', 'sport', 'medecine', 'science', 'echecs'];
const isLegacyWorld = (w: WorldId) => LEGACY_WORLDS.includes(w);

export const SIM_MS = 3000;

/** Sound per world and outcome. Bad outcomes stay soft: a thud or a pluck, never an alarm. */
export const SIM_SOUND: Record<WorldId, { good: SoundName; bad: SoundName }> = {
  construction: { good: 'beat_success', bad: 'collapse' },
  nature: { good: 'sparkle', bad: 'beat_detour' },
  espace: { good: 'whoosh', bad: 'beat_detour' },
  cuisine: { good: 'sparkle', bad: 'drop' },
  sport: { good: 'chapter_complete', bad: 'pluck' },
  medecine: { good: 'tick', bad: 'question' },
  science: { good: 'glass', bad: 'beat_surprise' },
  echecs: { good: 'chapter_complete', bad: 'question' },
  ocean: { good: 'sparkle', bad: 'beat_detour' },
  dinosaures: { good: 'sparkle', bad: 'beat_detour' },
  animaux: { good: 'sparkle', bad: 'beat_detour' },
  musique: { good: 'chapter_complete', bad: 'question' },
  transport: { good: 'beat_success', bad: 'collapse' },
  pirates: { good: 'whoosh', bad: 'beat_detour' },
  marche: { good: 'sparkle', bad: 'drop' },
  meteo: { good: 'glass', bad: 'beat_surprise' },
  robots: { good: 'glass', bad: 'beat_surprise' },
  arts: { good: 'chapter_complete', bad: 'question' },
  hiver: { good: 'chapter_complete', bad: 'pluck' },
  jeux: { good: 'chapter_complete', bad: 'question' },
};

export type OutcomeSimProps = {
  world: WorldId;
  good: boolean;
  /** False draws the finished picture, no sound, no timer. */
  playing?: boolean;
  /** Fires after 3 s or when the child taps to skip. */
  onDone?: () => void;
  /** Caption variant 0 or 1. Defaults to a stable pick per instance. */
  variant?: 0 | 1;
  /** False keeps the caption invisible (it fades in later). */
  showCaption?: boolean;
  className?: string;
};

/** Small animation of what happens in the story after the answer, with sound and caption. */
export function OutcomeSim({ world, good, playing = true, onDone, variant, showCaption = true, className }: OutcomeSimProps) {
  const t = useTranslations('game.outcomeSim');
  const { play } = useSound();
  const uid = useId();
  const v = variant ?? ((Array.from(uid).reduce((n, c) => n + c.charCodeAt(0), 0) % 2) as 0 | 1);
  const outcome = good ? 'good' : 'bad';
  // Worlds without their own animation share one set of captions
  const capWorld = isLegacyWorld(world) ? world : 'generic';
  const runKey = `${world}-${outcome}`;
  const [skipped, setSkipped] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (!playing) return;
    play(SIM_SOUND[world][outcome]);
    timer.current = setTimeout(() => done.current?.(), SIM_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, world, outcome, play]);
  const skip = () => {
    if (skipped === runKey) return;
    if (timer.current) clearTimeout(timer.current);
    setSkipped(runKey);
    done.current?.();
  };
  const still = !playing || skipped === runKey;
  return (
    <figure className={cn('w-full', className)}>
      <button
        type="button"
        onClick={skip}
        aria-label={t('skip')}
        className="block w-full overflow-hidden rounded-lg shadow-2"
        data-skip={still ? '' : undefined}
      >
        <span key={runKey} role="img" aria-label={t(`caption.${capWorld}.${outcome}.${v}`)} className="relative block aspect-[16/9] w-full">
          <WorldScene world={world} variant="hero" mood={good ? 'success' : 'detour'} />
          <span aria-hidden className="absolute bottom-1 end-2">
            <Mascot pose={good ? 'cheer' : 'think'} size="sm" decorative />
          </span>
        </span>
      </button>
      <figcaption aria-hidden={!showCaption} className={cn('mt-2 text-center font-display text-lg text-fg transition-opacity duration-300', !showCaption && 'opacity-0')}>{t(`caption.${capWorld}.${outcome}.${v}`)}</figcaption>
    </figure>
  );
}
