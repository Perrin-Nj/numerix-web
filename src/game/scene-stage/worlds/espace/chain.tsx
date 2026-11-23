'use client';
import { Item } from './kit';
import { Frame, Plate, css, defOf, nums } from './parts';
import type { ArchetypeProps } from '../../registry';
import './espace.css';

/**
 * espace.chain: a constellation of numbered stars joined by light, and one empty star at the end (the next of the pattern).
 * Modes (`es:chain:star:<room>:<mode>`): next (numbers from the text, then the empty star), rule (the same, arcs between stars carry the step at the reveal),
 * step (the text gives only the step: four empty stars joined by arcs marked with it), rows (each number is a column of stars: nights of star counts).
 * The next value is computed from the bound numbers (constant step, constant ratio, or a step that grows by one) and appears only at the reveal.
 */
export function nextOf(a: number[]): number | null {
  if (a.length < 3) return null;
  const d = a.slice(1).map((x, k) => x - a[k]!);
  if (d.every((x) => x === d[0])) return a[a.length - 1]! + d[0]!;
  const r = a.slice(1).map((x, k) => x / a[k]!);
  if (r.every((x) => x === r[0]) && Number.isInteger(r[0]!)) return a[a.length - 1]! * r[0]!;
  const dd = d.slice(1).map((x, k) => x - d[k]!);
  if (dd.every((x) => x === dd[0])) return a[a.length - 1]! + d[d.length - 1]! + dd[0]!;
  return null;
}
const hop = (to: number, from: number, dbl: boolean) => (dbl ? '×2' : `${to >= from ? '+' : '−'}${Math.abs(to - from)}`);
const pad = (k: number, n: number) => ({ x: 8 + (84 * (k + 0.5)) / n, y: 21 + Math.sin((k / Math.max(1, n - 1)) * Math.PI * 1.15 + 0.4) * -7 + (k % 2) * 1.5 });

export default function Chain({ scene }: ArchetypeProps) {
  const d = defOf(scene);
  const raw = nums(scene);
  // arith4: four piles from a start and a step; step with a start and a step bound: the first three terms of the count, then the next one
  const counted = d.x === 'step' && raw.length >= 2;
  const vals = d.x === 'arith4' ? Array.from({ length: 4 }, (_, k) => raw[0]! + raw[1]! * k) : counted ? [0, 1, 2].map((k) => raw[0]! + raw[1]! * k) : raw;
  const R = scene.revealed;
  const ansNum = R && scene.shown && /^\d+$/.test(scene.shown) ? Number(scene.shown) : undefined;
  if (d.x === 'rows' || d.x === 'arith4') {
    // reveal: a rows question gets the pile it asks for; an arith4 one (day ten is too big to stack) gets a far column with the answer plate
    if (ansNum !== undefined && d.x === 'rows') vals.push(ansNum);
    const far = ansNum !== undefined && d.x === 'arith4' && !!scene.spec.bind.t1;
    // start and step given, "how many on the fourth evening": the fourth pile is the answer, so it stays a ? until the reveal
    const hideLast = d.x === 'arith4' && !scene.spec.bind.t1 && !R;
    const mx = Math.max(...vals, 1);
    // one star size for every pile, small enough that the biggest pile fits its column (82 units shared, 26 units tall): piles never touch
    const cols = Math.ceil(Math.sqrt(mx));
    const sz = Math.min(5, (82 / (vals.length + (far ? 1 : 0)) - 3) / cols, 26 / Math.ceil(mx / cols));
    return (
      <Frame scene={scene} glyphs={[d.g]}>
        <div className="ch-rows" style={css({ '--cn': vals.length + (far ? 1 : 0), '--sz': sz.toFixed(2) })}>
          {vals.map((v, k) => (
            <div key={k} className="ch-col mv-unit" style={css({ '--i': k })}>
              <div className="ch-stack" style={css({ '--cols': Math.min(cols, v), '--mx': mx })}>
                {Array.from({ length: hideLast && k === vals.length - 1 ? 0 : v }, (_, j) => (
                  <i key={j} style={css({ '--j': j })}><Item g={d.g} i={k + j} /></i>
                ))}
              </div>
              <Plate v={hideLast && k === vals.length - 1 ? '?' : v} i={k} tone={hideLast && k === vals.length - 1 ? 'q' : 'n'} className="mv-pulse" />
            </div>
          ))}
          {far && (
            <div className="ch-col mv-unit ch-far" style={css({ '--i': vals.length })}>
              <div className="ch-stack" style={css({ '--cols': 1, '--mx': mx })}><i style={css({ '--j': 0 })}><Item g={d.g} i={9} /></i></div>
              <Plate v={`… ${ansNum}`} i={vals.length} tone="n" />
            </div>
          )}
        </div>
      </Frame>
    );
  }
  const step = d.x === 'step' && !counted;
  const next = !step ? nextOf(vals) : null;
  const shown = step ? [null, null, null, null] : vals;
  const n = shown.length + (step ? 0 : 1);
  const doubles = vals.length > 2 && vals.every((v, k) => k === 0 || v === vals[k - 1]! * 2);
  const pts = Array.from({ length: n }, (_, k) => pad(k, n));
  const line = pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
  return (
    <Frame scene={scene} glyphs={[d.g]}>
      <div className="ch-sky">
        <svg viewBox="0 0 100 50" className="ch-lines" aria-hidden preserveAspectRatio="none">
          <path d={line} fill="none" stroke="rgb(190 230 255 / 0.75)" strokeWidth="0.5" strokeLinecap="round" strokeDasharray="1.2 1.2" />
        </svg>
        {pts.map((p, k) => {
          const last = !step && k === n - 1;
          const label = last ? (R && next !== null ? next : '?') : step ? (R && vals[0] ? (k + 1) * vals[0]! : '?') : shown[k];
          return (
            <div key={k} className={`ch-star mv-unit ${last ? 'ch-next' : ''}`} style={css({ '--x': p.x, '--y': p.y, '--i': k })}>
              <div className="ch-st"><Item g={d.g} i={k} /></div>
              <Plate v={label} i={k} tone={last || step ? 'q' : 'n'} className="mv-pulse" />
            </div>
          );
        })}
        {step &&
          pts.slice(1).map((p, k) => (
            <b key={k} className="ch-step" style={css({ '--x': (p.x + pts[k]!.x) / 2, '--y': (p.y + pts[k]!.y) / 2 - 5, '--i': k })}>
              +{vals[0]}
            </b>
          ))}
        {R && !step && next !== null && vals.length >= 3 &&
          pts.slice(1).map((p, k) => (
            <b key={k} className="ch-step ch-step-r" style={css({ '--x': (p.x + pts[k]!.x) / 2, '--y': (p.y + pts[k]!.y) / 2 - 5, '--i': k })}>
              {hop(k + 1 < vals.length ? vals[k + 1]! : next, vals[k]!, doubles)}
            </b>
          ))}
      </div>
    </Frame>
  );
}
