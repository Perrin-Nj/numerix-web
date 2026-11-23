'use client';
import type { ReactNode } from 'react';
import { Item } from './kit';
import { Frame, Plate, css, defOf, nums, u } from './parts';
import type { ArchetypeProps } from '../../registry';
import './espace.css';

/**
 * espace.room-count: a counted story in the room its words name (cargo bay, greenhouse, crew quarters, station exterior, planet surface).
 * Modes (setting `es:<mode>:<glyph>:<room>`): add (a here, b arrive), sub (a here, b are taken: ringed from the start), pile (n objects),
 * packs (n packs of m, plus r loose), share (T objects into holders of k; the holders are born at the reveal), deal (T objects among n holders).
 * Above 30 objects a pack of ten is ONE icon labelled x10 (4 packs and 6 tools are 46 tools). Every number comes from the question; totals and
 * remainders are computed from the bound numbers and appear only at the reveal.
 */
type Spot = { x: number; y: number; s: number };
/** Place n objects in a w x h unit area, as large as fits (max 8 units), standing on rows. */
function spots(n: number, w: number, h: number, max = 11): Spot[] {
  if (n <= 0) return [];
  let best = { s: 0, cols: 1 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const s = Math.min(w / cols, h / rows / 1.0, max);
    if (s > best.s) best = { s, cols };
  }
  const { s, cols } = best;
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, k) => {
    const r = Math.floor(k / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const c = k % cols;
    return { x: (c - (inRow - 1) / 2) * s * 1.02, y: (r - (rows - 1) / 2) * s * 1.02, s };
  });
}
const PACK = 10;
const Cluster = ({ n, g, x, y, w, h, tag, k0 = 0, outFrom = -1, tone = 'n', packs = true, max = 11, pk = false }: { n: number; g: string; x: number; y: number; w: number; h: number; tag?: boolean; k0?: number; outFrom?: number; tone?: 'n' | 'q'; packs?: boolean; max?: number; pk?: boolean }) => {
  const packed = packs && (pk || n > 30);
  const np = packed ? Math.floor(n / PACK) : 0;
  const lone = packed ? n - np * PACK : n;
  const all = spots(np + lone, w, h, packed ? 14 : n <= 4 ? Math.max(max, 17) : max);
  return (
    <div className="es-cl" style={css({ '--cx': x, '--cy': y, '--cw': w, '--ch': h })}>
      {all.map((p, k) => (
        <div key={k} className={`es-unit mv-unit ${outFrom >= 0 && k >= outFrom ? 'es-out' : ''}`} style={css({ '--x': p.x, '--y': p.y, '--s': p.s, '--i': k, '--j': k })}>
          <Item g={g} i={k0 + k + (k < np ? 0 : 1)} />
          {k < np && <b className={`es-x10 ${k === 0 ? 'es-x10-first' : ''}`}>×{PACK}</b>}
        </div>
      ))}
      {tag && <Plate v={n} tone={tone} i={k0} className="es-tag" />}
    </div>
  );
};

