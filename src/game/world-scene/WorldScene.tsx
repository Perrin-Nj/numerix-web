import type { CSSProperties } from 'react';
import { cn } from '@/shared/cn';
import type { WorldId } from '@/data/api/types';

export type WorldSceneVariant = 'tile' | 'banner' | 'hero';
export type WorldSceneMood = 'idle' | 'success' | 'detour' | 'surprise';

export type WorldSceneProps = {
  world: WorldId;
  variant: WorldSceneVariant;
  mood?: WorldSceneMood;
  className?: string;
};

// Mood is a soft light on the photo, never a drawing
const MOOD: Record<WorldSceneMood, string> = {
  idle: 'transparent',
  success: 'radial-gradient(circle at 50% 55%, rgb(255 244 200 / 0.55), transparent 70%)',
  detour: 'linear-gradient(to right, transparent 55%, rgb(255 214 120 / 0.35))',
  surprise: 'radial-gradient(circle at 50% 50%, transparent 40%, rgb(255 255 255 / 0.35))',
};

/**
 * Real photo of the world (bundled in /public/worlds, licensed in the credits page). Decorative: the parent names it.
 * Fills its parent (size-full); the parent sets the aspect ratio.
 */
export function WorldScene({ world, variant, mood = 'idle', className }: WorldSceneProps) {
  return (
    <span data-world={world} data-mood={mood} aria-hidden className={cn('relative block size-full overflow-hidden bg-sunken', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/worlds/${world}-${variant === 'tile' ? 480 : 960}.webp`}
        alt=""
        draggable={false}
        loading={variant === 'hero' ? 'eager' : 'lazy'}
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <span className="absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none" style={{ background: MOOD[mood] } as CSSProperties} />
    </span>
  );
}
