import type { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { WorldScene } from '@/game/world-scene';
import type { WorldId } from '@/lib/api/types';

export const WORLD_EMOJI: Record<WorldId, string> = {
  nature: '🌿',
  espace: '🚀',
  cuisine: '🍳',
  sport: '⚽',
  construction: '🏗️',
  medecine: '🩺',
  science: '🔬',
  echecs: '♟️',
};

// Static class names so Tailwind can see them.
export const WORLD_BG: Record<WorldId, string> = {
  nature: 'bg-world-nature',
  espace: 'bg-world-espace',
  cuisine: 'bg-world-cuisine',
  sport: 'bg-world-sport',
  construction: 'bg-world-construction',
  medecine: 'bg-world-medecine',
  science: 'bg-world-science',
  echecs: 'bg-world-echecs',
};

export type IllustrationMood = 'idle' | 'success' | 'detour' | 'surprise';

export type IllustrationFrameProps = {
  world: WorldId;
  src?: string | null;
  alt: string;
  mood?: IllustrationMood;
  /** Drawn over the scene, e.g. a ScenePicture. The frame keeps its alt. */
  picture?: ReactNode;
  /** Free overlay (badges, sim). */
  children?: ReactNode;
  className?: string;
};

export function IllustrationFrame({ world, src, alt, mood = 'idle', picture, children, className }: IllustrationFrameProps) {
  return (
    <div
      className={cn(
        'relative aspect-[16/9] max-h-[30dvh] w-full overflow-hidden rounded-lg shadow-2 lg:aspect-[4/3] lg:max-h-none',
        WORLD_BG[world],
        className,
      )}
    >
      <div className="absolute inset-0">
        {src ? (
          <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div role="img" aria-label={alt} className="size-full">
            <WorldScene world={world} variant="hero" mood={mood} />
          </div>
        )}
      </div>
      {picture && <div className="absolute inset-0 flex items-center justify-center overflow-auto p-2">{picture}</div>}
      {children && <div className="absolute inset-0">{children}</div>}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"
      />
    </div>
  );
}
