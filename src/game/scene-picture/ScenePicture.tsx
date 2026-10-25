'use client';
import { useId, useMemo, type CSSProperties, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import type { MediaRef, WorldId } from '@/data/api/types';
import { MediaImage } from '@/game/media-image';
import { layoutFor, type Group, type Layout } from './layout';

/** Bundled real-object photos (public/objects) a world counts when the question brings none: two looks so the second group differs from the first. */
export const ITEMS: Record<WorldId, [string, string]> = {
  nature: ['acorn', 'pinecone'],
  espace: ['ringed-planet', 'rocket'],
  cuisine: ['cookie', 'red-apple'],
  sport: ['soccer-ball', 'tennis'],
  construction: ['hammer', 'wrench'],
  medecine: ['bandage', 'cat'],
  science: ['pebble', 'thermometer'],
  echecs: ['chess-pawn-b', 'chess-rook'],
  ocean: ['shell', 'tropical-fish'],
  dinosaures: ['t-rex', 'sauropod'],
  animaux: ['rabbit', 'turtle'],
  musique: ['drum', 'trumpet'],
  transport: ['bus', 'sailboat'],
  pirates: ['coin', 'sailboat'],
  marche: ['red-apple', 'banana'],
  meteo: ['umbrella', 'snowflake'],
  robots: ['robot', 'wrench'],
  arts: ['pencil', 'artist-palette'],
  hiver: ['snowflake', 'pinecone'],
  jeux: ['game-die', 'puzzle-piece'],
};

export type ScenePictureProps = {
  world: WorldId;
  skillId: string;
  numbers: number[];
  /** The sum as written ("63 ÷ 9 = ?"): the picture follows its operation. */
  mathText?: string;
  /** Server photo of the real object to count (media role "object"). */
  sprite?: MediaRef;
  className?: string;
};

type Glyph = string | MediaRef; // a string is the slug of a bundled object photo

type Tr = (key: string, values?: Record<string, string | number>) => string;

/** Alt text for the picture. `t` is useTranslations('game.scenePicture'). */
export function describePicture(t: Tr, world: WorldId, l: Layout): string {
  const it = (n: number) => t(`item.${world}`, { n });
  switch (l.kind) {
    case 'add':
      return t('alt.add', { a: l.a.total, ia: it(l.a.total), b: l.b.total, ib: it(l.b.total) });
    case 'sub':
      return t('alt.sub', { total: l.total, it: it(l.total), removed: l.removed });
    case 'missing':
      return t('alt.missing', { known: l.a.total, ik: it(l.a.total), missing: l.slots });
    case 'mul':
      return t('alt.mul', { rows: l.rows, cols: l.cols, it: it(l.cols) });
    case 'div':
      return t('alt.div', { total: l.total, it: it(l.total), bowls: l.bowls, rem: l.rem });
    case 'line':
      return t('alt.line', { value: l.value, max: l.max });
  }
}

const step = (n: number) => Math.min(1, 16 / Math.max(n, 1));
const cellStyle = (cell: number): CSSProperties => ({ fontSize: `${cell}cqw` });
const idxStyle = (i: number) => ({ '--i': i }) as CSSProperties;

function Item({ emoji, i, n, gone }: { emoji: Glyph; i: number; n: number; gone?: boolean }) {
  return (
    <span className="nx-pop-in-stagger inline-block leading-none" style={idxStyle(i * step(n))}>
      <span
        className={cn(
          'relative inline-block',
          gone && 'opacity-40 grayscale after:absolute after:inset-x-0 after:top-1/2 after:h-[0.07em] after:-rotate-[35deg] after:bg-fg',
        )}
      >
        <span className="inline-block size-[1em] overflow-hidden rounded-[22%] align-middle shadow-1">
          {typeof emoji === 'string' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/objects/${emoji}-256.webp`} alt="" draggable={false} loading="lazy" decoding="async" className="size-full object-cover" />
          ) : (
            <MediaImage media={emoji} alt="" fit="cover" sizes="64px" />
          )}
        </span>
      </span>
    </span>
  );
}

function Pile({ g, emoji, cell, start }: { g: Group; emoji: Glyph; cell: number; start: number }) {
  let i = start;
  return (
    <div className="flex flex-wrap items-start justify-center gap-[1.5cqw]" style={cellStyle(cell)}>
      {Array.from({ length: g.tens }, (_, b) => (
        <div key={b} className="grid grid-cols-5 gap-[0.05em] rounded-[0.3em] bg-elevated/70 shadow-1 p-[0.15em]">
          {Array.from({ length: 10 }, (_, k) => (
            <Item key={k} emoji={emoji} i={i++} n={g.total} />
          ))}
        </div>
      ))}
      {g.units > 0 && (
        <div className="grid grid-cols-5 gap-[0.05em] p-[0.15em]">
          {Array.from({ length: g.units }, (_, k) => (
            <Item key={k} emoji={emoji} i={i++} n={g.total} />
          ))}
        </div>
      )}
    </div>
  );
}

const Sign = ({ children }: { children: string }) => (
  <span aria-hidden className="font-display text-[8cqw] leading-none text-fg">
    {children}
  </span>
);

function NumberLine({ value, max }: { value: number; max: number }) {
  const x = 20 + (280 * Math.min(value, max)) / max;
  return (
    <svg viewBox="0 0 320 90" className="w-full" aria-hidden>
      <line x1={20} y1={55} x2={300} y2={55} stroke="currentColor" strokeWidth={3} strokeLinecap="round" className="text-fg" />
      {Array.from({ length: 11 }, (_, k) => (
        <line key={k} x1={20 + k * 28} y1={49} x2={20 + k * 28} y2={61} stroke="currentColor" strokeWidth={k % 5 === 0 ? 3 : 1.5} className="text-muted" />
      ))}
      <text x={20} y={80} textAnchor="middle" fontSize={12} fill="currentColor" className="text-muted">0</text>
      <text x={300} y={80} textAnchor="middle" fontSize={12} fill="currentColor" className="text-muted">{max}</text>
      <g className="nx-pop-in-stagger" style={{ ...idxStyle(2), transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        <path d={`M${x} 53 l-9 -18 a11 11 0 1 1 18 0 z`} fill="#f59e0b" stroke="currentColor" strokeWidth={2} className="text-fg" />
        <text x={x} y={26} textAnchor="middle" fontSize={11} fontWeight={700} fill="currentColor" className="text-fg">{value}</text>
      </g>
    </svg>
  );
}

/** Counted real objects (photos) for a skill. */
export function ScenePicture({ world, skillId, numbers, mathText, sprite, className }: ScenePictureProps) {
  const t = useTranslations('game.scenePicture');
  const [w1, w2] = ITEMS[world];
  const e1: Glyph = sprite ?? w1;
  const e2: Glyph = sprite ?? w2;
  const l = useMemo(() => layoutFor(skillId, numbers, mathText), [skillId, numbers, mathText]);
  const uid = useId();
  const key = uid + skillId + numbers.join(','); // remount, so the pop-in replays for new numbers
  const alt = describePicture(t as unknown as Tr, world, l);
  let body: ReactNode;
  if (l.kind === 'add') {
    body = (
      <div className="flex w-full items-center justify-center gap-[2cqw]">
        <Pile g={l.a} emoji={e1} cell={l.cell} start={0} />
        <Sign>+</Sign>
        <Pile g={l.b} emoji={e2} cell={l.cell} start={l.a.total} />
      </div>
    );
  } else if (l.kind === 'sub') {
    body = (
      <div className="grid justify-center gap-[0.1em]" style={{ ...cellStyle(l.cell), gridTemplateColumns: `repeat(${l.cols}, auto)` }}>
        {Array.from({ length: l.total }, (_, k) => (
          <Item key={k} emoji={e1} i={k} n={l.total} gone={k >= l.total - l.removed} />
        ))}
      </div>
    );
  } else if (l.kind === 'missing') {
    body = (
      <div className="flex w-full items-center justify-center gap-[2cqw]">
        <Pile g={l.a} emoji={e1} cell={l.cell} start={0} />
        <Sign>+</Sign>
        <div className="flex max-w-[40cqw] flex-wrap justify-center gap-[0.1em] rounded-[0.4em] border-2 border-dashed border-line p-[0.2em]" style={cellStyle(l.cell)}>
          {Array.from({ length: Math.max(l.slots, 1) }, (_, k) => (
            <span key={k} aria-hidden className="inline-block size-[1em] rounded-full border-2 border-dashed border-line" />
          ))}
        </div>
      </div>
    );
  } else if (l.kind === 'mul') {
    body = (
      <div className="grid justify-center gap-[0.1em]" style={{ ...cellStyle(l.cell), gridTemplateColumns: `repeat(${l.cols}, auto)` }}>
        {Array.from({ length: l.rows * l.cols }, (_, k) => (
          <Item key={k} emoji={e1} i={k} n={l.rows * l.cols} />
        ))}
      </div>
    );
  } else if (l.kind === 'div') {
    let i = 0;
    body = (
      <div className="flex w-full flex-wrap items-end justify-center gap-[2.5cqw]" style={cellStyle(l.cell)}>
        {Array.from({ length: l.bowls }, (_, b) => (
          <div key={b} className="flex flex-col items-center" style={{ width: `${Math.min(18, 92 / Math.min(l.bowls, 5) - 2)}cqw` }}>
            <div className="flex min-h-[1.2em] flex-wrap justify-center">
              {Array.from({ length: l.per }, (_, k) => (
                <Item key={k} emoji={e1} i={i++} n={l.total} />
              ))}
            </div>
            <span aria-hidden className="mt-[0.1em] block h-[0.5em] w-full rounded-full bg-sunken shadow-1" />
          </div>
        ))}
        {l.rem > 0 && (
          <div className="flex max-w-[22cqw] flex-wrap justify-center rounded-[0.4em] border-2 border-dashed border-line p-[0.2em]">
            {Array.from({ length: l.rem }, (_, k) => (
              <Item key={k} emoji={e2} i={i++} n={l.total} />
            ))}
          </div>
        )}
      </div>
    );
  } else {
    body = <NumberLine value={l.value} max={l.max} />;
  }
  return (
    <div role="img" aria-label={alt} className={cn('flex w-full items-center gap-2', className)}>
      <div className="min-w-0 flex-1 [container-type:inline-size]">
        <div key={key} aria-hidden className="flex items-center justify-center">
          {body}
        </div>
      </div>
    </div>
  );
}
