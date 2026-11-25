// Pure binding of a ResolvedScene to a 3D plan: what to draw, no three.js. Reveal-only numbers are null until scene.revealed (spoiler-free question phase).
// A plan is null when the shape has no 3D picture: the caller then draws the 2.5D archetype of the same setting.
import type { ResolvedScene } from '../spec';
import { tokenOf, type Token } from './geo';

export type BayPlan =
  | { kind: 'tanks'; vals: number[]; capSmall: number; total: number | null; capBig: number | null }
  | { kind: 'tags'; token: Token; labels: string[]; win: number | null; rank: number[] | null; pair: string[] | null; right?: string[] | null; pairTo?: number[] | null; ans?: number | null }
  | { kind: 'share'; token: Token; deal: boolean; holder: string; a: number; b: number; holders: number | null; left: number | null; /** a plain number the question asks for ("how many shuttles"), reveal only */ asked?: number | null }
  | { kind: 'pile'; mode: 'add' | 'sub' | 'pile' | 'pairs' | 'packs' | 'steps' | 'gap'; token: Token; a: number; b: number; c: number; packed: boolean; total: number | null; est?: string | null }
  | { kind: 'cols'; token: Token; vals: number[]; hideLast?: boolean; /** the asked night when it comes after the columns drawn, and its value at the reveal */ ask?: number | null; askVal?: number | null }
  | { kind: 'route'; mode: 'route' | 'remain' | 'two'; token: Token; a: number; b: number; ans: number | null; /** reveal of a rounding question: the legs rounded to `step` and the rounded answer */ rnd: { a: number; b: number; step: number; est: boolean } | null }
  | { kind: 'span'; hours: number; lenH: number; start: string; end: string | null; hops: string[]; msgs: number; every: number; total: string | null; token: Token; /** conversion questions: the span in hours and in minutes (b given at the question only when bGiven) */ conv: { a: string; b: string; bGiven: boolean; per?: string } | null; /** arrival clock of a start + duration question, reveal only */ arrive: string | null }
  | { kind: 'gauge'; mode: 'add' | 'sub' | 'steps' | 'two' | 'cmp'; a: number; b: number; c: number; cap: number; end: number | null; label: string | null }
  | { kind: 'wing'; dims: { rows: number; cols: number }[]; broken: number; total: number | null; sat: boolean; /** the estimate ("≈ 100") the question asks for, reveal only */ est?: string | null }
  | { kind: 'chain'; token: Token; vals: number[]; next: number | null; rule: boolean; step: number | null }
  | { kind: 'values'; mode: 'sum' | 'more' | 'take'; pieces: { token: Token; coins: number }[]; x: number; ans: number | null }
  | { kind: 'array'; token: Token; holder: string; n: number; m: number; total: number | null; empty?: number; big?: boolean }
  | { kind: 'grid'; mode: 'path' | 'count' | 'ring' | 'rover'; legs: { right: number; down: number } | null; cols: number; rows: number; cells: { x: number; y: number; label: string }[]; sel: number[]; target: number | null; ans: number | null }
  | { kind: 'clock'; hour: number; minute: number; rockets: number; view: 'pad' | 'approach' | 'docked' | 'clinic'; pets?: Token[]; /** a duration question, reveal only: the sweep from `from` (minutes after 12:00) over `mins`, the label of the length and the clock the span ends at */ dur?: { from: number; mins: number; label: string; end: string; asked: 'end' | 'len' } | null }
  | { kind: 'vial'; total: number; given: number; left: number | null; pet?: Token }
  | { kind: 'track'; lo: number; hi: number; steps: number; labels: number[]; at: number; mark: number | null; gap: [number, number] | null; ans: number | null; token?: Token; pins?: { v: number; label: string }[] };

/** The 2.5D archetype that draws the same setting; the 3D scene falls back to it. */
export function fallbackOf(scene: ResolvedScene): string {
  if (scene.spec.setting.startsWith('espace-clock-')) return 'espace.control-clock';
  const mode = scene.spec.setting.split(':')[1] ?? '';
  return mode === 'tags' ? 'espace.tag-row' : mode === 'gauge' ? 'espace.gauge' : mode === 'hop' ? 'espace.hop-line' : mode === 'grid' ? 'espace.star-grid' : mode === 'wing' ? 'espace.panel-wing' : mode === 'chain' ? 'espace.chain' : 'espace.room-count';
}

