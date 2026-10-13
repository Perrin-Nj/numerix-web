'use client';
// Small chart kit in plain SVG: responsive, themed through CSS variables, every chart has a text summary and a table.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { Button, cx } from './ui';
import { TableWrap, Td, Th } from './parts';

export const PALETTE = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Round axis maximum and step for about 4 intervals. */
export function niceScale(max: number) {
  if (max <= 0) return { top: 4, step: 1 };
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = ([1, 2, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  return { top: Math.ceil(max / step) * step, step };
}

export const compact = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n * 10) / 10));

export interface Pt {
  x: string; // machine key shown in the tooltip and table
  label: string; // short tick label
  y: number;
}

function Tip({ left, top, title, lines }: { left: number; top: number; title: string; lines: string[] }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-elevated px-2.5 py-1.5 text-xs shadow-lg"
      style={{ left, top }}
      role="presentation"
    >
      <div className="font-semibold">{title}</div>
      {lines.map((l) => (
        <div key={l} className="text-muted">
          {l}
        </div>
      ))}
    </div>
  );
}

const M = { l: 40, r: 10, t: 10, b: 24 };

function Axes({ w, h, top, step, fmt }: { w: number; h: number; top: number; step: number; fmt: (n: number) => string }) {
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const y = (v: number) => M.t + (h - M.t - M.b) * (1 - v / top);
  return (
    <g>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={M.l} x2={w - M.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} strokeDasharray={v === 0 ? undefined : '3 4'} />
          <text x={M.l - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
            {fmt(v)}
          </text>
        </g>
      ))}
    </g>
  );
}

function XLabels({ pts, xs, h, w }: { pts: Pt[]; xs: (i: number) => number; h: number; w: number }) {
  const max = Math.max(2, Math.floor((w - M.l - M.r) / 62));
  const every = Math.max(1, Math.ceil(pts.length / max));
  return (
    <g>
      {pts.map((p, i) =>
        i % every === 0 || i === pts.length - 1 ? (
          <text key={p.x} x={xs(i)} y={h - 6} textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'} fontSize={11} fill="var(--muted)">
            {p.label}
          </text>
        ) : null,
      )}
    </g>
  );
}

export function LineChart({ pts, name, color = PALETTE[0], height = 200, fmt = compact, tipValue, area = true }: { pts: Pt[]; name: string; color?: string; height?: number; fmt?: (n: number) => string; tipValue?: (n: number) => string; area?: boolean }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();
  const { top, step } = niceScale(Math.max(0, ...pts.map((p) => p.y)));
  const xs = (i: number) => (pts.length < 2 ? (M.l + w - M.r) / 2 : M.l + ((w - M.l - M.r) * i) / (pts.length - 1));
  const ys = (v: number) => M.t + (height - M.t - M.b) * (1 - v / top);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(p.y).toFixed(1)}`).join(' ');
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - r.left) / r.width;
    setHover(Math.max(0, Math.min(pts.length - 1, Math.round(rel * (pts.length - 1)))));
  };
  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {w > 0 && (
        <>
          <svg width={w} height={height} aria-hidden>
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Axes w={w} h={height} top={top} step={step} fmt={fmt} />
            {area && pts.length > 1 && <path d={`${line} L${xs(pts.length - 1)},${ys(0)} L${xs(0)},${ys(0)} Z`} fill={`url(#${gid})`} />}
            <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {pts.length <= 14 && pts.map((p, i) => <circle key={p.x} cx={xs(i)} cy={ys(p.y)} r={3} fill={color} />)}
            <XLabels pts={pts} xs={xs} h={height} w={w} />
            {hover !== null && (
              <g>
                <line x1={xs(hover)} x2={xs(hover)} y1={M.t} y2={height - M.b} stroke="var(--muted)" strokeWidth={1} />
                <circle cx={xs(hover)} cy={ys(pts[hover].y)} r={5} fill={color} stroke="var(--elevated)" strokeWidth={2} />
              </g>
            )}
            <rect x={M.l} y={0} width={Math.max(0, w - M.l - M.r)} height={height - M.b} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} />
          </svg>
          {hover !== null && <Tip left={xs(hover)} top={Math.max(24, ys(pts[hover].y) - 10)} title={pts[hover].x} lines={[`${name}: ${(tipValue ?? fmt)(pts[hover].y)}`]} />}
        </>
      )}
    </div>
  );
}

