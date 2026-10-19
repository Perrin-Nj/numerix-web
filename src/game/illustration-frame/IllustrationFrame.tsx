import type { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/shared/cn';
import { WorldScene } from '@/game/world-scene';
import type { MediaRef, WorldId } from '@/data/api/types';
import { MediaImage } from '@/game/media-image';

export const WORLD_EMOJI: Record<WorldId, string> = {
  nature: '🌿',
  espace: '🚀',
  cuisine: '🍳',
  sport: '⚽',
  construction: '🏗️',
  medecine: '🩺',
  science: '🔬',
  echecs: '♟️',
  ocean: '🐠',
  dinosaures: '🦕',
  animaux: '🦊',
  musique: '🎵',
  transport: '🚂',
  pirates: '🏴‍☠️',
  marche: '🛒',
  meteo: '⛅',
  robots: '🤖',
  arts: '🎨',
  hiver: '⛄',
  jeux: '🎲',
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
  // The twelve newer worlds borrow the nearest colour; their own accent comes from GET /worlds
  ocean: 'bg-world-nature',
  dinosaures: 'bg-world-nature',
  animaux: 'bg-world-nature',
  musique: 'bg-world-echecs',
  transport: 'bg-world-construction',
  pirates: 'bg-world-espace',
  marche: 'bg-world-cuisine',
  meteo: 'bg-world-science',
  robots: 'bg-world-science',
  arts: 'bg-world-echecs',
  hiver: 'bg-world-sport',
  jeux: 'bg-world-echecs',
};

export type IllustrationMood = 'idle' | 'success' | 'detour' | 'surprise';

export type IllustrationFrameProps = {
  world: WorldId;
  src?: string | null;
  /** Photo of the question's scene (server MediaRef). Full when alone, a soft backdrop under a stage or picture. */
  media?: MediaRef | null;
  /** Fill the parent's height instead of keeping a 16:9 shape (the play screen sizes the stage itself). */
  fill?: boolean;
  alt: string;
  mood?: IllustrationMood;
  /** Drawn over the scene, e.g. a ScenePicture. The frame keeps its alt. */
  picture?: ReactNode;
  /**
   * The only image of the frame (a ScenePicture, then an OutcomeSim). Replaces the world scene,
   * never drawn on top of it. Change stageKey to cross-fade to the next stage. Fills its parent height.
   */
  stage?: ReactNode;
  stageKey?: string;
  /** Free overlay (badges, sim). */
  children?: ReactNode;
  className?: string;
};

/** Framed world picture with mood, optional stage and children drawn over the art. */
export function IllustrationFrame({ world, src, media, fill, alt, mood = 'idle', picture, stage, stageKey, children, className }: IllustrationFrameProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-lg shadow-2',
        stage || fill ? 'h-full min-h-28' : 'aspect-[16/9] max-h-[30dvh] lg:aspect-[4/3] lg:max-h-none',
        WORLD_BG[world],
        className,
      )}
    >
      {media && (stage || picture) && (
        <div aria-hidden className="absolute inset-0 opacity-30">
          <MediaImage media={media} alt="" sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
      )}
      {stage ? (
        <div key={stageKey} data-stage="" className="nx-stage-in absolute inset-0 flex items-center justify-center overflow-hidden p-2">
          {stage}
        </div>
      ) : (
      <div className="absolute inset-0">
        {media ? (
          <MediaImage media={media} sizes="(min-width: 1024px) 50vw, 100vw" priority />
        ) : src ? (
          <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div role="img" aria-label={alt} className="size-full">
            <WorldScene world={world} variant="hero" mood={mood} />
          </div>
        )}
      </div>
      )}
      {picture && <div className="absolute inset-0 flex items-center justify-center overflow-auto p-2">{picture}</div>}
      {children && <div className="absolute inset-0">{children}</div>}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"
      />
    </div>
  );
}