export default function RoomCount({ scene }: ArchetypeProps) {
  const d = defOf(scene);
  const [a = 0, b = 0, c = 0] = nums(scene);
  const R = scene.revealed;
  const g = d.g;
  const glyphs = [g, d.x === 'crew' ? 'crew' : g, 'box', 'crate', 'day', 'shuttle', 'crew', 'rover'];
  let body: ReactNode;
  if (d.mode === 'add') {
    const t = a + b;
    body = (
      <>
        <Cluster n={a} g={g} x={4} y={9} w={44} h={27} tag pk={t > 36} />
        <b className="es-op" style={css({ '--x': 51, '--y': 22 })}>+</b>
        <div className="es-arrive">
          <Cluster n={b} g={g} x={54} y={9} w={32} h={27} tag k0={a} tone="q" pk={t > 36} />
        </div>
        {d.room === 'cargo' && [14, 70].map((x, k) => <div key={k} className="es-truck" style={css({ '--x': x, '--i': k })}><Item g="rover" i={k + 2} /></div>)}
        {R && <Plate v={`= ${t}`} tone="n" className="es-total" />}
      </>
    );
  } else if (d.mode === 'sub') {
    body = (
      <>
        <Cluster n={a} g={g} x={4} y={10} w={78} h={26} tag outFrom={a > 30 ? -1 : a - b} />
        <div className="es-brace" style={css({ '--b': b, '--a': a })}>
          <Plate v={`− ${b}`} tone="out" i={1} />
        </div>
        <i className="es-gate" />
        {R && <Plate v={`${a - b}`} tone="n" className="es-total" />}
      </>
    );
  } else if (d.mode === 'packs') {
    const sp = spots(a, 52, 27, 11);
    body = (
      <>
        <div className="es-cl" style={css({ '--cx': 3, '--cy': 9, '--cw': 52, '--ch': 27 })}>
          {sp.map((p, k) => (
            <div key={k} className="es-unit mv-unit" style={css({ '--x': p.x, '--y': p.y, '--s': p.s, '--i': k, '--j': k })}>
              <Item g={g} i={k} />
              <b className={`es-x10 ${k === 0 ? 'es-x10-first' : ''}`}>×{b}</b>
            </div>
          ))}
          <Plate v={a} tone="n" i={0} className="es-tag" />
        </div>
        {c > 0 && <b className="es-op" style={css({ '--x': 58, '--y': 22 })}>+</b>}
        {c > 0 && <Cluster n={c} g={g} x={62} y={9} w={28} h={27} tag k0={a} tone="q" />}
        {R && <Plate v={`= ${a * b + c}`} tone="n" className="es-total" />}
      </>
    );
  } else if (d.mode === 'pairs') {
    const sp = spots(a, 76, 28, 15);
    body = (
      <>
        <div className="es-cl" style={css({ '--cx': 4, '--cy': 8, '--cw': 76, '--ch': 28 })}>
          {sp.map((p, k) => (
            <div key={k} className="es-pair mv-unit" style={css({ '--x': p.x, '--y': p.y, '--s': p.s, '--i': k })}>
              <i style={css({ '--o': -1 })}><Item g={g} i={k * 2} /></i>
              <i style={css({ '--o': 1 })}><Item g={g} i={k * 2 + 1} /></i>
            </div>
          ))}
          <Plate v={a} tone="n" i={0} className="es-tag" />
        </div>
        {R && <Plate v={`${a} × 2`} tone="n" className="es-total" />}
      </>
    );
  } else if (d.mode === 'steps') {
    body = (
      <>
        <Cluster n={a} g={g} x={3} y={9} w={44} h={27} tag />
        <b className="es-op" style={css({ '--x': 49, '--y': 14 })}>−</b>
        <Plate v={`− ${b}`} tone="out" i={1} className="es-step1" />
        <div className="es-arrive">
          <Cluster n={c} g={g} x={56} y={9} w={32} h={27} tag k0={a} tone="q" />
        </div>
        {R && <Plate v={`= ${a - b + c}`} tone="n" className="es-total" />}
      </>
    );
  } else if (d.mode === 'gap') {
    const have = b;
    body = (
      <>
        <div className="es-cl" style={css({ '--cx': 4, '--cy': 7, '--cw': 78, '--ch': 29 })}>
          {spots(a, 78, 29, 8).map((p, k) => (
            <div key={k} className={`es-unit ${k < have ? 'mv-unit' : 'mv-gap es-hole'}`} style={css({ '--x': p.x, '--y': p.y, '--s': p.s, '--i': k, '--j': k })}>
              {k < have || R ? <Item g={g} i={k} /> : <i className="es-slot" />}
            </div>
          ))}
          <Plate v={a} tone="q" i={0} className="es-tag" />
        </div>
        <Plate v={`${have}`} tone="n" i={1} className="es-have" />
      </>
    );
  } else if (d.mode === 'share' || d.mode === 'deal') {
    const holders = d.mode === 'share' ? Math.floor(a / b) : b;
    const per = d.mode === 'share' ? b : Math.floor(a / b);
    const left = a - holders * per;
    const hold = d.x || 'box';
    // "how many shuttles at least": the shuttle that takes the rest is drawn too, so the picture shows every one that is needed
    const extra = hold === 'shuttle' && left > 0 ? 1 : 0;
    const hn = holders + extra;
    body = R ? (
      <>
        <div className="es-holders" style={css({ '--fit': hn <= 2 ? 0.95 : 0.7, '--hn': hn, '--is': hn <= 4 ? 4.6 : 3.2, '--cols': hn <= 4 ? 2 : 4 })}>
          {Array.from({ length: hn }, (_, h) => (
            <div key={h} className="es-holder" style={css({ '--i': h })}>
              <div className="es-hold-ic"><Item g={hold} i={h} /></div>
              <div className="es-hold-in">
                {Array.from({ length: h < holders ? per : left }, (_, k) => (
                  g === 'panel' ? <i key={k} className="es-hi es-pcell" style={css({ '--k': k, '--i': h * per + k })} /> : <Item key={k} g={g} i={h + k} className="es-hi" style={css({ '--k': k, '--i': h * per + k })} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="es-left">
          {Array.from({ length: extra ? 0 : left }, (_, k) => (
            g === 'panel' ? <i key={k} className="mv-unit es-li es-pcell" style={css({ '--i': k })} /> : <Item key={k} g={g} i={k + 2} className="mv-unit es-li" style={css({ '--i': k })} />
          ))}
          {!extra && <Plate v={left} tone="out" i={2} />}
        </div>
        <Plate v={`${hn}`} tone="n" className="es-total" />
      </>
    ) : (
      <>
        <Cluster n={a} g={g} x={3} y={9} w={48} h={28} tag />
        <div className="es-holders es-one" style={css({ '--hn': 1 })}>
          <div className="es-holder">
            <div className="es-hold-ic"><Item g={hold} i={1} /></div>
            <div className="es-hold-in es-empty">
              {Array.from({ length: Math.min(b, 12) }, (_, k) => <i key={k} className="mv-gap" style={css({ '--k': k, '--i': k })} />)}
            </div>
            <Plate v={d.mode === 'share' ? b : `${a}÷${b}`} tone="q" className="es-tag" />
          </div>
        </div>
      </>
    );
  } else {
    body = <Cluster n={a} g={g} x={6} y={7} w={76} h={30} tag />;
  }
  return (
    <Frame scene={scene} glyphs={glyphs}>
      {body}
    </Frame>
  );
}
void u;
