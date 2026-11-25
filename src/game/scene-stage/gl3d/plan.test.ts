import { describe, expect, it } from 'vitest';
import type { ResolvedScene } from '../spec';
import { bayPlan, fallbackOf } from './plan';

const mk = (setting: string, values: Record<string, number>, revealed: boolean, visual?: ResolvedScene['visual']) => ({ spec: { setting, archetype: setting.startsWith('echecs-') || setting.startsWith('board.') ? 'echecs.chess-board' : setting.startsWith('medecine-') ? 'medecine.shelf-chart' : 'espace.room-count' }, values, props: {}, revealed, visual }) as unknown as ResolvedScene;
const bars = { kind: 'bars', data: { bars: [{ value: 25 }, { value: 40 }, { value: 35 }] } };
const plates = { kind: 'plates', data: { t: ['7', '13', '9'], rank: [0, 2, 1], win: 1 } };

describe('bay3d plan', () => {
  it('tanks: total and big capacity only at the reveal', () => {
    const q = bayPlan(mk('es:gauge:tank:surface:bars', {}, false, bars));
    const r = bayPlan(mk('es:gauge:tank:surface:bars', {}, true, bars));
    expect(q).toMatchObject({ kind: 'tanks', vals: [25, 40, 35], capSmall: 40, total: null, capBig: null });
    expect(r).toMatchObject({ total: 100, capBig: 100 });
  });
  it('tags: winner hidden in the question, shown at the reveal', () => {
    expect(bayPlan(mk('es:tags:rocket:surface:num', { n: 3 }, false, plates))).toMatchObject({ labels: ['7', '13', '9'], win: null });
    expect(bayPlan(mk('es:tags:rocket:surface:num', { n: 3 }, true, plates))).toMatchObject({ win: 1 });
  });
  it('share: 23 into 5 gives 4 crates and 3 left, only at the reveal', () => {
    expect(bayPlan(mk('es:share:mini:cargo:crate', { n0: 23, n1: 5 }, false))).toMatchObject({ kind: 'share', a: 23, b: 5, holders: null, left: null });
    expect(bayPlan(mk('es:share:mini:cargo:crate', { n0: 23, n1: 5 }, true))).toMatchObject({ holders: 4, left: 3 });
  });
  it('pile: add and sub counts, the total only at the reveal, big counts pack by ten', () => {
    expect(bayPlan(mk('es:add:star:quarters', { n0: 3, n1: 4 }, false))).toMatchObject({ kind: 'pile', mode: 'add', a: 3, b: 4, packed: false, total: null });
    expect(bayPlan(mk('es:add:star:quarters', { n0: 3, n1: 4 }, true))).toMatchObject({ total: 7 });
    expect(bayPlan(mk('es:sub:meal:quarters', { n0: 9, n1: 4 }, true))).toMatchObject({ mode: 'sub', total: 5 });
    expect(bayPlan(mk('es:add:canister:surface', { n0: 45, n1: 20 }, false))).toMatchObject({ packed: true });
    expect(bayPlan(mk('es:sub:canister:surface', { n0: 46, n1: 18 }, false))).toMatchObject({ mode: 'sub', packed: false });
    expect(bayPlan(mk('es:pairs:star:control', { n0: 4 }, true))).toMatchObject({ mode: 'pairs', total: 8 });
    expect(bayPlan(mk('es:packs:star:control', { n0: 3, n1: 10, n2: 4 }, true))).toMatchObject({ mode: 'packs', total: 34 });
    expect(bayPlan(mk('es:gap:card:control', { n0: 8, n1: 5 }, false))).toMatchObject({ mode: 'gap' });
    expect(bayPlan(mk('es:add:star:quarters', { n0: 400, n1: 4 }, false))).toBeNull();
  });
  it('track: mark and gap from the question, the answer only at the reveal', () => {
    const line = { kind: 'line', data: { min: 10, max: 30, step: 2, labels: [10, 30] } };
    const q = bayPlan(mk('es:hop:rocket:surface:line', { n9: 19 }, false, line));
    expect(q).toMatchObject({ kind: 'track', mark: 19, at: 19, ans: null, steps: 10 });
    expect(bayPlan(mk('es:hop:rocket:surface:line', { n9: 19, ans: 20 }, true, line))).toMatchObject({ ans: 20 });
    expect(bayPlan(mk('es:hop:rocket:surface:line', { n0: 84, n1: 86 }, false, line))).toMatchObject({ mark: null, gap: [84, 86], at: 85 });
  });
  it('gauge: the end level and label only at the reveal', () => {
    expect(bayPlan(mk('es:gauge:tank:cargo:add', { n0: 38, n1: 25 }, false))).toMatchObject({ kind: 'gauge', mode: 'add', end: null, label: null, cap: 65 });
    expect(bayPlan(mk('es:gauge:tank:cargo:add', { n0: 38, n1: 25 }, true))).toMatchObject({ end: 63, label: '63 L' });
    expect(bayPlan(mk('es:gauge:tank:cargo:steps', { n0: 128, n1: 45, n2: 30 }, true))).toMatchObject({ end: 113 });
  });
  it('wing: rows by cols, broken panels, total only at the reveal', () => {
    expect(bayPlan(mk('es:wing:panel:exterior:one', { n0: 4, n1: 6 }, false))).toMatchObject({ kind: 'wing', total: null });
    expect(bayPlan(mk('es:wing:panel:exterior:broken', { n0: 4, n1: 6, n2: 3 }, true))).toMatchObject({ total: 21, broken: 3 });
    expect(bayPlan(mk('es:wing:panel:exterior:one-sat', { n0: 4, n1: 6 }, false))).toMatchObject({ sat: true });
    expect(bayPlan(mk('es:wing:panel:exterior:one', { n0: 40, n1: 6 }, false))).toBeNull();
  });
  it('clock: only the pad view; grid: ring target stays a question mark, cells and sel only at the reveal', () => {
    expect(bayPlan(mk('espace-clock-pad', { hour: 3, minute: 30 }, false))).toMatchObject({ kind: 'clock', hour: 3, minute: 30, rockets: 1 });
    expect(bayPlan(mk('espace-clock-docked', { hour: 3, minute: 30 }, false))).toMatchObject({ view: 'docked' });
    const g = { kind: 'grid', data: { cols: 3, rows: 3, cells: [{ x: 1, y: 3, label: { fr: 'robot', en: 'robot' } }, { x: 3, y: 1, label: { fr: 'outils', en: 'toolbox' } }] } };
    expect(bayPlan(mk('es:grid:map:control:ring.0', { cols: 3, rows: 3 }, false, g))).toMatchObject({ kind: 'grid', mode: 'ring', sel: [], target: 0 });
    expect(bayPlan(mk('es:grid:map:control:ring.0', { cols: 3, rows: 3 }, true, g))).toMatchObject({ sel: [0], target: null });
    expect(bayPlan(mk('es:grid:map:control:rover.0.1', { cols: 3, rows: 3, n0: 2, n1: 1 }, true, g))).toMatchObject({ mode: 'rover', legs: { right: 2, down: 1 } });
    expect(bayPlan(mk('es:grid:map:control:rover.0.1', { cols: 3, rows: 3, n0: 2, n1: 1 }, false, g))).toMatchObject({ legs: null });
  });
  it('match: partner texts only at the reveal', () => {
    const pl = { kind: 'plates', data: { t: ['a', 'b'], rank: [1, 0], win: -1, pair: ['x', 'y'] } };
    expect(bayPlan(mk('es:tags:crew:control:num', { n: 2 }, false, pl))).toMatchObject({ pair: null, rank: null });
    expect(bayPlan(mk('es:tags:crew:control:num', { n: 2 }, true, pl))).toMatchObject({ pair: ['x', 'y'], rank: [1, 0] });
  });
  it('route and span: the answer distance and the hops only at the reveal', () => {
    expect(bayPlan(mk('es:hop:probe:exterior:route', { n0: 120, n1: 80 }, false))).toMatchObject({ kind: 'route', mode: 'route', ans: null });
    expect(bayPlan(mk('es:hop:probe:exterior:route-remain', { n0: 120, n1: 80 }, true))).toMatchObject({ mode: 'remain', ans: 40 });
    const sp = bayPlan(mk('es:hop:robot:exterior:span-clock', { n0: 8, n1: 30, n2: 11, n3: 0 }, true));
    expect(sp).toMatchObject({ kind: 'span', total: '2 h 30', hops: ['+1 h', '+1 h', '+30 min'] });
    expect(bayPlan(mk('es:hop:robot:exterior:span-clock', { n0: 8, n1: 30, n2: 11, n3: 0 }, false))).toMatchObject({ hops: [], total: null });
  });
  it('chain: step only, rows and arithmetic columns', () => {
    expect(bayPlan(mk('es:chain:star:control:step', { n0: 5 }, false))).toMatchObject({ kind: 'chain', vals: [], step: 5 });
    expect(bayPlan(mk('es:chain:star:control:step', { n0: 5, n1: 5 }, true))).toMatchObject({ vals: [5, 10, 15], next: 20 });
    expect(bayPlan(mk('es:chain:star:exterior:arith4', { n0: 3, n1: 2 }, false))).toMatchObject({ kind: 'cols', vals: [3, 5, 7, 9] });
  });
  it('other worlds have no 3D plan: echecs and medecine keep their own scenes', () => {
    const bars = { kind: 'bars', data: { bars: [{ label: { fr: 'Lun' }, value: 3, icon: 'dog' }], max: 6 } };
    expect(bayPlan(mk('medecine-chart-dog', {}, false, bars))).toBeNull();
    expect(bayPlan(mk('board.dark..t1', { cols: 8, rows: 8 }, false))).toBeNull();
  });
  it('unsupported shapes return null and fall back to the matching 2.5D archetype', () => {
    expect(bayPlan(mk('es:steps:canister:surface', { n0: 45, n1: 20 }, false))).toBeNull();
    expect(bayPlan(mk('es:share:mini:cargo:crate', { n0: 500, n1: 5 }, false))).toBeNull();
    expect(bayPlan(mk('es:tags:rocket:surface:num', { n: 3 }, false))).toBeNull();
    expect(fallbackOf(mk('es:tags:x:y', {}, false))).toBe('espace.tag-row');
    expect(fallbackOf(mk('es:gauge:tank:y', {}, false))).toBe('espace.gauge');
    expect(fallbackOf(mk('es:share:x:y', {}, false))).toBe('espace.room-count');
  });
});
