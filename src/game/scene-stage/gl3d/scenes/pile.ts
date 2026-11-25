// Counted objects on the bay floor. Modes: add (a here, b arrive), sub (b of the a are taken away), pile (n objects), pairs (n pairs), packs (n crates of m plus loose),
// steps (a, minus b, plus c), gap (a slots, b filled; the rest fill at the reveal). A crate of ten is one bigger crate with a single x10 legend.
import { BoxGeometry, CylinderGeometry } from 'three';
import type { Ctx } from '../engine';
import { crateGeo, tokenGeo } from '../geo';
import { colour, counted, ease, plate, pop, solid, sparkles, stag } from '../kit';
import { PACK, type BayPlan } from '../plan';

type Spot = { x: number; z: number; s: number };
/** n spots in a w x d floor area centred on (cx, cz): as large as fits, at most max units apart. */
function spots(n: number, cx: number, cz: number, w: number, d: number, max = 1.0, fixedCols = 0): Spot[] {
  let best = { s: 0, cols: 1 };
  for (let cols = fixedCols || 1; cols <= (fixedCols || n); cols++) {
    const s = Math.min(w / cols, d / Math.ceil(n / cols), max);
    if (s > best.s) best = { s, cols };
  }
  const { s, cols } = best;
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, k) => {
    const r = Math.floor(k / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols;
    return { x: cx + ((k % cols) - (inRow - 1) / 2) * s, z: cz + (r - (rows - 1) / 2) * s, s };
  });
}

type Group = { n: number; cx: number; w: number; from: boolean; crates?: boolean; out?: number; pairs?: boolean; hole?: number };
type Item = { x: number; z: number; sc: number; from: boolean; crate: boolean; out: boolean; hole: boolean; idx: number; k: number; x1?: number; z1?: number; sc1?: number };