/** Bound numbers n0..n7 in order, the ones that exist. */
const nums = (s: ResolvedScene): number[] => Array.from({ length: 8 }, (_, k) => s.values[`n${k}`]).filter((v): v is number => v !== undefined);
/** The registered 3D archetype id of a plan: they share one host module, the id names the family for the gate and the API list. */
export const ARCHETYPE_OF: Record<BayPlan['kind'], string> = { tanks: 'espace.bay3d', tags: 'espace.bay3d', share: 'espace.bay3d', pile: 'espace.pile3d', track: 'espace.track3d', clock: 'espace.clock3d', grid: 'espace.grid3d', array: 'espace.pile3d', vial: 'espace.bay3d', values: 'espace.pile3d', chain: 'espace.chain3d', gauge: 'espace.bay3d', wing: 'espace.wing3d', cols: 'espace.chain3d', route: 'espace.track3d', span: 'espace.track3d' };
export const archetypeFor = (kind: BayPlan['kind'], _world: string): string => ARCHETYPE_OF[kind];

/** The next term of a constant step, a constant whole ratio, or a step that grows by one; null when the numbers show no such rule. */
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
/** A match question: the right column as the child sees it, and (at the reveal) which right card is each left card's partner. */
export function matchCols(p: { t?: string[]; pair?: string[]; right?: string[] }, R: boolean): { right: string[] | null; pairTo: number[] | null } {
  const right = p.right && p.right.length === p.t?.length && p.right.length >= 2 ? p.right : null;
  if (!right) return { right: null, pairTo: null };
  const used = new Set<number>();
  const pairTo = R && p.pair?.length === right.length ? p.pair.map((x) => { const j = right.findIndex((r, k) => r === x && !used.has(k)); if (j >= 0) used.add(j); return j; }) : null;
  return { right, pairTo: pairTo && pairTo.every((j) => j >= 0) ? pairTo : null };
}
const niceMax = (v: number) => {
  const m = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  return Math.ceil(v / (m / 2)) * (m / 2);
};
export const MAX_3D = 70;
export const PACK = 10;

/** Null when this scene shape has no 3D picture (the caller then draws the 2.5D archetype). */
/** "9 + 8" -> "17" for every label of a sort-by-result question (null when a label is not a plain sum or difference). */
const sums = (labels: string[]): string[] | null => {
  const out = labels.map((t) => {
    const m = /^\s*(\d+)\s*([+\-−×x*])\s*(\d+)\s*$/.exec(t);
    if (!m) return null;
    const a = Number(m[1]);
    const b = Number(m[3]);
    return String(m[2] === '+' ? a + b : m[2] === '-' || m[2] === '−' ? a - b : a * b);
  });
  return out.every((v) => v !== null) ? (out as string[]) : null;
};

