'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { MediaItem } from '@/data/api/types';
import { useReducedMotion } from '@/platform/motion';
import { useSaveData } from '@/platform/network';
import { cn } from '@/shared/cn';
import { Icon } from '@/ui/icon';

export type FeedVideoProps = {
  media: MediaItem;
  /** Close to the screen: the browser may fetch the first bytes. Far away: nothing is fetched. */
  near: boolean;
};

const ROUND = 'flex size-11 items-center justify-center rounded-full bg-black/60 text-white shadow-2 backdrop-blur-sm transition-transform active:scale-95 focus-visible:outline-offset-2';

/**
 * A short video or animation. Plays muted and looping only while it is on screen (at least 60%), pauses when it
 * leaves. With reduced motion or data saver it shows the poster and waits for a tap. Sound is off until the child
 * taps the sound button; captions (fr-CA and en-CA tracks) start on and can be hidden.
 */
export function FeedVideo({ media, near }: FeedVideoProps) {
  const t = useTranslations('game.mediaCard');
  const lang = useLocale().startsWith('en') ? 'en-CA' : 'fr-CA';
  const reduced = useReducedMotion();
  const saveData = useSaveData();
  const still = reduced || saveData;
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [wantsPlay, setWantsPlay] = useState(false); // the child tapped play (needed when still)
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [failed, setFailed] = useState(0); // number of failed loads of this clip
  const [blocked, setBlocked] = useState(false); // the browser refused to start the video by itself
  const isVideo = media.media_kind === 'video';
  const tracks = media.captions ?? [];

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Play while in view (never while still, unless tapped); pause the moment it leaves the screen.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (visible && (!still || wantsPlay)) {
      v.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else {
      v.pause();
    }
  }, [visible, still, wantsPlay, failed]);

  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);

  // Show the caption track of the child's language, or none
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    for (let i = 0; i < v.textTracks.length; i++) {
      const tr = v.textTracks[i]!;
      tr.mode = captionsOn && tr.language === lang.slice(0, 2) ? 'showing' : 'hidden';
    }
  }, [captionsOn, lang, failed]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      setWantsPlay(true);
      v.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else {
      setWantsPlay(false);
      v.pause();
    }
  };
  const showPlay = !playing && (still || blocked);

  return (
    <div ref={box} className="absolute inset-0 bg-sunken">
      {failed < 3 ? (
        <video
          key={failed}
          ref={video}
          className="size-full object-cover"
          poster={media.poster}
          preload={near ? 'metadata' : 'none'}
          muted
          loop
          playsInline
          aria-label={media.alt}
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setFailed((n) => n + 1)}
        >
          <source src={media.src} type="video/mp4" />
          {tracks.map((c) => (
            <track key={c.lang} kind="captions" src={c.src} srcLang={c.lang.slice(0, 2)} label={c.label} />
          ))}
        </video>
      ) : null}
      {failed >= 3 && (
        <div role="alert" className="flex size-full flex-col items-center justify-center gap-3 bg-sunken p-4 text-center">
          <p className="font-display text-lg font-semibold text-fg">{t('mediaError')}</p>
          <button type="button" onClick={() => setFailed(0)} className="min-h-11 rounded-full bg-brand px-5 font-display font-semibold text-brand-fg shadow-1">
            {t('retry')}
          </button>
        </div>
      )}
      {failed < 3 && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/45 to-transparent p-3 pt-8">
          <button type="button" onClick={toggle} aria-label={playing ? t('pause') : t('play')} className={cn(ROUND, showPlay && 'size-14')}>
            <Icon name={playing ? 'pause' : 'play'} size={showPlay ? 30 : 22} />
          </button>
          <div className="flex gap-2">
            {isVideo && tracks.length > 0 && (
              <button
                type="button"
                aria-pressed={captionsOn}
                aria-label={captionsOn ? t('captionsOn') : t('captionsOff')}
                onClick={() => setCaptionsOn((c) => !c)}
                className={cn(ROUND, !captionsOn && 'opacity-80')}
              >
                <Icon name="captions" size={22} />
              </button>
            )}
            {media.has_audio && (
              <button type="button" aria-pressed={!muted} aria-label={muted ? t('soundOn') : t('soundOff')} onClick={() => setMuted((m) => !m)} className={ROUND}>
                <Icon name={muted ? 'volume-off' : 'volume'} size={22} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
