'use client';
import { useId, type CSSProperties } from 'react';
import { useLocale } from 'next-intl';

type Loc = string | number | { fr?: string; en?: string } | undefined | null;
type Segment = { value: number; tone?: 'a' | 'b' | 'good' };

/** A medicine bottle that shows a dose: how much is already in, in coloured layers. `after.segments` (the missing part) fills in once the answer is known. */
export type VialData = {
  max: number;
  step?: number;
  segments?: Segment[];
  unit?: Loc;
  title?: Loc;
};

const TONE: Record<NonNullable<Segment['tone']>, [string, string]> = {
  a: ['#58b4ea', '#2f86c6'], // blue syrup
  b: ['#6fd0c5', '#2ea99b'], // teal syrup
  good: ['#8bd47a', '#4aa83f'], // green: the part that was missing
};

/**
 * A glass bottle with a cork and a scale on its side. The liquid rises layer by layer and a drop falls into it.
 * Drawn in SVG (no image file), so it is sharp on a phone and on a TV.
 */
export function Vial({ data }: { data: VialData }) {
  const locale = useLocale();
  const uid = useId().replace(/:/g, '');
  const txt = (v: Loc): string => {
    if (v == null) return '';
    if (typeof v === 'object') return (locale.startsWith('fr') ? v.fr : v.en) ?? v.fr ?? v.en ?? '';
    return String(v);
  };
  const max = Math.max(1, data.max);
  const segs = (data.segments ?? []).filter((s) => s.value > 0);
  const step = data.step && data.step > 0 ? data.step : max <= 20 ? 5 : max <= 50 ? 10 : max <= 100 ? 10 : 50;
  const top = 46; // y of the full mark
  const bottom = 186; // y of the empty mark
  const y = (v: number) => bottom - ((bottom - top) * Math.min(v, max)) / max;
  const ends = segs.reduce<number[]>((all, s) => [...all, (all.at(-1) ?? 0) + s.value], []); // running total after each layer
  const layers = segs.map((s, i) => ({
    s,
    i,
    from: i === 0 ? 0 : ends[i - 1],
    to: Math.min(ends[i], max),
  }));
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  const unit = txt(data.unit);
  const label = `${txt(data.title)} ${segs.map((s) => s.value).join(' + ')} / ${max} ${unit}`;
  const idx = (i: number) => ({ '--nx-i': i }) as CSSProperties;
  return (
    <svg role="img" aria-label={label} viewBox="0 0 220 210" className="h-full max-h-[300px] w-full max-w-[300px]" preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id={`nx-vial-body-${uid}`}>
          <path d="M70 46 H130 V176 Q130 190 116 190 H84 Q70 190 70 176 Z" />
        </clipPath>
        {Object.entries(TONE).map(([k, [c1, c2]]) => (
          <linearGradient key={k} id={`nx-vial-${uid}-${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </linearGradient>
        ))}
      </defs>
      {/* the scale */}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={58} x2={70} y1={y(v)} y2={y(v)} stroke="#6b7c8c" strokeWidth={2} strokeLinecap="round" />
          <text x={52} y={y(v) + 4} textAnchor="end" fontSize={11} fontWeight={700} fill="#4a5a69">
            {v}
          </text>
        </g>
      ))}
      {/* the liquid, layer by layer, clipped to the glass */}
      <g clipPath={`url(#nx-vial-body-${uid})`}>
        <rect x={70} y={top} width={60} height={bottom - top + 8} fill="#eef6fb" />
        {layers.map(({ s, i, from, to }) => (
          <rect key={i} x={70} y={y(to)} width={60} height={Math.max(0, y(from) - y(to))} fill={`url(#nx-vial-${s.tone ?? (i === 0 ? 'a' : 'b')})`} className="nx-vial-rise" style={idx(i)} />
        ))}
      </g>
      {/* glass: body, neck, rim and a soft highlight */}
      <path d="M70 46 H130 V176 Q130 190 116 190 H84 Q70 190 70 176 Z" fill="none" stroke="#5b7c99" strokeWidth={3} strokeLinejoin="round" />
      <path d="M86 30 H114 V46 H86 Z" fill="#eef6fb" fillOpacity={0.6} stroke="#5b7c99" strokeWidth={3} strokeLinejoin="round" />
      <rect x={82} y={22} width={36} height={10} rx={4} fill="#c98a4b" stroke="#8a5a2b" strokeWidth={2} />
      <path d="M78 56 V168" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={4} strokeLinecap="round" />
      {unit && (
        <text x={100} y={206} textAnchor="middle" fontSize={11} fontWeight={700} fill="#4a5a69">
          {unit}
        </text>
      )}
      {/* a drop falling in */}
      <path className="nx-vial-drop" d="M150 54 C150 54 142 66 142 72 A8 8 0 0 0 158 72 C158 66 150 54 150 54 Z" fill="#58b4ea" stroke="#2f86c6" strokeWidth={1.5} />
    </svg>
  );
}