export function pile(c: Ctx, p: Extract<BayPlan, { kind: 'pile' }>) {
  const sol = solid(c);
  const sp = sparkles(c);
  const { a, b, c: third, mode, packed } = p;
  c.focus = true;
  c.pitch = mode === 'sub' ? 1.3 : 1.15;
  const groups: Group[] =
    mode === 'add' ? [{ n: a, cx: -3.6, w: 5.6, from: false, crates: packed }, { n: b, cx: 3.6, w: 5.6, from: true, crates: packed }]
    : mode === 'sub' ? [{ n: a, cx: 0, w: 11, from: false, out: b }]
    : mode === 'pairs' ? [{ n: a, cx: 0, w: 10, from: false, pairs: true }]
    : mode === 'packs' ? [{ n: a, cx: -3.6, w: 5.6, from: false, crates: true }, ...(third ? [{ n: third, cx: 4.2, w: 4, from: true }] : [])]
    : mode === 'steps' ? [{ n: a, cx: -3.6, w: 6, from: false, out: b }, { n: third, cx: 4.6, w: 3.6, from: true }]
    : mode === 'gap' ? [{ n: a, cx: 0, w: 11, from: false, hole: b }]
    : [{ n: a, cx: 0, w: 11, from: false }];
  const items: Item[] = [];
  let nCrate = 0;
  let nLoose = 0;
  groups.forEach((g) => {
    if (g.pairs) {
      spots(g.n, g.cx, 0.6, g.w - 1, 3.2, 1.7).forEach((s) => {
        for (const o of [-0.32, 0.32]) items.push({ x: s.x + o, z: s.z, sc: Math.min(1.9, s.s * 1.5), from: false, crate: false, out: false, hole: false, idx: nLoose++, k: items.length });
      });
      return;
    }
    // a crate group is n crates (packs mode) or, in a packed add, the packs of ten plus the loose rest
    const np = g.crates ? (packed ? Math.floor(g.n / PACK) : g.n) : 0;
    const nl = g.crates ? (packed ? g.n % PACK : 0) : g.n;
    spots(np + nl, g.cx, 0.6, g.w, mode === 'sub' ? 7 : 5.6, np ? 2.4 : g.hole !== undefined ? 1.8 : 2.2, !np && np + nl > 20 && mode !== 'add' ? 10 : 0).forEach((s, k) => {
      const crate = k < np;
      items.push({
        x: s.x, z: s.z, from: g.from, crate,
        sc: crate ? 2.2 : Math.max(0.8, Math.min(3.4, s.s * 1.45)) * (packed ? 0.8 : 1) * (g.hole !== undefined ? 0.62 : 1) * (p.token === 'person' ? 0.7 : 1),
        out: g.out !== undefined && k >= g.n - g.out,
        hole: g.hole !== undefined && k >= g.hole,
        idx: crate ? nCrate++ : nLoose++,
        k: items.length,
      });
    });
  });
  if (mode === 'sub') {
    // the reveal splits the start group: what stays on the left (lit), what was taken on the right (red, crossed out)
    const stay = items.filter((i) => !i.out);
    const gone = items.filter((i) => i.out);
    const put = (list: Item[], cx: number) =>
      spots(list.length, cx, 0.6, 5.2, 7, 2.2).forEach((q, k) => {
        const it = list[k]!;
        it.x1 = q.x;
        it.z1 = q.z;
        it.sc1 = Math.max(0.8, Math.min(3.4, q.s * 1.45));
      });
    put(stay, -3.1);
    put(gone, 3.1);
  }
  const loose = counted(c, tokenGeo(p.token), sol, Math.max(nLoose, 1));
  loose.mesh.count = nLoose;
  const crates = nCrate ? counted(c, crateGeo(1).scale(0.8, 0.8, 0.8), sol, nCrate) : null;
  // a crate of ten shows its ten objects inside (the crate is the holder, the objects are what is counted)
  const dots = crates && packed ? counted(c, tokenGeo(p.token), sol, nCrate * PACK) : null;
  if (dots) crates!.mesh.userData.counted = false;
  const slots = mode === 'gap' ? counted(c, new CylinderGeometry(0.4, 0.4, 0.04, 14), colour(c, '#ffffff', { roughness: 0.9 }), items.length) : null;
  if (slots) slots.mesh.userData.counted = false; // the slots are the floor marks, not counted objects
  const n = items.length;
  c.expect = dots ? nCrate * PACK + nLoose : items.filter((i) => !i.hole || p.total !== null).length; // the missing ones of a gap appear at the reveal
  // the given numbers on plates (totals only at the reveal)
  if (mode === 'pairs') plate(c, `${a}`, 'n', 0, 3.4, 0.6);
  else if (mode === 'packs') {
    plate(c, `${a}`, 'n', groups[0]!.cx, 3.4, 0.6);
    plate(c, `×${b}`, 'q', groups[0]!.cx, 2.4, 1.6, 0.9);
    if (third) plate(c, `+ ${third}`, 'q', groups[1]!.cx, 3.1, 0.6);
  } else if (mode === 'gap') {
    plate(c, `${a}`, 'q', 0, 3.4, 0.6);
    plate(c, `\u2713 ${b}`, 'n', 0, 2.4, 1.6, 0.9);
  } else groups.forEach((g, gi) => plate(c, `${g.n}`, gi ? 'q' : 'n', g.cx, 2.8, 0.6));
  if (mode === 'add') plate(c, '+', 'n', 0, 2.2, 0.6, 0.9);
  if (mode === 'sub' || mode === 'steps') plate(c, `− ${b}`, 'out', mode === 'sub' ? 3.1 : 0.2, 2.6, 1.2, 0.9);
  if (mode === 'add' && packed) plate(c, `×${PACK}`, 'q', -3.4, 2.2, 1.6, 0.9);
  if (p.total !== null && mode !== 'pile') plate(c, p.est ?? `${mode === 'gap' ? a - b : p.total}`, 'win', mode === 'sub' ? -3.1 : 0, mode === 'sub' ? 3.0 : 5.8, 0.6, 1.5);
  let fired = false;
  c.tick((an) => {
    items.forEach((it) => {
      const slide = it.from ? 1 - ease(an.enter * 2 - 0.3) : 0; // the arriving group slides in from the right
      const w = pop((an.enter * 2 - 0.15 - it.k * Math.min(0.02, 0.85 / Math.max(n, 1))) / 0.5);
      let x = it.x + slide * 9;
      let y = 0;
      let z = it.z;
      let s = Math.max(w, 0.001);
      if (it.hole) s = p.total !== null ? Math.max(pop((an.e * 2.2 - 0.2 - (it.k - b) * 0.05) / 0.5), 0.001) : 0.001; // the missing ones appear at the reveal
      else if (p.total !== null) {
        y = Math.sin(stag(an.e, it.k, n, 0.1, 0.7) * Math.PI) * 0.8; // a counting wave over every object
        if (mode === 'sub' && it.x1 !== undefined) {
          const g = ease((an.e - 0.1) / 0.5);
          x += (it.x1 - it.x) * g;
          z += (it.z1! - it.z) * g;
          s *= 1 + ((it.sc1! / it.sc) - 1) * g;
          if (it.out) s *= 1 - g * 0.15;
          else y += g * 0.25 * (1 + Math.sin(an.t * 5 + it.k * 0.5) * 0.3);
        } else if (it.out) {
          const g = ease((an.e - 0.1) / 0.6);
          x += g * 9;
          z += g * 1.2;
          s *= 1 - g * 0.2;
        }
      }
      (it.crate ? crates! : loose).set(it.idx, x, y, z, s * it.sc);
      if (!it.crate && n > 20) loose.tint(it.idx, Math.floor(it.k / 10) % 2 ? 0.8 : 1, Math.floor(it.k / 10) % 2 ? 0.92 : 1, Math.floor(it.k / 10) % 2 ? 1.2 : 1); // rows of ten alternate in colour: countable by tens
      if (it.crate && dots) {
        const k2 = (s * it.sc) / 2.2;
        for (let j = 0; j < PACK; j++) dots.set(it.idx * PACK + j, x + ((j % 5) - 2) * 0.36 * k2, y + 0.3 * k2, z + (Math.floor(j / 5) - 0.5) * 0.42 * k2, Math.max(0.62 * k2, 0.001));
      }
      slots?.set(it.k, it.x, 0.02, it.z, it.hole ? 1.6 : 0);
      if (it.out && !it.crate) loose.tint(it.idx, 1, mode === 'sub' && p.total !== null ? 0.3 : 0.65, mode === 'sub' && p.total !== null ? 0.3 : 0.6);
      else if (it.hole && p.total !== null && !it.crate) loose.tint(it.idx, 1.2, 0.85, 0.3);
      else if (mode === 'sub' && p.total !== null && !it.crate) loose.tint(it.idx, 1.15, 1.15, 0.7);
    });
    loose.commit();
    crates?.commit();
    dots?.commit();
    slots?.commit();
    if (!fired && an.ok && p.total !== null && an.e > 0.7) {
      fired = true;
      sp.go(0, 4, 0.6);
    }
  });
}

