'use client';
import { memo, ViewTransition, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { useParallax, useTilt } from '@/platform/motion';
import type { World } from '@/data/api/types';
import { MediaImage } from '@/game/media-image';
import { Mascot } from '@/game/mascot';
import { Icon } from '@/ui/icon';
import { WorldBackdrop } from './WorldBackdrop';

export type WorldCardProps = {
  world: World;
  /** Not in the child's enabled worlds: dimmed, with a lock. Still focusable so the screen can explain it. */
  locked?: boolean;
  /** 0 to 1 share of the world's path the child has mastered. Null while unknown. */
  progress?: number | null;
  /** The world the owl suggests next. */
  suggested?: boolean;
  /** Load the photo at once (first screenful only). */
  priority?: boolean;
  onSelect: (world: World) => void;
  className?: string;
};

const R = 17;
const C = 2 * Math.PI * R;

function Ring({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <span role="img" aria-label={label} className="absolute end-2 top-2 flex size-11 items-center justify-center rounded-full bg-black/55">
      <svg viewBox="0 0 40 40" className="size-10 -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={R} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          stroke="#fff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${C * v} ${C}`}
          style={{ transition: 'stroke-dasharray 700ms var(--ease-out)' }}
        />
      </svg>
      {v >= 1 && <Icon name="star" size={16} className="absolute text-white" />}
    </span>
  );
}

/** One world of the map: its real photo under a soft gradient, a progress ring and a lock when it is off. */
function WorldCardBase({ world, locked = false, progress = null, suggested = false, priority = false, onSelect, className }: WorldCardProps) {
  const t = useTranslations('game.worldCard');
  const { play } = useSound();
  const parallax = useParallax<HTMLSpanElement>(8);
  const tilt = useTilt<HTMLButtonElement>(4);
  const pct = progress == null ? null : Math.round(progress * 100);
  const sub = locked ? t('locked') : pct === null ? world.tagline : t('progress', { pct });

  return (
    <button
      ref={tilt}
      type="button"
      data-world={world.id}
      data-locked={locked || undefined}
      onClick={() => {
        play(locked ? 'close' : 'select');
        onSelect(world);
      }}
      style={{ transform: 'perspective(700px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))' } as CSSProperties}
      className={cn(
        'lift group relative block aspect-[4/5] min-h-11 w-full overflow-hidden rounded-lg border-2 border-line bg-sunken text-start text-white shadow-2 will-change-transform',
        suggested && 'ring-4 ring-brand/70',
        className,
      )}
    >
      <ViewTransition name={`world-${world.id}`} share="auto">
        <span ref={parallax} className="absolute -inset-3 block" style={{ transform: 'translate3d(var(--px,0px),var(--py,0px),0)' }}>
          {world.hero ? (
            <MediaImage media={world.hero} alt="" priority={priority} sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw" />
          ) : (
            <WorldBackdrop world={world.id} accent={world.accent_color} />
          )}
        </span>
      </ViewTransition>
      {/* Gradient keeps white text above AA contrast on any photo */}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
      {locked && <span aria-hidden className="absolute inset-0 bg-black/45 backdrop-grayscale" />}
      {locked ? (
        <span className="absolute end-2 top-2 flex size-11 items-center justify-center rounded-full bg-black/60">
          <Icon name="lock" size={20} title={t('locked')} />
        </span>
      ) : (
        pct !== null && <Ring value={progress ?? 0} label={t('progress', { pct })} />
      )}
      {suggested && !locked && (
        <span className="pointer-events-none absolute start-1 top-1">
          <Mascot pose="wave" size="sm" decorative />
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
        <span className="font-display text-xl font-bold leading-tight drop-shadow">{world.name}</span>
        <span className="line-clamp-2 text-sm leading-snug text-white/90">{sub}</span>
      </span>
    </button>
  );
}

export const WorldCard = memo(WorldCardBase);
