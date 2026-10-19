'use client';
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/shared/cn';
import type { MediaRef } from '@/data/api/types';

export type MediaImageProps = {
  media: MediaRef;
  /** `sizes` attribute: what width the browser will show it at. Default is the full viewport. */
  sizes?: string;
  /** Above-the-fold image: eager load and high fetch priority (one per screen at most). */
  priority?: boolean;
  /** Alt override. Decorative images pass an empty string. */
  alt?: string;
  fit?: 'cover' | 'contain';
  className?: string;
  style?: CSSProperties;
};

/** The widest variant, used as `src` for browsers that ignore srcset. */
export function widest(media: MediaRef): string {
  const sorted = [...media.srcset].sort((a, b) => b.w - a.w);
  return sorted[0]?.url ?? '';
}

/** The picture that stands for a world: its hero, else the first scene (a hero is only set once art is approved). */
export function heroOf(world: { hero?: MediaRef; scenes?: MediaRef[] }): MediaRef | undefined {
  return world.hero ?? world.scenes?.[0];
}

export function toSrcSet(media: MediaRef): string {
  return media.srcset.map((s) => `${s.url} ${s.w}w`).join(', ');
}

/**
 * A server image with a dominant-colour background, a blurred tiny preview (LQIP) and a responsive srcset.
 * The sharp image fades in over the preview once loaded. The bytes are immutable, so the browser keeps them.
 * Shows only the colour and preview when the file cannot load: never a broken-image icon.
 */
function MediaImageBase({ media, sizes = '100vw', priority = false, alt, fit = 'cover', className, style }: MediaImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = alt ?? media.alt;

  // A cached image can finish before React attaches onLoad
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <span
      data-loaded={loaded || undefined}
      data-failed={failed || undefined}
      className={cn('relative block size-full overflow-hidden', className)}
      style={{ backgroundColor: media.color, ...style }}
    >
      {media.lqip && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          aria-hidden
          alt=""
          src={media.lqip}
          className={cn('absolute inset-0 size-full scale-110 blur-xl', fit === 'cover' ? 'object-cover' : 'object-contain')}
        />
      )}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          alt={label}
          src={widest(media)}
          srcSet={toSrcSet(media)}
          sizes={sizes}
          width={media.width}
          height={media.height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'absolute inset-0 size-full transition-opacity duration-300 motion-reduce:transition-none',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </span>
  );
}

/** Responsive server image with colour, blurred preview and fade-in. */
export const MediaImage = memo(MediaImageBase);
