'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useReducedMotion } from '@/platform/motion';
import type { MethodVisual as MethodVisualData } from '@/data/api/types';
import { addPlan, subPlan, type PlacePlan } from './plans';

export type MethodVisualProps = {
  /** The picture to draw, as sent by the backend (kind, integer params, one caption per step). */
  visual: MethodVisualData;
  /** Milliseconds each step stays. Reduced motion shows the last step at once. */
  stepMs?: number;
  /** Fires when the step changes, with its caption (the screen may read it aloud). */
  onStep?: (caption: string, index: number) => void;
  className?: string;
};

const STEP_MS = 2400;
const PLACE_FILL = ['fill-brand', 'fill-info', 'fill-success', 'fill-warning'] as const;
const W = 320;
const H = 150;
const popStyle = (delay: number): CSSProperties => ({ animation: `nx-pop 450ms ${delay}ms both`, transformBox: 'fill-box', transformOrigin: 'center' });

/** Blocks of one place, laid out in a small grid inside its column. */
function Blocks({ place, shown, ringed, fresh, crossed, cx }: { place: number; shown: number; ringed: number; fresh: number; crossed: number; cx: number }) {
  const size = place >= 2 ? 15 : 11;
  const tall = place === 1 ? 26 : size;
  const perRow = Math.max(1, Math.floor(70 / (size + 3)));
  return (
    <g>
      {Array.from({ length: shown }, (_, i) => {
        const isFresh = i >= shown - fresh;
        return (
          <rect
            key={i}
            x={cx - 35 + (i % perRow) * (size + 3)}
            y={118 - Math.floor(i / perRow) * (tall + 3) - tall}
            width={size}
            height={tall}
            rx={3}
            className={cn(PLACE_FILL[place] ?? 'fill-brand', i >= shown - crossed && crossed > 0 && 'opacity-25', !isFresh && i < ringed && 'stroke-fg')}
            strokeWidth={!isFresh && i < ringed ? 2 : 0}
            style={isFresh ? popStyle(Math.min(i, 12) * 40) : undefined}
          />
        );
      })}
    </g>
  );
}