export interface BarDatum {
  x: string;
  label: string;
  values: number[];
}
export function BarChart({ data, names, stacked = false, height = 200, fmt = compact, tipValue }: { data: BarDatum[]; names: string[]; stacked?: boolean; height?: number; fmt?: (n: number) => string; tipValue?: (n: number) => string }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => (stacked ? d.values.reduce((a, b) => a + b, 0) : Math.max(...d.values)));
  const { top, step } = niceScale(Math.max(0, ...totals));
  const band = (w - M.l - M.r) / Math.max(1, data.length);
  const ys = (v: number) => M.t + (height - M.t - M.b) * (1 - v / top);
  const cx0 = (i: number) => M.l + band * (i + 0.5);
  const bw = Math.max(3, Math.min(40, band * 0.7));
  const gw = stacked ? bw : bw / names.length;
  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {w > 0 && (
        <>
          <svg width={w} height={height} aria-hidden>
            <Axes w={w} h={height} top={top} step={step} fmt={fmt} />
            {data.map((d, i) => {
              let acc = 0;
              return (
                <g key={d.x} opacity={hover === null || hover === i ? 1 : 0.55}>
                  {d.values.map((v, s) => {
                    const y0 = stacked ? acc : 0;
                    acc += v;
                    const x = stacked ? cx0(i) - bw / 2 : cx0(i) - bw / 2 + s * gw;
                    const yTop = ys(y0 + v);
                    return <rect key={s} x={x} y={yTop} width={Math.max(1, gw - (stacked ? 0 : 1))} height={Math.max(0, ys(y0) - yTop)} rx={2} fill={PALETTE[s % PALETTE.length]} />;
                  })}
                </g>
              );
            })}
            <XLabels pts={data.map((d) => ({ x: d.x, label: d.label, y: 0 }))} xs={cx0} h={height} w={w} />
            {data.map((d, i) => (
              <rect key={d.x} x={M.l + band * i} y={0} width={band} height={height - M.b} fill="transparent" onPointerEnter={() => setHover(i)} onPointerMove={() => setHover(i)} onPointerLeave={() => setHover(null)} />
            ))}
          </svg>
          {hover !== null && <Tip left={cx0(hover)} top={Math.max(24, ys(totals[hover]) - 6)} title={data[hover].x} lines={data[hover].values.map((v, s) => `${names[s]}: ${(tipValue ?? fmt)(v)}`)} />}
        </>
      )}
    </div>
  );
}

export interface Slice {
  label: string;
  value: number;
  detail?: string;
}
export function Donut({ slices, centerLabel, fmt = (n: number) => String(n) }: { slices: Slice[]; centerLabel: string; fmt?: (n: number) => string }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const R = 56, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={150} height={150} viewBox="0 0 150 150" aria-hidden className="shrink-0">
        <circle cx={75} cy={75} r={R} fill="none" stroke="var(--sunken)" strokeWidth={20} />
        {total > 0 &&
          slices.map((s, i) => {
            const len = (s.value / total) * C;
            const el = s.value > 0 && <circle key={s.label} cx={75} cy={75} r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={20} strokeDasharray={`${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`} strokeDashoffset={-off} transform="rotate(-90 75 75)" />;
            off += len;
            return el;
          })}
        <text x={75} y={73} textAnchor="middle" fontSize={26} fontWeight={700} fill="var(--fg)">
          {fmt(total)}
        </text>
        <text x={75} y={92} textAnchor="middle" fontSize={11} fill="var(--muted)">
          {centerLabel}
        </text>
      </svg>
      <ul className="min-w-40 flex-1 space-y-1.5 text-sm">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden />
            <span className="flex-1">{s.label}</span>
            <span className="font-semibold">{fmt(s.value)}</span>
            <span className="w-12 text-right text-xs text-muted">{total ? `${Math.round((s.value / total) * 100)} %` : '-'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({ rows, fmt = (n: number) => String(n), color = PALETTE[0] }: { rows: { label: string; value: number }[]; fmt?: (n: number) => string; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2 text-sm">
          <span className="truncate text-muted">{r.label}</span>
          <span className="h-3 rounded-full bg-sunken" aria-hidden>
            <span className="block h-3 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color, minWidth: r.value > 0 ? 4 : 0 }} />
          </span>
          <span className="text-right font-semibold">{fmt(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Spark({ data, color = PALETTE[0] }: { data: number[]; color?: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * 100},${26 - ((v - min) / span) * 22}`).join(' ');
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Arrow plus sign plus colour: the direction never relies on colour alone. */
export function Delta({ now, before, goodWhenDown = false, suffix = '' }: { now: number; before: number; goodWhenDown?: boolean; suffix?: string }) {
  const t = useT();
  const diff = now - before;
  const pct = before ? (diff / before) * 100 : null;
  if (diff === 0) return <span className="text-xs font-semibold text-muted">{'= '}{t('ov.stable')}</span>;
  const good = goodWhenDown ? diff < 0 : diff > 0;
  const txt = pct === null ? `${diff > 0 ? '+' : ''}${Math.round(diff * 10) / 10}${suffix}` : `${diff > 0 ? '+' : ''}${Math.round(pct * 10) / 10} %`;
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold', good ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
      <span aria-hidden>{diff > 0 ? '▲' : '▼'}</span>
      {txt}
      <span className="sr-only">{diff > 0 ? t('ov.up') : t('ov.down')}</span>
    </span>
  );
}

/** Wraps a chart with a one-line text summary and a "show table" toggle holding the same numbers. */
export function ChartFrame({ summary, head, rows, children }: { summary: string; head: string[]; rows: (string | number)[][]; children: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div>
      {children}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-prose text-xs text-muted">{summary}</p>
        <Button small variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? t('chart.hide_table') : t('chart.table')}
        </Button>
      </div>
      {open && (
        <div className="mt-2 max-h-72 overflow-auto">
          <TableWrap>
            <thead>
              <tr>
                {head.map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <Td key={j}>{c}</Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      )}
    </div>
  );
}

export function RangeToggle<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl border border-line bg-sunken p-0.5">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          aria-pressed={o.v === value}
          onClick={() => onChange(o.v)}
          className={cx('min-h-8 rounded-[10px] px-3 text-xs font-semibold', o.v === value ? 'bg-elevated text-brand shadow-sm' : 'text-muted hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