/** n containers of m objects (rows of chairs, tables of players, boxes of pawns): every container is a low tray with exactly m objects; the total shows at the reveal. */
export function array(c: Ctx, p: Extract<BayPlan, { kind: 'array' }>) {
  const { n, m } = p;
  if (p.big) return bigGroups(c, p);
  const rowsN = Math.ceil(n / 6);
  const perRow = Math.ceil(n / rowsN);
  const slotW = 11 / perRow;
  const w = Math.min(slotW * 0.92, 3.4);
  const depth = rowsN > 2 ? 1.7 : rowsN > 1 ? 2.1 : 2.6;
  const k = Math.min(m, Math.max(1, Math.ceil(Math.sqrt((m * w) / depth))));
  const sz = Math.min(1.2, (w * 0.9) / k, (depth * 0.85) / Math.ceil(m / k));
  const inst = counted(c, tokenGeo(p.token), solid(c), n * m);
  const trays = counted(c, new BoxGeometry(w, 0.12, Math.min(depth, 0.5 + Math.ceil(m / k) * sz)), colour(c, '#c9a27a', { roughness: 0.9 }), n);
  const sp = sparkles(c);
  plate(c, `${n}`, 'n', -5.4, 3.6, 0.6, 1);
  plate(c, `${m}`, 'q', 5.4, 3.6, 0.6, 1);
  if (p.total !== null) plate(c, `${p.total}`, 'win', 0, 5.4, 0.6, 1.3);
  let fired = false;
  c.tick((a) => {
    for (let i = 0; i < n; i++) {
      const cx = -5.5 + slotW * ((i % perRow) + 0.5);
      const cz = 1.8 - Math.floor(i / perRow) * (depth + 0.4);
      trays.set(i, cx, 0.06, cz, pop((a.enter * 2 - i * 0.06) / 0.5));
      for (let j = 0; j < m; j++) {
        const wave = Math.sin(stag(a.e, i * m + j, n * m, 0.1, 0.8, 0.2) * Math.PI) * 0.5;
        const dim = p.empty !== undefined && i * m + j >= n * m - p.empty;
        if (dim) inst.tint(i * m + j, 0.35, 0.35, 0.4);
        inst.set(i * m + j, cx + ((j % k) - (k - 1) / 2) * sz * 1.05, 0.12 + wave, cz + (Math.floor(j / k) - (Math.ceil(m / k) - 1) / 2) * sz * 1.05, sz * 1.9 * pop((a.enter * 2 - 0.1 - i * Math.min(0.06, 0.8 / n) - j * 0.01) / 0.5));
      }
    }
    inst.commit();
    trays.commit();
    if (!fired && a.ok && p.total !== null && a.e > 0.8) {
      fired = true;
      sp.go(0, 4.5, 0.6);
    }
  });
}

