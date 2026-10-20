'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { animate } from 'motion/mini';
import { cn } from '@/shared/cn';
import { useReducedMotion } from '@/platform/motion';
import { useSound, type SoundName } from '@/platform/audio';
import type { WorldId } from '@/data/api/types';
import { Mascot, type MascotPose } from '@/game/mascot';
import { ITEMS } from '@/game/scene-picture';
import { SCENE_BY_ID, SKIN } from './catalog';
import { DT } from './physics';
import { buildBodies, type Body, type Rig } from './rigs';

const SOUND: Record<Rig, { ok: SoundName; ko: SoundName }> = {
  tower: { ok: 'beat_success', ko: 'collapse' },
  bridge: { ok: 'sparkle', ko: 'drop' },
  scale: { ok: 'tick', ko: 'pluck' },
  jug: { ok: 'glass', ko: 'drop' },
  shelf: { ok: 'sparkle', ko: 'drop' },
  collide: { ok: 'chapter_complete', ko: 'pluck' },
};

// Surfaces are soft lit gradients in real wood, stone and water colours; the objects themselves are photographs.
const SURFACE: Record<Exclude<Body['kind'], 'photo'>, CSSProperties> = {
  wood: { background: 'repeating-linear-gradient(92deg, rgb(255 255 255 / .05) 0 2px, rgb(0 0 0 / .05) 2px 5px), linear-gradient(180deg, #c89a68, #8d6137)', borderRadius: '.5cqw', boxShadow: '0 .6cqw 1.2cqw rgb(0 0 0 / .35), inset 0 .2cqw .3cqw rgb(255 255 255 / .35)' },
  stone: { background: 'radial-gradient(circle at 30% 25%, rgb(255 255 255 / .25), transparent 55%), linear-gradient(180deg, #a9a49b, #6f6a62)', borderRadius: '.8cqw', boxShadow: 'inset 0 .3cqw .5cqw rgb(255 255 255 / .3), 0 .6cqw 1.2cqw rgb(0 0 0 / .3)' },
  chasm: { background: 'linear-gradient(180deg, #2c2a27, #0d0c0a)', boxShadow: 'inset 0 1.4cqw 1.6cqw rgb(0 0 0 / .6)' },
  glass: { background: 'linear-gradient(100deg, rgb(255 255 255 / .35), rgb(255 255 255 / .06) 40%, rgb(255 255 255 / .22))', border: '.35cqw solid rgb(255 255 255 / .7)', borderRadius: '1cqw 1cqw 2.4cqw 2.4cqw', boxShadow: '0 .6cqw 1.2cqw rgb(0 0 0 / .25)' },
  water: { background: 'linear-gradient(180deg, rgb(120 190 235 / .85), rgb(40 120 190 / .9))', borderRadius: '.4cqw' },
  drop: { background: 'radial-gradient(circle at 35% 30%, #fff, rgb(70 150 215))', borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' },
  zone: { border: '.4cqw dashed rgb(255 255 255 / .85)', borderRadius: '.8cqw', background: 'rgb(255 255 255 / .12)' },
  string: { background: '#e2d8c3' },
};

const tf = (f: { x: number; y: number; r: number; sy: number }, b: Body) =>
  `translate(${(f.x - b.w / 2).toFixed(2)}cqw, ${(f.y - b.h / 2).toFixed(2)}cqw) rotate(${f.r.toFixed(1)}deg) scaleY(${f.sy.toFixed(3)})`;

export type ConsequenceSceneProps = {
  /** Scene id from the picker, e.g. "addsub.tower.ko". */
  sceneId: string;
  world: WorldId;
  /** Varies the set-up (how many pieces, which side). Same number, same picture. */
  seed?: number;
  /** False draws the finished picture, no sound. */
  playing?: boolean;
  /** Fires when everything came to rest (at once under reduced motion) or the child taps to skip. */
  onDone?: () => void;
  showCaption?: boolean;
  className?: string;
};

/** The consequence of an answer, shown with physics: the thing stands or breaks. Numa reacts bottom right. */
export function ConsequenceScene({ sceneId, world, seed = 4, playing = true, onDone, showCaption = true, className }: ConsequenceSceneProps) {
  const t = useTranslations('game.consequence');
  const def = SCENE_BY_ID.get(sceneId);
  const reduced = useReducedMotion();
  const { play } = useSound();
  const bodies = useMemo(() => (def ? buildBodies(def.rig, def.good, seed) : []), [def, seed]);
  const els = useRef<(HTMLElement | null)[]>([]);
  const ctl = useRef<{ complete(): void }[]>([]);
  const done = useRef(onDone);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  const animated = playing && !reduced;
  useEffect(() => {
    if (!def) return;
    // the hook above reads the setting after the first paint, so ask again here: no motion must start at all
    const calm = reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
    if (!playing || calm) {
      if (playing) done.current?.();
      return;
    }
    play(SOUND[def.rig][def.good ? 'ok' : 'ko']);
    let live = true;
    const runs = bodies.flatMap((b, i) => {
      const el = els.current[i];
      if (!el || b.frames.length < 2) return [];
      const f = b.frames.filter((_, k) => k % 2 === 0 || k === b.frames.length - 1);
      return [animate(el, { transform: f.map((fr) => tf(fr, b)) }, { duration: (b.frames.length - 1) * DT, ease: 'linear' })];
    });
    ctl.current = runs;
    Promise.all(runs.map((r) => r.finished))
      .then(() => {
        if (!live) return;
        setSettled(true);
        done.current?.();
      })
      .catch(() => {});
    return () => {
      live = false;
      runs.forEach((r) => r.cancel());
    };
  }, [def, bodies, animated, playing, play]);
  if (!def) return null;
  const caption = t(`caption.${def.rig}.${def.good ? 'ok' : 'ko'}`);
  const skin = SKIN[def.family];
  const slug = (slot: 0 | 1 = 0) => (slot === 0 ? skin[0] : seed % 2 === 0 ? ITEMS[world][0] : skin[1]);
  const pose: MascotPose = !settled && animated ? 'curious' : def.good ? 'cheer' : 'think';
  return (
    <figure className={cn('flex size-full flex-col items-center justify-center gap-1', className)}>
      <button
        type="button"
        onClick={() => ctl.current.forEach((c) => c.complete())}
        aria-label={t('skip')}
        className="relative block min-h-0 w-full flex-1 overflow-hidden rounded-lg [container-type:size]"
      >
        <span
          aria-hidden
          data-scene={def.id}
          className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg [container-type:inline-size]"
          style={{ width: 'min(100cqw, 177.78cqh)', aspectRatio: '16 / 9', background: `linear-gradient(180deg, rgb(20 20 20 / .1), rgb(20 20 20 / .35)), url(/worlds/${world}-480.webp) center / cover` }}
        >
          {bodies.map((b, i) => {
            const fin = b.frames[b.frames.length - 1];
            return (
              <span
                key={b.id}
                ref={(el) => {
                  els.current[i] = el;
                }}
                className="absolute left-0 top-0 block will-change-transform"
                style={{ width: `${b.w}cqw`, height: `${b.h}cqw`, transform: tf(fin, b), ...(b.kind === 'photo' ? { filter: 'drop-shadow(0 .5cqw .6cqw rgb(0 0 0 / .4))' } : SURFACE[b.kind]) }}
              >
                {b.kind === 'photo' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/objects/${slug(b.slot)}-256.webp`} alt="" draggable={false} className="size-full rounded-[22%] object-cover" />
                )}
              </span>
            );
          })}
        </span>
        <span aria-hidden className="absolute bottom-1 end-2">
          <Mascot pose={pose} size="sm" decorative />
        </span>
      </button>
      <figcaption data-caption="" aria-hidden={!showCaption} className={cn('text-center font-display text-lg text-fg transition-opacity duration-300', !showCaption && 'opacity-0')}>
        {caption}
      </figcaption>
    </figure>
  );
}
