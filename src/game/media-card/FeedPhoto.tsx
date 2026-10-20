'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MediaItem } from '@/data/api/types';
import { cn } from '@/shared/cn';

/** A real photo with blur-up: the tiny placeholder shows at once, the sharp image fades in when it has loaded. */
export function FeedPhoto({ media }: { media: MediaItem }) {
  const t = useTranslations('game.mediaCard');
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const small = media.src_small ?? media.src;
  return (
    <div className="absolute inset-0 bg-sunken">
      <div aria-hidden className="absolute inset-0 scale-110 blur-xl" style={{ backgroundImage: `url(${media.lqip})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element -- served by the API with immutable headers; next/image would re-encode it
        <img
          key={attempt}
          src={`${media.src}${attempt ? `?r=${attempt}` : ''}`}
          srcSet={attempt ? undefined : `${small} 480w, ${media.src} 960w`}
          sizes="(min-width: 700px) 672px, 100vw"
          width={media.width}
          height={media.height}
          alt={media.alt}
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn('relative size-full object-cover opacity-0 transition-opacity duration-300 motion-reduce:transition-none [:root[data-motion=reduced]_&]:transition-none', loaded && 'opacity-100')}
        />
      )}
      {failed && (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sunken/90 p-4 text-center">
          <p className="font-display text-lg font-semibold text-fg">{t('mediaError')}</p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setLoaded(false);
              setAttempt((n) => n + 1);
            }}
            className="min-h-11 rounded-full bg-brand px-5 font-display font-semibold text-brand-fg shadow-1"
          >
            {t('retry')}
          </button>
        </div>
      )}
    </div>
  );
}
