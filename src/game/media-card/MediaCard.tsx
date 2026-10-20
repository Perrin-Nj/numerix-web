'use client';
import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MediaItem } from '@/data/api/types';
import { Mascot } from '@/game/mascot';
import { ReactionBar, type ReactionState } from '@/game/reaction-bar';
import { Button } from '@/ui/button';
import { FeedPhoto } from './FeedPhoto';
import { FeedVideo } from './FeedVideo';

export type MediaCardProps = {
  media: MediaItem;
  liked: boolean;
  saved: boolean;
  onReact: (next: ReactionState) => void;
  /** Close to the screen: the clip may fetch its first bytes. */
  near?: boolean;
};

function MediaCardBase({ media, liked, saved, onReact, near = true }: MediaCardProps) {
  const t = useTranslations('game.mediaCard');
  const [revealed, setRevealed] = useState(false);
  return (
    <article aria-label={media.title} data-media={media.media_kind} className="overflow-hidden rounded-lg bg-elevated shadow-2">
      <div className="relative aspect-[4/3] w-full">
        {media.media_kind === 'photo' ? <FeedPhoto media={media} /> : <FeedVideo media={media} near={near} />}
        <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-black/60 px-3 py-1 font-display text-sm font-semibold text-white backdrop-blur-sm">
          {t(`kind.${media.media_kind}`)}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-4 md:p-5">
        <h2 className="font-display text-2xl font-bold text-fg">{media.title}</h2>
        <p className="font-display text-lg text-fg">{media.caption}</p>
        {media.question && (
          <section aria-label={t('questionLabel')} className="flex flex-col gap-3 rounded-md bg-sunken p-3">
            <p className="font-display text-lg font-semibold text-fg">{media.question.prompt}</p>
            {revealed ? (
              <div aria-live="polite" className="flex items-center gap-3 rounded-md bg-brand-soft p-3">
                <Mascot pose="cheer" size="sm" decorative />
                <p className="font-display text-lg font-semibold text-brand-strong">
                  <span className="sr-only">{t('answer')}: </span>
                  {media.question.answer}
                </p>
              </div>
            ) : (
              <Button variant="secondary" aria-expanded={false} className="self-start" onClick={() => setRevealed(true)}>
                {t('reveal')}
              </Button>
            )}
          </section>
        )}
        <footer className="flex flex-col gap-2">
          <ReactionBar liked={liked} saved={saved} onChange={onReact} />
          <p className="text-sm text-muted">
            <span className="font-semibold">{t('credit')}:</span> {media.attribution}
          </p>
        </footer>
      </div>
    </article>
  );
}

/** A real-world photo, animation or short captioned video with a fun fact and an optional tap-to-reveal question. */
export const MediaCard = memo(MediaCardBase);
