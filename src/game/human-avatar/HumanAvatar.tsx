import { createAvatar } from '@dicebear/core';
import * as openPeeps from '@dicebear/open-peeps';
import { cn } from '@/lib/cn';

export type HumanMood = 'neutral' | 'happy' | 'sad' | 'thinking';
export type HumanAvatarProps = {
  /** Same seed, same person. A child name, a hero name or a fixed id. */
  seed: string;
  /** Pixel size of the square. */
  size?: number;
  mood?: HumanMood;
  /** Accessible name. Omit for a decorative avatar. */
  label?: string;
  className?: string;
};

const FACE = {
  neutral: ['smile', 'cute', 'calm', 'smileBig', 'smileTeethGap'],
  happy: ['smileBig', 'smileLOL', 'smile'],
  sad: ['concerned'],
  thinking: ['calm', 'suspicious'],
} as const;

// Generated once per seed and mood (about 9 KB of SVG each), then reused. Local only, no network.
const cache = new Map<string, string>();

export function humanAvatarUri(seed: string, mood: HumanMood = 'neutral'): string {
  const key = `${mood}:${seed}`;
  let uri = cache.get(key);
  if (!uri) {
    const svg = createAvatar(openPeeps, {
      seed,
      face: [...FACE[mood]],
      mask: [],
      maskProbability: 0,
      facialHairProbability: 0,
      accessoriesProbability: 20,
    }).toString();
    uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    cache.set(key, uri);
  }
  return uri;
}

/** Open Peeps people (design CC0 1.0, code MIT), drawn locally from the seed. */
export function HumanAvatar({ seed, size = 48, mood = 'neutral', label, className }: HumanAvatarProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={humanAvatarUri(seed, mood)}
      width={size}
      height={size}
      alt={label ?? ''}
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={cn('shrink-0 select-none', className)}
      style={{ width: size, height: size }}
    />
  );
}