function PlaceValue({ plan, step, subtract }: { plan: PlacePlan; step: number; subtract: boolean }) {
  const len = plan.start.length;
  const colW = W / len;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full max-h-56 w-full" aria-hidden>
      {Array.from({ length: len }, (_, k) => {
        const place = len - 1 - k;
        const cx = colW * k + colW / 2;
        let shown = plan.start[place], ringed = 0, fresh = 0, crossed = 0;
        if (subtract) {
          if (step >= 1) { shown = plan.regrouped[place]; fresh = plan.fresh[place]; }
          if (step >= 2) crossed = plan.leaving[place];
        } else {
          if (step === 1) ringed = Math.min(plan.leaving[place], shown);
          if (step >= 2) { shown = plan.end[place]; fresh = Math.min(plan.fresh[place], shown); }
        }
        const total = subtract ? shown - crossed : shown;
        return (
          <g key={place}>
            <line x1={colW * k + 4} x2={colW * k + colW - 4} y1={124} y2={124} className="stroke-line" strokeWidth={2} />
            <Blocks place={place} shown={shown} ringed={ringed} fresh={fresh} crossed={crossed} cx={cx} />
            <text x={cx} y={144} textAnchor="middle" className="fill-fg font-display text-[15px] font-bold">
              {step >= 2 ? total : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Groups({ groups, size, step }: { groups: number; size: number; step: number }) {
  const cols = Math.min(groups, groups > 6 ? 5 : 3);
  const rows = Math.ceil(groups / cols);
  const cw = (W - 8) / cols, ch = (H - 28) / rows;
  const inner = Math.ceil(Math.sqrt(size));
  const r = Math.max(2.5, Math.min(7, Math.min(cw, ch) / (inner * 2 + 1.5)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full max-h-56 w-full" aria-hidden>
      {Array.from({ length: groups }, (_, g) => {
        const x0 = 4 + (g % cols) * cw, y0 = 2 + Math.floor(g / cols) * ch;
        return (
          <g key={g}>
            <rect x={x0 + 3} y={y0 + 3} width={cw - 6} height={ch - 6} rx={10} className="fill-sunken stroke-line" strokeWidth={2} style={popStyle(g * 90)} />
            {step >= 1 &&
              Array.from({ length: size }, (_, i) => (
                <circle
                  key={i}
                  cx={x0 + cw / 2 + ((i % inner) - (inner - 1) / 2) * r * 2.4}
                  cy={y0 + ch / 2 + (Math.floor(i / inner) - (Math.ceil(size / inner) - 1) / 2) * r * 2.4}
                  r={r}
                  className={step >= 2 ? 'fill-success' : 'fill-brand'}
                  style={popStyle(g * 60 + i * 25)}
                />
              ))}
          </g>
        );
      })}
      {step >= 2 && (
        <text x={W / 2} y={H - 4} textAnchor="middle" className="fill-fg font-display text-[18px] font-bold">
          {groups} × {size} = {groups * size}
        </text>
      )}
    </svg>
  );
}

function Share({ total, parts, step }: { total: number; parts: number; step: number }) {
  const q = Math.floor(total / parts);
  const cols = Math.min(parts, 5), rows = Math.ceil(parts / cols);
  const bw = (W - 8) / cols, bh = 70 / rows;
  const pile = 14, perRow = Math.floor(W / pile) - 1;
  const inCols = Math.max(1, Math.floor((bw - 12) / 11));
  const boxX = (p: number) => 4 + (p % cols) * bw;
  const boxY = (p: number) => H - 4 - (rows - Math.floor(p / cols)) * bh;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full max-h-56 w-full" aria-hidden>
      {Array.from({ length: parts }, (_, p) => (
        <rect key={p} x={boxX(p) + 3} y={boxY(p) + 3} width={bw - 6} height={bh - 6} rx={8} className={cn('fill-sunken', step >= 2 ? 'stroke-success' : 'stroke-line')} strokeWidth={2} />
      ))}
      {Array.from({ length: total }, (_, i) => {
        const moves = step >= 1 && i < q * parts;
        const p = i % parts, slot = Math.floor(i / parts);
        const x = moves ? boxX(p) + 12 + (slot % inCols) * 11 : 12 + (i % perRow) * pile;
        const y = moves ? boxY(p) + 12 + Math.floor(slot / inCols) * 11 : 12 + Math.floor(i / perRow) * pile;
        return (
          <circle
            key={i}
            r={4.5}
            className={step >= 2 && i >= q * parts ? 'fill-warning' : 'fill-brand'}
            style={{ transform: `translate(${x}px, ${y}px)`, transition: `transform 600ms ${moves ? i * 22 : 0}ms ease-in-out` }}
          />
        );
      })}
    </svg>
  );
}

/**
 * Animated how-to-solve picture drawn from backend data: place-value blocks for adding with a carry and subtracting
 * with a borrow, equal groups for times tables, and sharing for division. Steps through its captions, can be replayed,
 * and shows the finished picture under reduced motion. One role=img for the whole picture.
 */
export function MethodVisual({ visual, stepMs = STEP_MS, onStep, className }: MethodVisualProps) {
  const t = useTranslations('game.methodVisual');
  const reduced = useReducedMotion();
  const last = visual.steps.length - 1;
  const [run, setRun] = useState(0);
  const [at, setAt] = useState(0);
  const step = reduced ? last : Math.min(at, last);

  useEffect(() => {
    if (reduced || at >= last) return;
    const id = setTimeout(() => setAt((n) => n + 1), stepMs);
    return () => clearTimeout(id);
  }, [reduced, at, last, stepMs, run]);

  const caption = visual.steps[step]?.caption ?? '';
  useEffect(() => {
    onStep?.(caption, step);
    // the callback may change identity every render; the step is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption, step]);

  const p = visual.params;
  const drawing =
    visual.kind === 'add_carry' ? <PlaceValue plan={addPlan(p.a ?? 0, p.b ?? 0)} step={step} subtract={false} />
    : visual.kind === 'sub_borrow' ? <PlaceValue plan={subPlan(p.a ?? 0, p.b ?? 0)} step={step} subtract />
    : visual.kind === 'equal_groups' ? <Groups groups={p.groups ?? 1} size={p.size ?? 1} step={step} />
    : <Share total={p.total ?? 1} parts={p.parts ?? 1} step={step} />;

  return (
    <div className={cn('flex size-full min-h-0 flex-col items-center justify-center gap-2', className)}>
      <div key={`run-${run}`} role="img" aria-label={visual.alt} className="min-h-0 w-full flex-1">
        {drawing}
      </div>
      <p key={`step-${step}`} aria-live="polite" className="nx-stagger min-h-12 px-2 text-center font-display text-lg font-bold leading-snug text-fg">
        {caption}
      </p>
      <div className="flex items-center gap-3">
        <ol className="flex gap-1.5" aria-label={t('step', { n: step + 1, total: visual.steps.length })}>
          {visual.steps.map((_, i) => (
            <li key={i} className={cn('size-2.5 rounded-full', i <= step ? 'bg-brand' : 'bg-line')} />
          ))}
        </ol>
        {step >= last && !reduced && (
          <button
            type="button"
            onClick={() => {
              setAt(0);
              setRun((n) => n + 1);
            }}
            className="min-h-11 rounded-md px-3 text-base font-semibold text-muted underline"
          >
            {t('replay')}
          </button>
        )}
      </div>
    </div>
  );
}
