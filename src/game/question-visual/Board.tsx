'use client';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useLocale } from 'next-intl';
import { objectSrc } from './objectSrc';

type Loc = string | number | { fr?: string; en?: string } | undefined | null;
type Pt = { x: number; y: number };
type Cell = Pt & { label: Loc };
type Mark = Pt & { tone?: 'good' | 'info' | 'warn' };
type Arrow = { from: Pt; to: Pt; via?: Pt };

/** Data of a board picture. x counts from the left and y from the bottom, both starting at 1 (a1 is x 1, y 1). */
export type BoardData = {
  cols: number;
  rows: number;
  cells?: Cell[];
  marks?: Mark[];
  arrows?: Arrow[];
  axes?: 'letters' | 'numbers';
};

const TONE: Record<NonNullable<Mark['tone']>, string> = {
  good: '#2fa36b',
  info: '#3b82f6',
  warn: '#f59e0b',
};
const LIGHT = '#f0d9b5';
const DARK = '#b58863';

/**
 * A chessboard (or a plain board of squares) drawn like a real one: a wooden frame, warm squares, real cartoon
 * pieces with a soft shadow that pop in one after the other, and, once the answer is known, highlighted squares
 * and arrows that draw themselves along the move.
 */
export function Board({ data }: { data: BoardData }) {
  const locale = useLocale();
  const arrowId = `nx-ah-${useId().replace(/:/g, '')}`; // one marker per board: two boards on a page must not share an id
  const txt = (v: Loc): string => {
    if (v == null) return '';
    if (typeof v === 'object') return (locale.startsWith('fr') ? v.fr : v.en) ?? v.fr ?? v.en ?? '';
    return String(v);
  };
  const cols = Math.max(1, Math.min(12, data.cols));
  const rows = Math.max(1, Math.min(10, data.rows));
  // The board fills the stage it sits in: measure the free room and fit the squares to it (never crops, any screen)
  const host = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ w: 320, h: 240 });
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const read = () => setRoom({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cell = Math.max(14, Math.min(72, Math.floor((room.w - 60) / cols), Math.floor((room.h - 56) / rows)));
  const W = cols * cell;
  const H = rows * cell;
  const at = (p: Pt) => ({
    cx: (p.x - 0.5) * cell,
    cy: (rows - p.y + 0.5) * cell,
  }); // centre of a square, in pixels
  const cells = data.cells ?? [];
  const names = cells.map((c) => txt(c.label).replace(/^img:/, '').replace(/-/g, ' ')).filter(Boolean);
  const file = (k: number) => (data.axes === 'numbers' ? String(k + 1) : String.fromCharCode(97 + k));
  const label = `${cols} x ${rows}${names.length ? `: ${names.join(', ')}` : ''}`;
  const idx = (i: number) => ({ '--nx-i': i }) as CSSProperties;
  return (
    <div ref={host} className="flex size-full items-center justify-center">
      <div role="img" aria-label={label} className="mx-auto w-fit rounded-2xl p-2.5 shadow-3" style={{ background: 'linear-gradient(145deg,#8f5e2e,#5a3716)' }}>
        <div className="flex">
          <div className="flex flex-col pe-1 text-[11px] font-bold" style={{ height: H, color: '#f3e3c3' }} aria-hidden>
            {Array.from({ length: rows }, (_, r) => (
              <span key={r} className="flex items-center" style={{ height: cell }}>
                {rows - r}
              </span>
            ))}
          </div>
          <div>
            <div className="relative overflow-hidden rounded-md" style={{ width: W, height: H }} aria-hidden>
              {Array.from({ length: rows * cols }, (_, i) => {
                const c = i % cols;
                const r = Math.floor(i / cols);
                const dark = (c + (rows - 1 - r)) % 2 === 0;
                return (
                  <span
                    key={i}
                    className="absolute"
                    style={{
                      left: c * cell,
                      top: r * cell,
                      width: cell,
                      height: cell,
                      background: dark ? DARK : LIGHT,
                    }}
                  />
                );
              })}
              {(data.marks ?? []).map((m, i) => {
                const { cx, cy } = at(m);
                const color = TONE[m.tone ?? 'good'];
                return (
                  <span
                    key={`m${i}`}
                    className="nx-mark-in absolute rounded-sm"
                    style={{
                      left: cx - cell / 2,
                      top: cy - cell / 2,
                      width: cell,
                      height: cell,
                      background: `${color}2e`,
                      boxShadow: `inset 0 0 0 2.5px ${color}`,
                      ...idx(i),
                    }}
                  />
                );
              })}
              {cells.map((c, i) => {
                const raw = txt(c.label);
                const { cx, cy } = at(c);
                if (raw.startsWith('img:')) {
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`p${i}`}
                      src={objectSrc(raw.slice(4)) ?? undefined}
                      alt=""
                      draggable={false}
                      className="nx-piece-in absolute object-contain"
                      style={{
                        left: cx - cell / 2,
                        top: cy - cell / 2,
                        width: cell,
                        height: cell,
                        padding: cell * 0.06,
                        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.4))',
                        ...idx(i),
                      }}
                    />
                  );
                }
                return (
                  <span
                    key={`t${i}`}
                    className="nx-piece-in absolute flex items-center justify-center text-center font-bold leading-none"
                    style={{
                      left: cx - cell / 2,
                      top: cy - cell / 2,
                      width: cell,
                      height: cell,
                      fontSize: Math.max(9, Math.min(15, (cell - 8) / Math.max(raw.length * 0.55, 1.6))),
                      color: '#3b2410',
                      ...idx(i),
                    }}
                  >
                    {raw}
                  </span>
                );
              })}
              {(data.arrows ?? []).length > 0 && (
                <svg className="pointer-events-none absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                  <defs>
                    <marker id={arrowId} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse">
                      <path d="M0 0 L10 5 L0 10 z" fill="#1f7a4d" />
                    </marker>
                  </defs>
                  {(data.arrows ?? []).map((a, i) => {
                    const f = at(a.from);
                    const t = at(a.to);
                    const v = a.via ? at(a.via) : null;
                    const d = v ? `M${f.cx} ${f.cy} L${v.cx} ${v.cy} L${t.cx} ${t.cy}` : `M${f.cx} ${f.cy} L${t.cx} ${t.cy}`;
                    return (
                      <g key={i}>
                        <path d={d} fill="none" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={cell * 0.2} strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d={d}
                          fill="none"
                          stroke="#1f7a4d"
                          strokeWidth={cell * 0.11}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          pathLength={1}
                          markerEnd={`url(#${arrowId})`}
                          className="nx-arrow-draw"
                          style={idx(i)}
                        />
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
            <div className="flex pt-1 text-[11px] font-bold" style={{ width: W, color: '#f3e3c3' }} aria-hidden>
              {Array.from({ length: cols }, (_, k) => (
                <span key={k} className="text-center" style={{ width: cell }}>
                  {file(k)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
