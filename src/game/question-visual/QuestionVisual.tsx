'use client';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useReducedMotion } from '@/platform/motion';
import { cn } from '@/shared/cn';
import type { QuestionVisual as VisualData } from '@/data/api/types';
import { revealBadge, revealedData, type Reveal } from './reveal';
import { Board, type BoardData } from './Board';
import { Vial, type VialData } from './Vial';
import { ObjectIcon, ObjectIconSvg } from './objects';
import { gridCellAt, iconForContext, loosePile, namedNumbers, niceAxis, tileLook } from './visualMath';

export type QuestionVisualProps = {
  visual: VisualData;
  className?: string;
  reveal?: Reveal;
  /** The story text: names the object a pictograph counts and the numbers a number line marks. */
  context?: string;
};

type Loc = string | number | { fr?: string; en?: string } | undefined | null;
/** Text inside a visual may arrive localised already, or as {fr,en}. */
function useTxt() {
  const locale = useLocale();
  return (v: Loc): string => {
    if (v == null) return '';
    if (typeof v === 'object') return (locale.startsWith('fr') ? v.fr : v.en) ?? v.fr ?? v.en ?? '';
    return String(v);
  };
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
type D = Record<string, unknown>;

function Frame({ title, label, children, className, theme, fit }: { title?: string; label: string; children: ReactNode; className?: string; theme?: unknown; fit?: boolean }) {
  const space = theme === 'space'; // a night sky behind the picture, for the space world
  return (
    <figure
      role="img"
      aria-label={label}
      className={cn('flex w-full max-w-md flex-col items-center gap-2 rounded-lg p-3 shadow-1', fit && 'h-full', space ? 'nx-space nx-space-ink' : 'bg-elevated/90 text-fg', className)}
    >
      {title && <figcaption className="text-center font-display text-base font-bold">{title}</figcaption>}
      <div aria-hidden className={cn('w-full', fit && 'flex min-h-0 flex-1 items-center justify-center')}>
        {children}
      </div>
    </figure>
  );
}

function Bars({ data }: { data: D }) {
  const txt = useTxt();
  const t = useTranslations('game.questionVisual');
  const reduced = useReducedMotion();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const bars = (data.bars as { label: Loc; value: number; icon?: string }[] | undefined) ?? [];
  const hasIcon = bars.some((b) => b.icon);
  const { top, ticks } = niceAxis(Math.max(num(data.max), ...bars.map((b) => num(b.value)), 1));
  const label = `${txt(data.title as Loc)} ${bars.map((b) => t('barItem', { label: txt(b.label), value: num(b.value) })).join(', ')}`;
  return (
    <Frame title={txt(data.title as Loc)} label={label} theme={data.theme} fit>
      <div className="flex h-full min-h-32 w-full flex-col">
        <div className={cn('flex min-h-0 flex-1 gap-1', hasIcon ? 'mt-12' : 'mt-7')}>
          <div className="relative w-8 shrink-0">
            {ticks.map((v) => (
              <span key={v} className="absolute end-1 translate-y-1/2 text-sm font-bold leading-none" style={{ bottom: `${(v / top) * 100}%` }}>
                {v}
              </span>
            ))}
          </div>
          <div className="relative flex min-w-0 flex-1 items-end gap-2 border-b-2 border-line-strong px-1">
            {ticks.slice(1).map((v) => (
              <span key={v} className="absolute inset-x-0 border-t border-dashed border-line-strong/60" style={{ bottom: `${(v / top) * 100}%` }} />
            ))}
            {bars.map((b, i) => (
              <div key={i} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <div className="relative w-full max-w-14" style={{ height: `${(num(b.value) / top) * 100}%` }}>
                  <div className="absolute inset-x-0 bottom-full flex flex-col items-center">
                    {b.icon && <ObjectIcon name={b.icon} className="nx-piece-in mb-0.5 size-7 shrink-0 object-contain" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }} />}
                    <span className="mb-0.5 rounded bg-elevated/90 px-1 font-display text-base font-extrabold leading-tight">{num(b.value)}</span>
                  </div>
                  <span
                    className="block h-full min-h-0.5 w-full origin-bottom rounded-t-md bg-brand"
                    style={{ transform: on || reduced ? 'scaleY(1)' : 'scaleY(0)', transition: reduced ? 'none' : `transform 500ms var(--ease-out) ${i * 60}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-1 pt-1">
          <span className="w-8 shrink-0" />
          <div className="flex min-w-0 flex-1 gap-2 px-1">
            {bars.map((b, i) => (
              <span key={i} className="line-clamp-2 min-w-0 flex-1 text-center text-sm font-semibold leading-tight">
                {txt(b.label)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-6 fill-brand stroke-brand', className)} strokeWidth="1.5" strokeLinejoin="round">
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  );
}

/** One counted thing: its picture on a small tile (same look for photos and silhouettes), tinted or patterned when the row says so. */
function Token({ icon, look, index, size }: { icon?: string; look: ReturnType<typeof tileLook>; index: number; size: string }) {
  const bg =
    look?.pattern === 'dots'
      ? 'radial-gradient(circle, #1d4ed8 22%, transparent 24%) 0 0/9px 9px'
      : look?.pattern === 'stripes'
        ? 'repeating-linear-gradient(45deg, #ec4899 0 4px, transparent 4px 8px)'
        : undefined;
  return (
    <span className={cn('nx-piece-in relative flex items-center justify-center overflow-hidden rounded-md ring-1 ring-line-strong', size)} style={{ background: look?.bg ?? '#fff', ['--nx-i' as string]: index }}>
      {bg && <span aria-hidden className="absolute inset-0 opacity-40" style={{ background: bg }} />}
      {icon ? <ObjectIcon name={icon} className="relative size-[88%] object-contain" /> : <Star className="relative size-[80%]" />}
    </span>
  );
}

function Pictograph({ data, context }: { data: D; context?: string }) {
  const txt = useTxt();
  const t = useTranslations('game.questionVisual');
  const rows = (data.rows as { label: Loc; count: number; icon?: string }[] | undefined) ?? [];
  const each = num(data.each, 1);
  const fallback = iconForContext(context);
  const iconOf = (r: { icon?: string }) => r.icon ?? fallback ?? undefined;
  const legendIcon = rows.map(iconOf).find(Boolean);
  const big = Math.max(0, ...rows.map((r) => num(r.count))) <= 6; // few icons: draw them large
  const label = `${txt(data.title as Loc)} ${t('each', { n: each })} ${rows.map((r) => `${txt(r.label)} ${num(r.count)}`).join(', ')}`;
  return (
    <Frame title={txt(data.title as Loc)} label={label} theme={data.theme}>
      <div className="flex flex-col gap-1.5">
        {rows.map((r, i) => {
          const n = Math.max(0, Math.round(num(r.count)));
          const look = tileLook(txt(r.label));
          const groups = Array.from({ length: Math.ceil(n / 5) }, (_, g) => Math.min(5, n - g * 5));
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-base font-semibold leading-tight">{txt(r.label)}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {groups.map((size, g) => (
                  <span key={g} className={cn('flex gap-0.5', n > 5 && 'rounded-md bg-bg/60 p-0.5 ring-1 ring-line')}>
                    {Array.from({ length: size }, (_, k) => (
                      <Token key={k} icon={iconOf(r)} look={look} index={g * 5 + k} size={big ? "size-12" : "size-9"} />
                    ))}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex items-center gap-2 rounded-md bg-bg/70 px-2 py-1 text-base font-bold">
        <Token icon={legendIcon} look={null} index={0} size="size-7" /> = {each}
      </p>
    </Frame>
  );
}

/** The face of a clock: pure SVG, no frame, no translation. The question picture and the big wall clock in a scene both use it. */
export function ClockFace({ hour, minute, className, animate = true }: { hour: number; minute: number; className?: string; animate?: boolean }) {
  const h = ((hour % 12) + 12) % 12;
  const ha = (h + minute / 60) * 30;
  const ma = minute * 6;
  const move = (deg: number): CSSProperties => ({ transform: `rotate(${deg}deg)`, transformOrigin: '100px 100px', transition: animate ? 'transform 1100ms cubic-bezier(.4,0,.2,1)' : 'none' });
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <circle cx="100" cy="100" r="97" fill="#8f5e2e" />
      <circle cx="100" cy="100" r="90" fill="#fffaf0" stroke="#3b2410" strokeWidth="2" />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i * 6 * Math.PI) / 180;
        const big = i % 5 === 0;
        const r1 = big ? 76 : 83;
        return <line key={i} x1={100 + Math.sin(a) * r1} y1={100 - Math.cos(a) * r1} x2={100 + Math.sin(a) * 88} y2={100 - Math.cos(a) * 88} stroke="#3b2410" strokeWidth={big ? 3.5 : 1.5} strokeLinecap="round" />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) * 30 * Math.PI) / 180;
        return (
          <text key={i} x={100 + Math.sin(a) * 62} y={100 - Math.cos(a) * 62 + 9} textAnchor="middle" fontSize="27" fontWeight="800" fill="#1a0f05">
            {i + 1}
          </text>
        );
      })}
      <g style={move(ha)}>
        <line x1="100" y1="108" x2="100" y2="54" stroke="#fffaf0" strokeWidth="13" strokeLinecap="round" />
        <line x1="100" y1="108" x2="100" y2="54" stroke="#1a0f05" strokeWidth="8" strokeLinecap="round" />
      </g>
      <g style={move(ma)}>
        <line x1="100" y1="112" x2="100" y2="20" stroke="#fffaf0" strokeWidth="8" strokeLinecap="round" />
        <line x1="100" y1="112" x2="100" y2="20" stroke="#c0392b" strokeWidth="4.5" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="100" r="7" fill="#1a0f05" stroke="#fffaf0" strokeWidth="2" />
    </svg>
  );
}

function Clock({ data }: { data: D }) {
  const t = useTranslations('game.questionVisual');
  const hour = num(data.hour, 12) % 12;
  const minute = num(data.minute);
  return (
    <Frame label={t('clock', { hour: hour === 0 ? 12 : hour, minute: String(minute).padStart(2, '0') })} className="max-w-72" theme={data.theme} fit>
      <ClockFace hour={hour} minute={minute} className="mx-auto h-full max-h-full w-full max-w-64" />
    </Frame>
  );
}

function NumberLineV({ data, context, answer }: { data: D; context?: string; answer?: number }) {
  const t = useTranslations('game.questionVisual');
  const nf = new Intl.NumberFormat(useLocale(), { maximumFractionDigits: 3 });
  const min = num(data.min);
  const max = num(data.max, 10);
  const span = Math.max(max - min, 1e-9);
  // 0.1 steps drift in floating point: count the steps and round each tick instead of adding up
  const step = Math.max(num(data.step, 1), span / 60);
  const count = Math.round(span / step);
  const round = (v: number) => Math.round(v * 1e6) / 1e6;
  const arrow = typeof data.arrow === 'number' ? round(data.arrow) : null;
  const pins = (data.pins as { value: number; icon?: string; label?: Loc }[] | undefined) ?? [];
  const hops = (data.hops as { from: number; to: number; label?: Loc }[] | undefined) ?? [];
  // A line that marks nothing yet marks the numbers its story names; one card missing between two of them is drawn as a "?" card.
  const named = arrow === null && pins.length === 0 && hops.length === 0 ? namedNumbers(context, min, max) : [];
  const gap = named.length === 2 && named[1] - named[0] === 2 ? named[0] + 1 : null;
  const labels = [...new Set([...((data.labels as number[] | undefined) ?? [min, max]).map(round), ...named])];
  const txt = useTxt();
  const x = (v: number) => 20 + (280 * (v - min)) / span;
  const ticks = Array.from({ length: count + 1 }, (_, i) => round(min + i * step));
  const major = (v: number) => labels.includes(v);
  return (
    <Frame label={t('numberline', { min: nf.format(min), max: nf.format(max) })} theme={data.theme} fit>
      <svg viewBox="0 0 320 130" className="h-full max-h-full w-full">
        <g transform="translate(0 30)">
          <line x1={20} y1={50} x2={300} y2={50} strokeWidth="4" strokeLinecap="round" className="stroke-fg" />
          {ticks.map((v) => (
            <line key={v} x1={x(v)} y1={major(v) ? 40 : 44} x2={x(v)} y2={major(v) ? 60 : 56} strokeWidth={major(v) ? 3.5 : 2} className={major(v) ? 'stroke-fg' : 'stroke-muted'} />
          ))}
          {labels.map((v) => (
            <text key={v} x={x(v)} y={82} textAnchor="middle" fontSize="17" fontWeight="800" className="fill-fg">
              {nf.format(v)}
            </text>
          ))}
          {named.map((v, i) => (
            <circle key={`n${v}`} cx={x(v)} cy={50} r={6} className="nx-piece-in fill-brand stroke-fg" strokeWidth="2" style={{ ['--nx-i' as string]: i } as CSSProperties} />
          ))}
          {gap !== null && (
            <g className="nx-piece-in" style={{ ['--nx-i' as string]: 2 } as CSSProperties}>
              <rect x={x(gap) - 15} y={0} width={30} height={34} rx={6} className="fill-elevated stroke-fg" strokeWidth="2.5" strokeDasharray={answer === gap ? undefined : '5 3'} />
              <text x={x(gap)} y={24} textAnchor="middle" fontSize="19" fontWeight="800" className="fill-fg">
                {answer === gap ? nf.format(gap) : '?'}
              </text>
              <circle cx={x(gap)} cy={50} r={6} className="fill-brand stroke-fg" strokeWidth="2" />
            </g>
          )}
          {arrow !== null && (
            <g>
              {data.theme === 'space' ? (
                <image href="/objects/rocket-256.webp" x={x(arrow) - 18} y={14} width={36} height={36} className="nx-piece-in" />
              ) : (
                <path d={`M${x(arrow)} 46 l-11 -22 a13 13 0 1 1 22 0 z`} className="fill-brand stroke-fg" strokeWidth="2" />
              )}
              <text x={x(arrow)} y={12} textAnchor="middle" fontSize="18" fontWeight="800" className="fill-fg">
                ?
              </text>
            </g>
          )}
          {pins.map((p, i) => (
            <g key={`pin${i}`}>
              {p.icon && <ObjectIconSvg name={p.icon} x={x(p.value) - 16} y={-8} size={32} className="nx-piece-in" style={{ ['--nx-i' as string]: i } as CSSProperties} />}
              <circle cx={x(p.value)} cy={50} r={5} className="fill-brand stroke-fg" strokeWidth="2" />
              <text x={x(p.value)} y={36} textAnchor="middle" fontSize="12" fontWeight="800" className="fill-fg">
                {txt(p.label)}
              </text>
            </g>
          ))}
          {hops.map((h, i) => {
            const a = x(h.from);
            const b = x(h.to);
            const mid = (a + b) / 2;
            const d = `M${a} 42 Q${mid} ${-14 - Math.min(Math.abs(b - a) / 6, 12)} ${b} 42`;
            return (
              <g key={`hop${i}`}>
                <path d={d} fill="none" stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" pathLength={1} className="nx-arrow-draw" style={{ ['--nx-i' as string]: i } as CSSProperties} />
                <text x={mid} y={-6} textAnchor="middle" fontSize="13" fontWeight="800" className="fill-fg nx-mark-in" style={{ ['--nx-i' as string]: i + 1 } as CSSProperties}>
                  {txt(h.label)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </Frame>
  );
}

/**
 * Grids are 1-based unless a coordinate is 0: x counts columns from the left, y counts rows from the TOP (row 1 on top),
 * which is what the questions say ("colonnes de gauche à droite, rangées de haut en bas"). 0-based grids (any coordinate 0) have no axis numbers.
 * Real chessboards are drawn by Board (y from the bottom, like a chess diagram).
 */
export function gridConvention(cells: { x: number; y: number }[]): 'oneBased' | 'zeroBased' {
  return cells.some((c) => c.x === 0 || c.y === 0) ? 'zeroBased' : 'oneBased';
}

function Grid({ data, solved }: { data: D; solved: boolean }) {
  const txt = useTxt();
  const t = useTranslations('game.questionVisual');
  const cells = (data.cells as { x: number; y: number; label: Loc }[] | undefined) ?? [];
  if (data.board === true) return <Board data={data as unknown as BoardData} />; // a real board, drawn by its own component
  const one = gridConvention(cells) === 'oneBased';
  const light = data.__light === true; // after the answer the counted tiles pulse one after the other
  const icons = cells.length > 0 && cells.every((c) => txt(c.label).startsWith('img:'));
  const pile = !solved && one && icons ? loosePile(cells.length, Math.round(num(data.cols, 4))) : null;
  const cols = pile ? pile.cols : Math.max(1, Math.min(21, num(data.cols, 4)));
  const rows = pile ? Math.ceil(cells.length / pile.cols) : Math.max(1, Math.min(10, num(data.rows, 4)));
  const shown = pile ? cells.map((c, i) => ({ ...c, x: (i % cols) + 1, y: Math.floor(i / cols) + 1 })) : cells;
  const axes = one && !pile;
  const at = (col: number, row: number) => gridCellAt(shown, col, row, one);
  // A label "img:name" shows the object picture; an empty label is a plain counter tile.
  const spoken = (l: Loc) => txt(l).replace(/^img:/, '').replace(/-/g, ' ') || t('tile');
  const counts = new Map<string, number>();
  for (const c of cells) counts.set(spoken(c.label), (counts.get(spoken(c.label)) ?? 0) + 1);
  const summary = pile ? '' : [...counts].map(([l, n]) => (n > 1 ? `${l} x${n}` : l)).join(', ');
  // The grid fills the stage it sits in (container units), never overflows it: cell = min(room per row, room per column)
  const longest = shown.reduce((m, c) => Math.max(m, c.label && !txt(c.label).startsWith('img:') ? txt(c.label).length : 0), 0);
  const axisW = axes ? 22 : 0;
  const cellPx = `min(44px, calc((100cqh - ${axes ? 26 : 4}px) / ${rows}), calc((100cqw - ${axisW + 8}px) / ${cols}))`;
  const cellW = longest > 3 ? `min(96px, calc((100cqw - ${axisW + 8}px) / ${cols}))` : cellPx;
  const font = (s: string) => Math.max(10, Math.min(16, (Math.min(96, Math.floor(300 / cols)) - 6) / Math.max(s.length * 0.58, 1.6)));
  return (
    <Frame label={`${t('grid', { cols, rows })}. ${summary}`} theme={data.theme} fit>
      <div className="h-full w-full" style={{ containerType: 'size' }}>
        <div className="mx-auto flex w-fit gap-1" style={{ ['--c' as string]: cellPx, ['--w' as string]: cellW }}>
          {axes && (
            <div className="flex flex-col pe-0.5 text-sm font-bold" style={{ rowGap: 2 }}>
              {Array.from({ length: rows }, (_, r) => (
                <span key={r} className="flex items-center justify-end" style={{ height: 'var(--c)', width: 18 }}>
                  {r + 1}
                </span>
              ))}
            </div>
          )}
          <div className="min-w-0">
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, var(--w))`, gridAutoRows: 'var(--c)' }}>
              {Array.from({ length: rows * cols }, (_, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const c = at(col, row);
                const raw = c ? txt(c.label) : '';
                const icon = raw.startsWith('img:') ? raw.slice(4) : null;
                const label = icon ? '' : raw;
                return (
                  <span
                    key={i}
                    title={icon ? spoken(c!.label) : label || undefined}
                    data-light={light && c ? i : undefined}
                    className={cn('flex items-center justify-center overflow-hidden rounded-sm border border-line-strong text-center font-bold leading-none', icon ? 'bg-bg' : c ? 'bg-brand text-brand-fg' : 'bg-bg')}
                    style={{ ...(label ? { fontSize: font(label) } : {}), ...(light && c ? ({ '--nx-i': i } as CSSProperties) : {}) }}
                  >
                    {icon ? <ObjectIcon name={icon} className="nx-piece-in size-[90%] object-contain" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))', ['--nx-i' as string]: i % 24 }} /> : label}
                  </span>
                );
              })}
            </div>
            {axes && (
              <div className="mt-0.5 grid text-center text-sm font-bold" style={{ gridTemplateColumns: `repeat(${cols}, var(--w))`, columnGap: 2 }}>
                {Array.from({ length: cols }, (_, k) => (
                  <span key={k}>{k + 1}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Fraction({ data }: { data: D }) {
  const t = useTranslations('game.questionVisual');
  const parts = Math.max(1, Math.min(24, Math.round(num(data.parts, 4))));
  const filled = Math.max(0, Math.min(parts, Math.round(num(data.filled))));
  const r = 80;
  const slice = (i: number) => {
    const a0 = (i / parts) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / parts) * 2 * Math.PI - Math.PI / 2;
    const big = a1 - a0 > Math.PI ? 1 : 0;
    if (parts === 1) return `M100 ${100 - r} A${r} ${r} 0 1 1 99.99 ${100 - r} Z`;
    return `M100 100 L${100 + r * Math.cos(a0)} ${100 + r * Math.sin(a0)} A${r} ${r} 0 ${big} 1 ${100 + r * Math.cos(a1)} ${100 + r * Math.sin(a1)} Z`;
  };
  return (
    <Frame label={t('fraction', { filled, parts })} className="max-w-60">
      <svg viewBox="0 0 200 200" className="mx-auto w-full max-w-48">
        {Array.from({ length: parts }, (_, i) => (
          <path key={i} d={slice(i)} strokeWidth="3" className={cn('stroke-fg', i < filled ? 'fill-brand' : 'fill-bg')} />
        ))}
      </svg>
    </Frame>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 25],
    [72, 25],
    [28, 50],
    [72, 50],
    [28, 75],
    [72, 75],
  ],
};

function Dice({ data, solved }: { data: D; solved: boolean }) {
  const t = useTranslations('game.questionVisual');
  const dice = ((data.dice as number[] | undefined) ?? []).map((n) => Math.max(1, Math.min(6, Math.round(n)))).slice(0, 6);
  const hidden = !solved && dice.length === 6 && dice.every((n, i) => n === i + 1); // all six faces on show would answer "how many results"
  return (
    <Frame label={t('dice', { list: dice.join(', ') })}>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {hidden && (
          <svg viewBox="0 0 100 100" className="size-24">
            <rect x="4" y="4" width="92" height="92" rx="16" strokeWidth="5" className="fill-bg stroke-fg" />
            <text x="50" y="68" textAnchor="middle" fontSize="56" fontWeight="800" className="fill-fg">
              ?
            </text>
          </svg>
        )}
        {(hidden ? [] : dice).map((n, i) => (
          <svg key={i} viewBox="0 0 100 100" className="size-16">
            <rect x="4" y="4" width="92" height="92" rx="16" strokeWidth="5" className="fill-bg stroke-fg" />
            {PIPS[n].map(([cx, cy], k) => (
              <circle key={k} cx={cx} cy={cy} r="9" className="fill-fg" />
            ))}
          </svg>
        ))}
      </div>
    </Frame>
  );
}

/** A picture the child reads: bars, pictograph, clock, number line, grid, fraction or dice. Data only, drawn here. */
export function QuestionVisual({ visual, className, reveal, context }: QuestionVisualProps) {
  const txt = useTxt();
  const data = revealedData(visual.kind, (visual.data ?? {}) as D, reveal, txt);
  const body = (() => {
    switch (visual.kind) {
      case 'bars':
        return <Bars data={data} />;
      case 'pictograph':
        return <Pictograph data={data} context={context} />;
      case 'clock':
        return <Clock data={data} />;
      case 'numberline':
        return data.style === 'vial' ? <Vial data={data as unknown as VialData} /> : <NumberLineV data={data} context={context} answer={reveal?.numeric} />;
      case 'grid':
        return <Grid data={data} solved={reveal !== undefined} />;
      case 'fraction':
        return <Fraction data={data} />;
      case 'dice':
        return <Dice data={data} solved={reveal !== undefined} />;
      default:
        return null;
    }
  })();
  const badge = revealBadge(visual.kind, reveal);
  return body ? (
    <div className={cn('relative flex h-full w-full flex-col items-center justify-center gap-2', className)}>
      {body}
      {badge && <span className="nx-count-badge absolute bottom-1 end-2 rounded-full bg-brand px-4 py-1 font-display text-xl font-extrabold text-brand-fg shadow-2">= {badge}</span>}
    </div>
  ) : null;
}
