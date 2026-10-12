import Image from 'next/image';
import { cn } from '@/lib/cn';
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

const MOOD: Record<IllustrationMood, string> = {
  idle: '',
  success: 'nx-pop',
  detour: 'nx-rise',
  surprise: 'nx-pulse',
};

export type IllustrationFrameProps = {
  world: WorldId;
  src?: string | null;
  alt: string;
  mood?: IllustrationMood;
  className?: string;
};

export function IllustrationFrame({ world, src, alt, mood = 'idle', className }: IllustrationFrameProps) {
  return (
    <div
      className={cn(
        'relative aspect-[16/9] max-h-[30dvh] w-full overflow-hidden rounded-lg shadow-2 lg:aspect-[4/3] lg:max-h-none',
        WORLD_BG[world],
        className,
      )}
    >
      <div className={cn('absolute inset-0 flex items-center justify-center', MOOD[mood])}>
        {src ? (
          <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        ) : (
          <span role="img" aria-label={alt} className="select-none text-[6rem] leading-none drop-shadow">
            {WORLD_EMOJI[world]}
          </span>
        )}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"
      />
    </div>
  );
}
