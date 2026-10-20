'use client';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useReducedMotion } from '@/platform/motion';
import { useSound, type SoundName } from '@/platform/audio';
import type { WorldId } from '@/data/api/types';
import { Mascot, type MascotPose } from '@/game/mascot';
import { ITEMS } from '@/game/scene-picture';
import { SCENE_BY_ID, SKIN } from './catalog';
import type { Rig } from './catalog';
import { amountOf, type Amount } from './amounts';
import type { Piece, Sim } from './sim';

const SOUND: Record<Rig, { ok: SoundName; ko: SoundName }> = {
  tower: { ok: 'beat_success', ko: 'collapse' },
  bridge: { ok: 'sparkle', ko: 'drop' },
  scale: { ok: 'tick', ko: 'pluck' },
  jug: { ok: 'glass', ko: 'drop' },
  shelf: { ok: 'sparkle', ko: 'drop' },
  collide: { ok: 'chapter_complete', ko: 'pluck' },
};

// Surfaces are real photographed textures (public/textures: wood, stone, glass, water, cloth; credits in public/LICENSES.md),
// tinted and lit with a soft gradient. The objects themselves are photographs too.
const lit = 'linear-gradient(180deg, rgb(255 255 255 / .2), rgb(0 0 0 / .26))';
const SURFACE: Record<Exclude<Piece['kind'], 'photo'> | 'cloth', CSSProperties> = {
  wood: { backgroundImage: `${lit}, url(/textures/wood.webp)`, backgroundSize: 'auto, 46cqw', backgroundColor: '#d8a468', backgroundBlendMode: 'normal, multiply', borderRadius: '.5cqw', boxShadow: '0 .6cqw 1.2cqw rgb(0 0 0 / .35), inset 0 .2cqw .3cqw rgb(255 255 255 / .35)' },
  cloth: { backgroundImage: `${lit}, url(/textures/cloth.webp)`, backgroundSize: 'auto, 40cqw', backgroundColor: '#c9a15a', backgroundBlendMode: 'normal, multiply', borderRadius: '.5cqw', boxShadow: '0 .6cqw 1.2cqw rgb(0 0 0 / .3)' },
  stone: { backgroundImage: `${lit}, url(/textures/stone.webp)`, backgroundSize: 'auto, 34cqw', backgroundColor: '#bdb8ae', backgroundBlendMode: 'normal, multiply', borderRadius: '.8cqw', boxShadow: 'inset 0 .3cqw .5cqw rgb(255 255 255 / .3), 0 .6cqw 1.2cqw rgb(0 0 0 / .3)' },
  chasm: { backgroundImage: 'linear-gradient(180deg, #2c2a27, #0d0c0a), url(/textures/stone.webp)', backgroundSize: 'auto, 30cqw', backgroundBlendMode: 'multiply', boxShadow: 'inset 0 1.4cqw 1.6cqw rgb(0 0 0 / .6)' },
  // glass lets the scene through: the photographed glass only adds its reflections to what is behind
  glass: { backgroundImage: 'linear-gradient(100deg, rgb(255 255 255 / .3), rgb(255 255 255 / .05) 40%, rgb(255 255 255 / .2)), url(/textures/glass.webp)', backgroundSize: 'auto, cover', border: '.35cqw solid rgb(255 255 255 / .7)', borderRadius: '1cqw 1cqw 2.4cqw 2.4cqw', boxShadow: '0 .6cqw 1.2cqw rgb(0 0 0 / .25)', opacity: 0.55 },
  water: { backgroundImage: 'radial-gradient(circle at 35% 30%, rgb(255 255 255 / .55), transparent 55%), url(/textures/water.webp)', backgroundSize: 'auto, 600%', backgroundColor: '#3a86c4', backgroundBlendMode: 'normal, multiply', borderRadius: '50%' },
  zone: { border: '.4cqw dashed rgb(255 255 255 / .85)', borderRadius: '.8cqw', background: 'rgb(255 255 255 / .12)' },
};

/** Drawn size: liquid discs are a little bigger than their bodies so the filter can merge them. */
const dim = (p: Piece): [number, number] => (p.kind === 'water' ? [p.w * 1.35, p.h * 1.35] : [p.w, p.h]);
const tf = (p: { x: number; y: number; r: number }, w: number, h: number) => `translate(${(p.x - w / 2).toFixed(2)}cqw, ${(p.y - h / 2).toFixed(2)}cqw) rotate(${p.r.toFixed(3)}rad)`;