export function bayPlan(scene: ResolvedScene, locale: 'fr' | 'en' = 'fr'): BayPlan | null {
  if (scene.spec.archetype.split('.')[0] !== 'espace') return null;
  const [, mode = '', g = '', , x = ''] = scene.spec.setting.split(':');
  const R = scene.revealed;
  const N = nums(scene);
  if (scene.spec.setting.startsWith('espace-clock-')) {
    const head = scene.spec.setting.split(':')[0]!;
    const view = head.endsWith('approach') ? 'approach' : head.endsWith('docked') ? 'docked' : 'pad';
    const { hour, minute = 0, rockets = 1 } = scene.values;
    if (hour === undefined) return null;
    const kindDur = scene.spec.setting.split(':')[1];
    const ansN = R && scene.shown ? Number(scene.shown.replace(/[^0-9]/g, '')) : NaN;
    let dur: { from: number; mins: number; label: string; end: string; asked: 'end' | 'len' } | null = null;
    if (kindDur && Number.isFinite(ansN) && ansN > 0) {
      const clk = (hour % 12) * 60 + minute;
      const fmt = (m: number) => `${Math.floor(((m % 720) + 720) % 720 / 60) || 12}:${String(((m % 720) + 720) % 60).padStart(2, '0')}`;
      const lenText = (m: number) => (m % 60 === 0 ? `+${m / 60} h` : m < 60 ? `+${m} min` : `+${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`);
      if (kindDur === 'end') {
        const mins = (((ansN % 12) * 60 - clk) % 720 + 720) % 720 || 720;
        dur = { from: clk, mins, label: lenText(mins), end: fmt(clk + mins), asked: 'end' };
      } else if (kindDur === 'dur') dur = { from: clk, mins: ansN, label: `${ansN} min`, end: fmt(clk + ansN), asked: 'len' };
      else dur = { from: clk - ansN, mins: ansN, label: `${ansN} min`, end: fmt(clk), asked: 'len' };
    }
    return { kind: 'clock', hour, minute, rockets: Math.max(1, Math.min(6, rockets)), view, dur };
  }
  if (mode === 'grid') {
    const [gm = '', ...rest] = x.split('.');
    const cols = scene.values.cols;
    const rows = scene.values.rows;
    if (gm === 'panels') return cols && rows && cols <= 12 && rows <= 12 ? { kind: 'wing', dims: [{ rows, cols }], broken: 0, total: R ? rows * cols : null, sat: false, est: R && scene.shown?.startsWith('≈') ? scene.shown : null } : null;
    if (gm !== 'path' && gm !== 'count' && gm !== 'ring' && gm !== 'rover') return null;
    const cells = ((scene.visual?.data as { cells?: { x: number; y: number; label?: { fr?: string; en?: string } }[] } | undefined)?.cells ?? []).slice(0, 12).map((c) => ({ x: c.x, y: c.y, label: c.label?.[locale] ?? '' }));
    if (!cols || !rows || cols > 6 || rows > 6 || !cells.length || cells.some((c) => c.x < 1 || c.y < 1 || c.x > cols || c.y > rows)) return null;
    const sel = rest.map(Number).filter((k) => Number.isInteger(k) && k >= 0 && k < cells.length);
    if (!sel.length || (gm === 'path' && sel.length < 2)) return null;
    const legs = gm === 'rover' && R ? { right: scene.values.n0 ?? 0, down: scene.values.n1 ?? 0 } : null;
    // "which square is it": the asked cell stays a "?" until the reveal
    return { kind: 'grid', mode: gm, legs, cols, rows, cells, sel: R ? sel : [], target: gm === 'ring' && !R ? sel[0]! : null, ans: R && scene.values.ans !== undefined ? scene.values.ans : null };
  }
  if (mode === 'gauge' && (x === 'add' || x === 'sub' || x === 'steps' || x === 'two' || x === 'cmp')) {
    const [a, b, c = 0] = N;
    if (!a || !b || (x === 'steps' && !c)) return null;
    const end = x === 'add' || x === 'two' ? a + b : x === 'steps' ? a - b + c : x === 'sub' ? a - b : Math.abs(a - b);
    if (end < 0) return null;
    const cap = niceMax(x === 'cmp' ? Math.max(a, b) : Math.max(a, a + b, x === 'steps' ? a - b + c : 0, x === 'steps' ? a + c : 0));
    return { kind: 'gauge', mode: x, a, b, c, cap, end: R ? end : null, label: R ? (scene.shown?.startsWith('≈') ? scene.shown : `${end} L`) : null };
  }
  if (mode === 'chain') {
    if (x === 'rows' || x === 'arith4') {
      const vals = x === 'arith4' ? Array.from({ length: 4 }, (_, k) => (N[0] ?? 0) + (N[1] ?? 0) * k) : N;
      const ord = Number(/:o(\d+)$/.exec(scene.spec.setting)?.[1] ?? 0);
      const far = ord > vals.length ? ord : 0; // the asked night is not one of the columns: a ghost column stands for it
      const shownN = R && scene.shown ? Number(scene.shown.replace(/[^0-9]/g, '')) : NaN;
      return vals.length < 2 || vals.length > 5 || Math.max(...vals) > 40 || Math.min(...vals) < 0 ? null : { kind: 'cols', token: tokenOf(g), vals, hideLast: x === 'arith4' && !R && !far, ask: far || null, askVal: far && Number.isFinite(shownN) ? shownN : null }; // the last term is the asked one: it stays a question mark until the reveal
    }
    if (x === 'step') {
      if (N.length >= 2) return { kind: 'chain', token: tokenOf(g), vals: [0, 1, 2].map((k) => N[0]! + N[1]! * k), next: R ? N[0]! + N[1]! * 3 : null, rule: true, step: null };
      {
        const sn = R && scene.shown ? (scene.shown.match(/\d+/g) ?? []).map(Number) : [];
        if (N.length === 1 && sn.length >= 3) return { kind: 'chain', token: tokenOf(g), vals: sn.slice(0, -1), next: sn[sn.length - 1]!, rule: true, step: null };
      }
      return N.length === 1 ? { kind: 'chain', token: tokenOf(g), vals: [], next: null, rule: true, step: N[0]! } : null;
    }
    if (N.length < 3 || N.length > 6) return null;
    const next = nextOf(N);
    if (next === null) return null;
    return { kind: 'chain', token: tokenOf(g), vals: N, next: R ? next : null, rule: x === 'rule', step: null };
  }
  if (mode === 'wing') {
    const [n0 = 0, n1 = 0, n2 = 0, n3 = 0] = N;
    const sat = x.endsWith('-sat');
    const dims = x === 'mixed' ? [{ rows: n0, cols: n1 }, { rows: n2, cols: n3 }] : x === 'wings' ? Array.from({ length: n0 }, () => ({ rows: n1, cols: n2 })) : x === 'one' || x === 'broken' || sat ? [{ rows: n0, cols: n1 }] : null;
    if (!dims || dims.length > 3 || dims.some((d) => d.rows < 1 || d.cols < 1 || d.rows > 12 || d.cols > 12)) return null;
    const broken = x === 'broken' ? n2 : 0;
    const total = dims.reduce((sum, d) => sum + d.rows * d.cols, 0) - broken;
    return { kind: 'wing', dims, broken, total: R ? total : null, sat, est: R && scene.shown?.startsWith('≈') ? scene.shown : null };
  }
  if (mode === 'gauge' && x === 'bars') {
    const bars = (scene.visual?.data as { bars?: { value: number }[] } | undefined)?.bars ?? [];
    const vals = bars.map((b) => b.value).filter((v) => Number.isFinite(v) && v >= 0);
    if (vals.length < 1 || vals.length > 4) return null;
    const total = vals.reduce((s, v) => s + v, 0);
    return { kind: 'tanks', vals, capSmall: niceMax(Math.max(...vals)), total: R ? total : null, capBig: R ? niceMax(total) : null };
  }
  if (mode === 'tags') {
    let p = scene.visual?.kind === 'plates' ? (scene.visual.data as { t?: string[]; rank?: number[]; win?: number; pair?: string[]; right?: string[] }) : null;
    if (!p) {
      // painted numbers: the plates are the bound numbers; they sort by value at the reveal
      const painted = N.filter((_, k) => scene.spec.bind[`n${k}`] !== undefined);
      p = { t: painted.map(String), rank: painted.map((v, i) => painted.filter((w, j) => w < v || (w === v && j < i)).length), win: -1 };
    }
    if (!p.t?.length || p.t.length > 6) return null;
    const win = p.win !== undefined && p.win >= 0 ? p.win : null;
    return { kind: 'tags', token: tokenOf(g), labels: p.t, win: R ? win : null, rank: R && win === null && p.rank?.length === p.t.length ? p.rank : null, pair: R && p.pair?.length === p.t.length ? p.pair : R && p.rank?.length === p.t.length ? sums(p.t) : null, ...matchCols(p, R) };
  }
  if (mode === 'pile' && g === 'day' && N[0] && N[0] <= 7) {
    // days to hours: the same blocks counted in days and in hours (24 h each)
    const d = N[0];
    return { kind: 'span', hours: d, lenH: d, start: `${d} j`, end: null, hops: [], msgs: 0, every: 0, total: R ? `${d * 24} h` : null, token: 'crate', conv: { a: `${d} jours`, b: `${d * 24} h`, bGiven: false, per: '24 h' }, arrive: null };
  }
  if (mode === 'share' || mode === 'deal') {
    const [a, b] = N;
    const deal = mode === 'deal';
    if (!a || !b || a > MAX_3D) return null;
    const holders = deal ? b : Math.floor(a / b);
    const per = deal ? Math.floor(a / b) : b;
    if (holders < 1 || holders > 8 || per < 1) return null;
    return { kind: 'share', token: tokenOf(g), deal, holder: x || 'box', a, b, holders: R ? holders : null, left: R ? a - holders * per : null, asked: R && scene.shown && /^[0-9]+$/.test(scene.shown) ? Number(scene.shown) : null };
  }
  if (mode === 'add' || mode === 'sub' || mode === '' || mode === 'pile' || mode === 'pairs' || mode === 'packs' || mode === 'steps' || mode === 'gap') {
    const [a, b = 0, c = 0] = N;
    const m = mode === '' ? 'pile' : mode;
    if (!a || ((m === 'add' || m === 'sub' || m === 'packs' || m === 'steps' || m === 'gap') && !b)) return null;
    const packed = m === 'add' && a + b > 36;
    const side = (n: number) => (packed ? Math.floor(n / PACK) + (n % PACK) : n);
    if (packed && Math.floor(Math.max(a, b) / PACK) > 8) return null;
    if (m === 'add' && (side(a) > 30 || side(b) > 30)) return null;
    if ((m === 'sub' || m === 'pile' || m === 'steps') && a > 130) return null;
    if ((m === 'sub' || m === 'steps' || m === 'gap') && b >= a) return null;
    if (m === 'pairs' && a * 2 > 60) return null;
    if (m === 'packs' && (a > 8 || c > 12)) return null;
    if (m === 'steps' && (!c || c > 70)) return null;
    if (m === 'gap' && a > 24) return null;
    const total = m === 'add' ? a + b : m === 'sub' ? a - b : m === 'pairs' ? a * 2 : m === 'packs' ? a * b + c : m === 'steps' ? a - b + c : a;
    return { kind: 'pile', mode: m, token: tokenOf(g), a, b: m === 'pile' || m === 'pairs' ? 0 : b, c, packed, total: R ? total : null, est: R && scene.shown?.startsWith('≈') ? scene.shown : null };
  }
  if (mode === 'hop' && (x === 'route' || x === 'route-remain' || x === 'two')) {
    const [n0 = 0, n1 = 0] = N;
    if (!n0 || !n1) return null;
    const m = x === 'two' ? 'two' : x === 'route' ? 'route' : 'remain';
    if ((m !== 'route' && n1 >= n0) || (m === 'two' && n1 >= n0)) return null;
    const exact = m === 'route' ? n0 + n1 : n0 - n1;
    const lastNum = (t: string) => { const w = t.replace(/(\d)[\s  ](\d{3})/g, '$1$2').match(/\d+/g); return w ? Number(w[w.length - 1]) : NaN; };
    const shownN = R && scene.shown ? lastNum(scene.shown) : NaN;
    const ans = R ? (Number.isFinite(shownN) && shownN > 0 ? shownN : exact) : null;
    let rnd: { a: number; b: number; step: number; est: boolean } | null = null;
    if (R && scene.shown?.startsWith('@') && m === 'route') {
      // a true/false estimate: show the trip rounded to the hundred, whatever the claim says
      const step = n0 >= 100 && n1 >= 100 ? 100 : 10;
      rnd = { a: Math.round(n0 / step) * step, b: Math.round(n1 / step) * step, step, est: true };
      return { kind: 'route', mode: m, token: tokenOf(g), a: n0, b: n1, ans: rnd.a + rnd.b, rnd };
    }
    if (R && (ans !== exact || n0 % 10 || n1 % 10)) {
      for (const step of [10, 100, 1000, 10000]) {
        const ra = Math.round(n0 / step) * step;
        const rb = Math.round(n1 / step) * step;
        if ((m === 'route' ? ra + rb : ra - rb) === ans) { rnd = { a: ra, b: rb, step, est: Boolean(scene.shown?.startsWith('≈')) }; break; }
      }
    }
    return { kind: 'route', mode: m, token: tokenOf(g), a: n0, b: n1, ans, rnd };
  }
  if (mode === 'hop' && x.startsWith('span')) {
    const [h0 = 0, m0 = 0, h1, m1] = N;
    const pad = (v: number) => String(v).padStart(2, '0');
    const dur = x === 'span-dur';
    const clockSpan = x === 'span-clock' && h1 !== undefined;
    const lenH = dur ? (h1 ?? 0) / 60 : clockSpan ? h1! + (m1 ?? 0) / 60 - (h0 + m0 / 60) : x === 'span-min' ? h0 / 60 : h0 + (m0 && m0 <= 59 && x === 'span-hm' ? m0 / 60 : 0);
    const hours = Math.max(1, Math.ceil(lenH));
    if (!(lenH > 0) || hours > 24) return null;
    const start = dur ? `${h0} h ${pad(m0)}` : clockSpan || x === 'span-hm' ? `${h0} h ${pad(m0)}` : x === 'span-min' ? `${h0} min` : `${h0} h`;
    const end = dur ? `${h1} min` : clockSpan ? `${h1} h ${pad(m1 ?? 0)}` : null;
    const every = x === 'span-h' && N[1] ? N[1] : 0;
    const spanMin = clockSpan ? Math.round(lenH * 60) : 0;
    const hops = clockSpan ? [...Array.from({ length: Math.floor(spanMin / 60) }, () => '+1 h'), ...(spanMin % 60 ? [`+${spanMin % 60} min`] : [])] : [];
    const msgs = every ? Math.floor((h0 * 60) / every) : 0;
    if (msgs > 12) return null;
    const total = clockSpan ? `${Math.floor(spanMin / 60)} h ${pad(spanMin % 60)}` : every && scene.values.ans !== undefined ? `= ${scene.values.ans}` : null;
    const tm = Math.round(lenH * 60);
    const hm = `${Math.floor(tm / 60)} h${tm % 60 ? ` ${pad(tm % 60)}` : ''}`;
    const conv = !dur && !clockSpan && !every ? { a: x === 'span-min' ? hm : hm, b: `${tm} min`, bGiven: x === 'span-min' } : null;
    const arrMin = dur ? h0 * 60 + m0 + (h1 ?? 0) : 0;
    const arrive = dur ? `${Math.floor(arrMin / 60)} h ${pad(arrMin % 60)}` : null;
    return { kind: 'span', hours, lenH, start, end, hops: R ? hops : [], msgs: R ? msgs : 0, every, total: R ? (conv ? (conv.bGiven ? conv.a : conv.b) : total) : null, token: tokenOf(g), conv, arrive: R ? arrive : null };
  }
  if (mode === 'hop' && x === 'line') {
    const v = scene.visual?.data as { min?: number; max?: number; step?: number; labels?: number[]; arrow?: number } | undefined;
    if (v?.min === undefined || v.max === undefined || v.max <= v.min) return null;
    const { min, max } = v;
    const steps = v.step ? Math.round((max - min) / v.step) : 10;
    if (steps < 1 || steps > 40) return null;
    const mark = scene.values.n9 ?? v.arrow ?? (N.length === 1 ? N[0]! : null);
    const gap: [number, number] | null = mark === null && N.length >= 2 ? [N[0]!, N[1]!] : null;
    const at = mark ?? (gap ? (gap[0] + gap[1]) / 2 : min);
    return { kind: 'track', lo: min, hi: max, steps, labels: (v.labels ?? [min, max]).slice(0, 12).filter((l) => R || mark === null || Math.abs(l - mark) !== 1 || l === min || l === max), at, mark, gap, ans: R && scene.values.ans !== undefined ? scene.values.ans : null };
  }
  return null;
}
