'use client';
import { ViewTransition, type ReactNode } from 'react';
import { cn } from '@/shared/cn';
import { useParallax } from '@/platform/motion';
import type { World } from '@/data/api/types';
import { MediaImage, heroOf } from '@/game/media-image';
import { WorldBackdrop } from '@/game/world-card';

export type WorldHeroProps = {
  world: World;
  /** Back button or other controls pinned to the top-left. */
  top?: ReactNode;
  /** Owl guide bubble at the bottom. */
  guide?: ReactNode;
  className?: string;
};

/**
 * Header of a world page: the hero photo moves slowly against the page (scroll and tilt parallax, still under
 * reduced motion), under a gradient that keeps the white title readable. Shares its name with the map card, so
 * the card photo grows into this header on browsers that support view transitions.
 */
export function WorldHero({ world, top, guide, className }: WorldHeroProps) {
  const parallax = useParallax<HTMLDivElement>(24);
  return (
    <header className={cn('relative isolate overflow-hidden rounded-b-2xl bg-sunken text-white', className)}>
      <ViewTransition name={`world-${world.id}`} share="auto">
        <div ref={parallax} className="absolute -inset-x-6 -inset-y-8" style={{ transform: 'translate3d(var(--px,0px),var(--py,0px),0)' }}>
          {heroOf(world) ? (
            <MediaImage media={heroOf(world)!} alt="" priority sizes="(min-width: 768px) 672px, 100vw" />
          ) : (
            <WorldBackdrop world={world.id} accent={world.accent_color} />
          )}
        </div>
      </ViewTransition>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      <div className="relative flex min-h-56 flex-col justify-between gap-6 p-3 md:min-h-64">
        <div className="flex items-center gap-2">{top}</div>
        <div className="flex flex-col gap-1 px-1">
          <h1 className="font-display text-4xl font-bold leading-tight drop-shadow">{world.name}</h1>
          {world.tagline && <p className="max-w-prose text-base leading-snug text-white/90">{world.tagline}</p>}
          {guide}
        </div>
      </div>
    </header>
  );
}
