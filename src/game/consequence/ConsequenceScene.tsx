'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useReducedMotion } from '@/platform/motion';
import { useSound, type SoundName } from '@/platform/audio';
import type { WorldId } from '@/data/api/types';
import { Mascot, type MascotPose } from '@/game/mascot';
import { ITEMS } from '@/game/scene-picture';
import { SCENE_BY_ID, SKIN } from './catalog';
import type { Rig } from './catalog';
import type { Piece, Sim } from './sim';

const SOUND: Record<Rig, { ok: SoundName; ko: SoundName }> = {
  tower: { ok: 'beat_success', ko: 'collapse' },
  bridge: { ok: 'sparkle', ko: 'drop' },
  scale: { ok: 'tick', ko: 'pluck' },
  jug: { ok: 'glass', ko: 'drop' },
  shelf: { ok: 'sparkle', ko: 'drop' },
  collide: { ok: 'chapter_complete', ko: 'pluck' },
};

// Surfaces are soft lit gradients in real wood, stone and water colours; the objects themselves are photographs.
const SURFACE: Record<Exclude<Piece['kind'], 'photo'>, CSSProperties> = {
  wood: { background: 'repeating-linear-gradient(92deg, rgb(255 255 255 / .05) 0 2px, rgb(0 0 0 / .05) 2px 5px), linear-gradient(180deg, #c89a68, #8d6137)', borderRadius: '.5cqw', boxShadow: '0 .6cqw 1.2cqw rgb(0 0 0 / .35), inset 0 .2cqw .3cqw rgb(255 255 255 / .35)' },
  stone: { background: 'radial-gradient(circle at 30% 25%, rgb(255 255 255 / .25), transparent 55%), linear-gradient(180deg, #a9a49b, #6f6a62)', borderRadius: '.8cqw', boxShadow: 'inset 0 .3cqw .5cqw rgb(255 255 255 / .3), 0 .6cqw 1.2cqw rgb(0 0 0 / .3)' },
  chasm: { background: 'linear-gradient(180deg, #2c2a27, #0d0c0a)', boxShadow: 'inset 0 1.4cqw 1.6cqw rgb(0 0 0 / .6)' },
  glass: { background: 'linear-gradient(100deg, rgb(255 255 255 / .35), rgb(255 255 255 / .06) 40%, rgb(255 255 255 / .22))', border: '.35cqw solid rgb(255 255 255 / .7)', borderRadius: '1cqw 1cqw 2.4cqw 2.4cqw', boxShadow: '0 .6cqw 1.2cqw rgb(0 0 0 / .25)' },
  water: { background: 'linear-gradient(180deg, rgb(120 190 235 / .85), rgb(40 120 190 / .9))', borderRadius: '.4cqw' },
  zone: { border: '.4cqw dashed rgb(255 255 255 / .85)', borderRadius: '.8cqw', background: 'rgb(255 255 255 / .12)' },
};

const tf = (p: { x: number; y: number; r: number }, w: number, h: number) => `translate(${(p.x - w / 2).toFixed(2)}cqw, ${(p.y - h / 2).toFixed(2)}cqw) rotate(${p.r.toFixed(3)}rad)`;

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

/**
 * The consequence of an answer, simulated: matter-js (lazy-loaded) runs real gravity, mass, friction, collisions and
 * constraints on a fixed 1/60 s step, and the outcome comes out of it. The loop stops when everything is at rest.
 * Reduced motion runs the same simulation without drawing and shows the resting picture. Numa reacts bottom right.
 */