/** Groups too big to count one by one (9 sacks of 48): every group is one sack with its count; the total shows at the reveal. */
function bigGroups(c: Ctx, p: Extract<BayPlan, { kind: 'array' }>) {
  const { n, m } = p;
  const holder = p.holder === 'tray' ? 'crate' : p.holder === 'box' ? 'box' : 'bag';
  const perRow = Math.min(n, 5);
  const rowsN = Math.ceil(n / perRow);
  const slotW = 11 / perRow;
  const inst = counted(c, tokenGeo(holder), solid(c), n);
  const sp = sparkles(c);
  for (let i = 0; i < n; i++) plate(c, `${m}`, 'q', -5.5 + slotW * ((i % perRow) + 0.5), 2.4 - Math.floor(i / perRow) * 0.2, 1.6 - Math.floor(i / perRow) * 2.4 + 0.8, 1);
  if (p.total !== null) plate(c, `${p.total}`, 'win', 0, 5.6, 0.6, 1.3);
  const sc = Math.min(2.6, slotW * 1.3, 4.2 / rowsN);
  let fired = false;
  c.tick((a) => {
    for (let i = 0; i < n; i++) inst.set(i, -5.5 + slotW * ((i % perRow) + 0.5), Math.sin(stag(a.e, i, n, 0.1, 0.8, 0.25) * Math.PI) * 0.6, 1.6 - Math.floor(i / perRow) * 2.4, sc * pop((a.enter * 2 - 0.1 - i * 0.05) / 0.5));
    inst.commit();
    if (!fired && a.ok && p.total !== null && a.e > 0.8) {
      fired = true;
      sp.go(0, 5, 0.6);
    }
  });
}