export type ConsequenceSceneProps = {
  /** Scene id from the picker, e.g. "addsub.tower.ko". */
  sceneId: string;
  world: WorldId;
  /** The right amount and the child's wrong one (see amountOf). Same numbers, same picture. */
  amount?: Amount;
  /** False draws the finished picture, no sound. */
  playing?: boolean;
  /** True: run the simulation without drawing it and show the resting picture (admin kill switch for physics, like reduced motion). */
  still?: boolean;
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
export function ConsequenceScene({ sceneId, world, amount, playing = true, still = false, onDone, showCaption = true, className }: ConsequenceSceneProps) {
  const t = useTranslations('game.consequence');
  const locale = useLocale();
  const goo = `nx-goo-${useId().replace(/:/g, '')}`;
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
      const s = createSim(def.rig, def.good, amount ?? amountOf(), def.id);
      setSim(s);
      // ask again here: the hook reads the setting after the first paint and no motion may start at all under reduced motion
      const calm = !playing || still || reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
      const paint = () =>
        s.pieces.forEach((p, i) => {
          const el = els.current[i];
          const pose = s.pose(p);
          if (!el) return;
          if (!pose) el.style.display = 'none';
          else {
            el.style.display = '';
            el.style.transform = tf(pose, ...dim(p));
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
  }, [def, amount, playing, still, reduced, play]);
  if (!def) return null;
  const A = amount ?? amountOf();
  const fmt = (n: number | null) => (n === null ? '' : new Intl.NumberFormat(locale).format(Math.abs(n)));
  // with real numbers the caption names them; without (a word answer) it says what the picture shows
  const caption =
    A.right !== null && (def.good || A.given !== null)
      ? t(`numbers.${def.rig}.${def.good ? 'ok' : A.over && def.rig !== 'bridge' ? 'over' : 'under'}`, { right: fmt(A.right), given: fmt(A.given) })
      : t(`caption.${def.rig}.${def.good ? 'ok' : 'ko'}`);
  const skin = SKIN[def.family];
  const slug = (slot: 0 | 1 = 0) => (slot === 0 ? skin[0] : A.a % 2 === 0 ? ITEMS[world][0] : skin[1]);
  const piece = (p: Piece, i: number) => {
    const [w, h] = dim(p);
    const pz = sim!.pose(p);
    const cloth = p.id === 'floor' && (def.family === 'number' || def.family === 'fractions');
    const surf = p.kind === 'photo' ? { filter: 'drop-shadow(0 .5cqw .6cqw rgb(0 0 0 / .4))' } : { ...SURFACE[cloth ? 'cloth' : p.kind], ...(p.round && p.kind !== 'water' ? { borderRadius: '50%' } : null) };
    return (
      <span
        key={p.id}
        ref={(el) => {
          els.current[i] = el;
        }}
        data-kind={p.kind}
        className="absolute left-0 top-0 block will-change-transform"
        style={{ width: `${w}cqw`, height: `${h}cqw`, display: pz ? undefined : 'none', transform: pz ? tf(pz, w, h) : undefined, ...surf }}
      >
        {p.kind === 'photo' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/objects/${slug(p.slot)}-256.webp`} alt="" draggable={false} className={cn('size-full object-cover', p.round ? 'rounded-full' : 'rounded-[22%]')} />
        )}
      </span>
    );
  };
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
          {sim && (
            <svg width="0" height="0" aria-hidden className="absolute">
              <filter id={goo} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation="2" />
                <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" />
              </filter>
            </svg>
          )}
          {/* floor, props and objects; then the liquid (one soft filter merges its discs into one body of water); then the glass and the marks in front */}
          {sim?.pieces.map((p, i) => (p.kind === 'water' || p.kind === 'glass' || p.kind === 'zone' ? null : piece(p, i)))}
          <span className="absolute inset-0 block" style={{ filter: `url(#${goo})` }}>
            {sim?.pieces.map((p, i) => (p.kind === 'water' ? piece(p, i) : null))}
          </span>
          {sim?.pieces.map((p, i) => (p.kind === 'glass' || p.kind === 'zone' ? piece(p, i) : null))}
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