export function ConsequenceScene({ sceneId, world, seed = 4, playing = true, onDone, showCaption = true, className }: ConsequenceSceneProps) {
  const t = useTranslations('game.consequence');
  const def = SCENE_BY_ID.get(sceneId);
  const reduced = useReducedMotion();
  const { play } = useSound();
  const [sim, setSim] = useState<Sim | null>(null);
  const [settled, setSettled] = useState(false);
  const els = useRef<(HTMLElement | null)[]>([]);
  const skip = useRef<() => void>(() => {});
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (!def) return;
    let live = true;
    let raf = 0;
    // a new scene starts from nothing drawn
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSim(null);
    setSettled(false);
    import('./sim').then(({ createSim, settle, STEP_MS }) => {
      if (!live) return;
      const s = createSim(def.rig, def.good, seed, def.id);
      setSim(s);
      // ask again here: the hook reads the setting after the first paint and no motion may start at all under reduced motion
      const calm = !playing || reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
      const paint = () =>
        s.pieces.forEach((p, i) => {
          const el = els.current[i];
          const pose = s.pose(p);
          if (!el) return;
          if (!pose) el.style.display = 'none';
          else {
            el.style.display = '';
            el.style.transform = tf(pose, p.w, p.h);
          }
        });
      const finish = () => {
        paint();
        setSettled(true);
        if (playing) done.current?.();
      };
      skip.current = () => {
        cancelAnimationFrame(raf);
        settle(s);
        finish();
      };
      let last = performance.now();
      let acc = 0;
      if (!calm) play(SOUND[def.rig][def.good ? 'ok' : 'ko']);
      const tick = (now: number) => {
        if (!live) return;
        if (calm) {
          // same physics, nothing drawn until it rests; a slice of 8 ms per frame keeps the page responsive
          const t0 = performance.now();
          while (!s.settled && performance.now() - t0 < 8) s.step();
          if (s.settled) return finish();
        } else {
          acc += Math.min(now - last, 50);
          last = now;
          const t0 = performance.now();
          let n = 0;
          // never more than 10 ms of physics per frame: a slow phone sees slow motion, not a stutter
          while (acc >= STEP_MS && n < 3 && !s.settled && (n === 0 || performance.now() - t0 < 10)) {
            s.step();
            acc -= STEP_MS;
            n++;
          }
          if (acc >= STEP_MS) acc = 0;
          paint();
          (window as unknown as { __nxWork?: number[] }).__nxWork?.push(performance.now() - t0); // test hook: our own work per frame
          if (s.settled) return finish();
        }
        raf = requestAnimationFrame(tick);
      };
      paint();
      raf = requestAnimationFrame(tick);
    });
    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, [def, seed, playing, reduced, play]);
  if (!def) return null;
  const caption = t(`caption.${def.rig}.${def.good ? 'ok' : 'ko'}`);
  const skin = SKIN[def.family];
  const slug = (slot: 0 | 1 = 0) => (slot === 0 ? skin[0] : seed % 2 === 0 ? ITEMS[world][0] : skin[1]);
  const pose: MascotPose = !settled ? 'curious' : sim && sim.verdict() ? 'cheer' : 'think';
  return (
    <figure className={cn('flex size-full flex-col items-center justify-center gap-1', className)}>
      <button type="button" onClick={() => skip.current()} aria-label={t('skip')} className="relative block min-h-0 w-full flex-1 overflow-hidden rounded-lg [container-type:size]">
        <span
          aria-hidden
          data-scene={def.id}
          data-settled={settled ? '' : undefined}
          className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg [container-type:inline-size]"
          style={{ width: 'min(100cqw, 177.78cqh)', aspectRatio: '16 / 9', background: `linear-gradient(180deg, rgb(20 20 20 / .1), rgb(20 20 20 / .35)), url(/worlds/${world}-480.webp) center / cover` }}
        >
          {sim?.pieces.map((p, i) => {
            const pz = sim.pose(p);
            const surf = p.kind === 'photo' ? { filter: 'drop-shadow(0 .5cqw .6cqw rgb(0 0 0 / .4))' } : { ...SURFACE[p.kind], ...(p.round ? { borderRadius: '50%' } : null) };
            return (
              <span
                key={p.id}
                ref={(el) => {
                  els.current[i] = el;
                }}
                data-kind={p.kind}
                className="absolute left-0 top-0 block will-change-transform"
                style={{ width: `${p.w}cqw`, height: `${p.h}cqw`, display: pz ? undefined : 'none', transform: pz ? tf(pz, p.w, p.h) : undefined, ...surf }}
              >
                {p.kind === 'photo' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/objects/${slug(p.slot)}-256.webp`} alt="" draggable={false} className={cn('size-full object-cover', p.round ? 'rounded-full' : 'rounded-[22%]')} />
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
