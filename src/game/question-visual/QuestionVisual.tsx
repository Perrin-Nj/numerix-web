'use client';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useReducedMotion } from '@/platform/motion';
import { cn } from '@/shared/cn';
import type { QuestionVisual as VisualData } from '@/data/api/types';
import { revealBadge, revealedData, type Reveal } from './reveal';
import { Board, type BoardData } from './Board';
import { Vial, type VialData } from './Vial';
import { objectSrc } from './objectSrc';

export type QuestionVisualProps = {
  visual: VisualData;
  className?: string;
  reveal?: Reveal;
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
  const max = Math.max(num(data.max), ...bars.map((b) => num(b.value)), 1);
  const label = `${txt(data.title as Loc)} ${bars.map((b) => t('barItem', { label: txt(b.label), value: num(b.value) })).join(', ')}`;
  return (
    <Frame title={txt(data.title as Loc)} label={label} theme={data.theme}>
      <div className={cn('relative flex items-end gap-2 border-b-2 border-line-strong px-1', hasIcon ? 'h-40' : 'h-28')}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <span key={g} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${g * 100}%` }}>
            <span className="absolute -top-2 start-0 bg-elevated pe-1 text-xs text-muted">{Math.round(max * g * 10) / 10}</span>
          </span>
        ))}
        {bars.map((b, i) => (
          <div key={i} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            {b.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={objectSrc(b.icon) ?? undefined} alt="" draggable={false} className="nx-piece-in mb-0.5 size-9 object-contain" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }} />
            )}
            <span
              className="w-full max-w-12 origin-bottom rounded-t-md bg-brand"
              style={{
                height: `${(num(b.value) / max) * 100}%`,
                transform: on || reduced ? 'scaleY(1)' : 'scaleY(0)',
                transition: reduced ? 'none' : `transform 500ms var(--ease-out) ${i * 60}ms`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-1 pt-1">
        {bars.map((b, i) => (
          <span key={i} className="line-clamp-2 min-w-0 flex-1 text-center text-xs leading-tight">
            {txt(b.label)}
          </span>
        ))}
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

function Pictograph({ data }: { data: D }) {
  const txt = useTxt();
  const t = useTranslations('game.questionVisual');
  const rows = (data.rows as { label: Loc; count: number; icon?: string }[] | undefined) ?? [];
  const each = num(data.each, 1);
  const label = `${txt(data.title as Loc)} ${t('each', { n: each })} ${rows.map((r) => `${txt(r.label)} ${num(r.count)}`).join(', ')}`;
  return (
    <Frame title={txt(data.title as Loc)} label={label} theme={data.theme}>
      <div className="flex flex-col gap-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm font-semibold leading-tight">{txt(r.label)}</span>
            <span className="flex flex-wrap gap-0.5">
              {Array.from({ length: Math.max(0, Math.round(num(r.count))) }, (_, k) =>
                r.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={k}
                    src={objectSrc(r.icon) ?? undefined}
                    alt=""
                    draggable={false}
                    className="nx-piece-in size-8 object-contain"
                    style={{
                      filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))',
                      ['--nx-i' as string]: k,
                    }}
                  />
                ) : (
                  <Star key={k} />
                ),
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1 text-sm text-muted">
        <Star className="size-4" /> = {each}
      </p>
    </Frame>
  );
}

function Clock({ data }: { data: D }) {
  const t = useTranslations('game.questionVisual');
  const hour = num(data.hour, 12) % 12;
  const minute = num(data.minute);
  const ha = (hour + minute / 60) * 30;
  const ma = minute * 6;
  return (
    <Frame
      label={t('clock', {
        hour: hour === 0 ? 12 : hour,
        minute: String(minute).padStart(2, '0'),
      })}
      className="max-w-60"
      theme={data.theme}
      fit
    >
      <svg viewBox="0 0 200 200" className="mx-auto h-full max-h-full w-full max-w-52">
        <circle cx="100" cy="100" r="96" fill="none" stroke="#8f5e2e" strokeWidth="9" />
        <circle cx="100" cy="100" r="91" fill="#fbf4e4" stroke="#5a3716" strokeWidth="2" />
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i * 6 * Math.PI) / 180;
          const big = i % 5 === 0;
          const r1 = big ? 78 : 84;
          return <line key={i} x1={100 + Math.sin(a) * r1} y1={100 - Math.cos(a) * r1} x2={100 + Math.sin(a) * 90} y2={100 - Math.cos(a) * 90} className="stroke-muted" strokeWidth={big ? 3 : 1} />;
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const a = ((i + 1) * 30 * Math.PI) / 180;
          return (
            <text key={i} x={100 + Math.sin(a) * 66} y={100 - Math.cos(a) * 66 + 6} textAnchor="middle" fontSize="18" fontWeight="700" className="fill-fg">
              {i + 1}
            </text>
          );
        })}
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="50"
          strokeWidth="7"
          strokeLinecap="round"
          stroke="#3b2410"
          style={{
            transform: `rotate(${ha}deg)`,
            transformOrigin: '100px 100px',
            transition: 'transform 1100ms cubic-bezier(.4,0,.2,1)',
          }}
        />
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="24"
          strokeWidth="4"
          strokeLinecap="round"
          stroke="#c0392b"
          style={{
            transform: `rotate(${ma}deg)`,
            transformOrigin: '100px 100px',
            transition: 'transform 1100ms cubic-bezier(.4,0,.2,1)',
          }}
        />
        <circle cx="100" cy="100" r="6" fill="#3b2410" />
      </svg>
    </Frame>
  );
}

function NumberLineV({ data }: { data: D }) {
  const t = useTranslations('game.questionVisual');
  const nf = new Intl.NumberFormat(useLocale(), { maximumFractionDigits: 3 });
  const min = num(data.min);
  const max = num(data.max, 10);
  const span = Math.max(max - min, 1e-9);
  // 0.1 steps drift in floating point: count the steps and round each tick instead of adding up
  const step = Math.max(num(data.step, 1), span / 60);
  const count = Math.round(span / step);
  const round = (v: number) => Math.round(v * 1e6) / 1e6;
  const labels = ((data.labels as number[] | undefined) ?? [min, max]).map(round);
  const arrow = typeof data.arrow === 'number' ? round(data.arrow) : null;
  const pins = (data.pins as { value: number; icon?: string; label?: Loc }[] | undefined) ?? [];
  const hops = (data.hops as { from: number; to: number; label?: Loc }[] | undefined) ?? [];
  const txt = useTxt();
  const x = (v: number) => 20 + (280 * (v - min)) / span;
  const ticks = Array.from({ length: count + 1 }, (_, i) => round(min + i * step));
  const major = (v: number) => labels.includes(v);
  return (
    <Frame label={t('numberline', { min: nf.format(min), max: nf.format(max) })} theme={data.theme} fit>
      <svg viewBox="0 0 320 120" className="h-full max-h-full w-full">
        <g transform="translate(0 28)">
          <line x1={20} y1={50} x2={300} y2={50} strokeWidth="3" strokeLinecap="round" className="stroke-fg" />
          {ticks.map((v) => (
            <line key={v} x1={x(v)} y1={major(v) ? 42 : 45} x2={x(v)} y2={major(v) ? 58 : 55} strokeWidth={major(v) ? 3 : 1.5} className="stroke-muted" />
          ))}
          {labels.map((v) => (
            <text key={v} x={x(v)} y={78} textAnchor="middle" fontSize="13" className="fill-fg">
              {nf.format(v)}
            </text>
          ))}
          {arrow !== null && (
            <g>
              {data.theme === 'space' ? (
                <image href="/objects/rocket-256.webp" x={x(arrow) - 14} y={20} width={28} height={28} className="nx-piece-in" />
              ) : (
                <path d={`M${x(arrow)} 46 l-8 -16 a10 10 0 1 1 16 0 z`} className="fill-brand stroke-fg" strokeWidth="1.5" />
              )}
              <text x={x(arrow)} y={21} textAnchor="middle" fontSize="13" fontWeight="700" className="fill-fg">
                ?
              </text>
            </g>
          )}
          {pins.map((p, i) => (
            <g key={`pin${i}`}>
              {p.icon && <image href={objectSrc(p.icon) ?? undefined} x={x(p.value) - 14} y={-6} width={28} height={28} className="nx-piece-in" style={{ ['--nx-i' as string]: i } as CSSProperties} />}
              <text x={x(p.value)} y={32} textAnchor="middle" fontSize="10" fontWeight="700" className="fill-muted">
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
                <text x={mid} y={-6} textAnchor="middle" fontSize="11" fontWeight="800" className="fill-fg nx-mark-in" style={{ ['--nx-i' as string]: i + 1 } as CSSProperties}>
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
 * Grids come in two conventions in the bank. 1-based (a coordinate reaches `cols` or `rows`, or none is 0 and none
 * is 0-based-only): x from the left, y from the BOTTOM, with axis numbers. 0-based (any coordinate is 0): column and
 * row counted from the top left, no axis numbers. Labels shrink to fit their cell.
 */
export function gridConvention(cells: { x: number; y: number }[]): 'oneBased' | 'zeroBased' {
  return cells.some((c) => c.x === 0 || c.y === 0) ? 'zeroBased' : 'oneBased';
}

function Grid({ data }: { data: D }) {
  const txt = useTxt();
  const t = useTranslations('game.questionVisual');
  const cols = Math.max(1, Math.min(10, num(data.cols, 4)));
  const rows = Math.max(1, Math.min(10, num(data.rows, 4)));
  const cells = (data.cells as { x: number; y: number; label: Loc }[] | undefined) ?? [];
  if (data.board === true) return <Board data={data as unknown as BoardData} />; // a real board, drawn by its own component
  const light = data.__light === true; // after the answer the counted tiles pulse one after the other
  const board = data.board === true; // chessboard: alternating squares, files a, b, c and ranks 1, 2, 3
  const one = board || gridConvention(cells) === 'oneBased';
  const at = (col: number, row: number) => (one ? cells.find((c) => c.x === col + 1 && c.y === rows - row) : cells.find((c) => c.x === col && c.y === row));
  // A label "img:name" shows the real object photo /objects/name-256.webp; an empty label is a plain counter tile.
  const spoken = (l: Loc) => txt(l).replace(/^img:/, '').replace(/-/g, ' ') || t('tile');
  const counts = new Map<string, number>();
  for (const c of cells) counts.set(spoken(c.label), (counts.get(spoken(c.label)) ?? 0) + 1);
  const summary = [...counts].map(([l, n]) => (n > 1 ? `${l} x${n}` : l)).join(', ');
  // Cell size in px: as large as the stage allows (about 200 px high, 280 px wide), never below 22
  const cell = Math.max(22, Math.min(40, Math.floor(200 / rows), Math.floor(260 / cols)));
  // Cards with words or sums (not single digits) are drawn wider so the text stays readable
  const longest = cells.reduce((m, c) => Math.max(m, c.label && !txt(c.label).startsWith('img:') ? txt(c.label).length : 0), 0);
  const cellW = longest > 3 ? Math.min(96, Math.floor(300 / cols)) : cell;
  const font = (s: string) => Math.max(9, Math.min(16, (cellW - 6) / Math.max(s.length * 0.58, 1.6)));
  return (
    <Frame label={`${t('grid', { cols, rows })}. ${summary}`} theme={data.theme}>
      <div className="mx-auto flex w-fit gap-1">
        {one && (
          <div className="flex flex-col pe-0.5 text-xs font-semibold text-muted" style={{ rowGap: 2 }}>
            {Array.from({ length: rows }, (_, r) => (
              <span key={r} className="flex items-center" style={{ height: cell }}>
                {rows - r}
              </span>
            ))}
          </div>
        )}
        <div className="min-w-0">
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
              gridAutoRows: `${cell}px`,
            }}
          >
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
                  className={cn(
                    'flex items-center justify-center overflow-hidden rounded-sm border border-line-strong text-center font-bold leading-none',
                    board ? ((col + row) % 2 === (rows - 1) % 2 ? 'bg-line-strong text-fg' : 'bg-bg text-fg') : icon ? 'bg-bg' : c ? 'bg-brand text-brand-fg' : 'bg-bg',
                  )}
                  style={{
                    ...(label ? { fontSize: font(label) } : {}),
                    ...(light && c ? ({ '--nx-i': i } as CSSProperties) : {}),
                  }}
                >
                  {icon ? (
                    <img
                      src={objectSrc(icon) ?? undefined}
                      alt=""
                      className="nx-piece-in size-[90%] object-contain"
                      style={{
                        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))',
                        ['--nx-i' as string]: i % 24,
                      }}
                      draggable={false}
                    />
                  ) : (
                    label
                  )}
                </span>
              );
            })}
          </div>
          {one && (
            <div
              className="mt-0.5 grid text-center text-xs font-semibold text-muted"
              style={{
                gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
                columnGap: 2,
              }}
            >
              {Array.from({ length: cols }, (_, k) => (
                <span key={k}>{board ? String.fromCharCode(97 + k) : k + 1}</span>
              ))}
            </div>
          )}
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

function Dice({ data }: { data: D }) {
  const t = useTranslations('game.questionVisual');
  const dice = ((data.dice as number[] | undefined) ?? []).map((n) => Math.max(1, Math.min(6, Math.round(n)))).slice(0, 6);
  return (
    <Frame label={t('dice', { list: dice.join(', ') })}>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {dice.map((n, i) => (
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
export function QuestionVisual({ visual, className, reveal }: QuestionVisualProps) {
  const txt = useTxt();
  const data = revealedData(visual.kind, (visual.data ?? {}) as D, reveal, txt);
  const body = (() => {
    switch (visual.kind) {
      case 'bars':
        return <Bars data={data} />;
      case 'pictograph':
        return <Pictograph data={data} />;
      case 'clock':
        return <Clock data={data} />;
      case 'numberline':
        return data.style === 'vial' ? <Vial data={data as unknown as VialData} /> : <NumberLineV data={data} />;
      case 'grid':
        return <Grid data={data} />;
      case 'fraction':
        return <Fraction data={data} />;
      case 'dice':
        return <Dice data={data} />;
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
