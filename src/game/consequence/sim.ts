// Rigid-body scenes on matter-js (0.20.0, lazy-loaded by ConsequenceScene). Real gravity, mass, friction, restitution,
// collisions, stacking and constraints: the outcome comes out of the simulation, nothing is keyframed.
// Fixed 1/60 s step and a seed per scene make every run repeatable. Stage units: 100 wide, 56.25 high, y down; matter works at S px per unit.
import Matter from 'matter-js';
import type { Rig } from './catalog.ts';

const { Engine, Bodies, Body, Composite, Constraint } = Matter;
export const S = 4;
export const STEP_MS = 1000 / 60;
const FLOOR = 48;
const MAX_FRAMES = 420; // 7 s: a scene that is still moving then is cut and shown as it is
const MIN_FRAMES = 40;

export type Kind = 'photo' | 'wood' | 'stone' | 'chasm' | 'glass' | 'water' | 'zone';
export type Pose = { x: number; y: number; r: number };
export type Piece = { id: string; kind: Kind; slot?: 0 | 1; round?: boolean; w: number; h: number; part?: Matter.Body; fixed?: Pose; live: boolean };
export type Sim = {
  pieces: Piece[];
  frame: number;
  step(): void;
  readonly settled: boolean;
  /** Did the thing the answer stands for happen? Computed from where the bodies ended up. */
  verdict(): boolean;
  pose(p: Piece): Pose | null;
  /** Largest speed of any moving body, for tests. */
  energy(): number;
  bodies(): Matter.Body[];
};

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Ctl = { at: number; run(): void };
type Ctx = ReturnType<typeof context>;

function context(seed: number) {
  const engine = Engine.create({ positionIterations: 10, velocityIterations: 8, constraintIterations: 8 });
  const pieces: Piece[] = [];
  const ctls: Ctl[] = [];
  const rnd = rng(seed);
  const add = (p: Piece, b?: Matter.Body, isStatic = false) => {
    if (b) {
      p.part = b;
      if (p.live) Composite.add(engine.world, b);
      if (isStatic) Body.setStatic(b, true);
    }
    pieces.push(p);
    return p;
  };
  const u = (v: number) => v * S;
  const box = (id: string, kind: Kind, x: number, y: number, w: number, h: number, o: Matter.IChamferableBodyDefinition = {}, slot?: 0 | 1, live = true) =>
    add({ id, kind, slot, w, h, live }, Bodies.rectangle(u(x), u(y), u(w), u(h), { friction: 0.6, frictionStatic: 1, restitution: 0.08, density: 0.002, slop: 0.02, ...o }), !!o.isStatic);
  const ball = (id: string, kind: Kind, x: number, y: number, r: number, o: Matter.IBodyDefinition = {}, slot?: 0 | 1, live = true) =>
    add({ id, kind, slot, round: true, w: r * 2, h: r * 2, live }, Bodies.circle(u(x), u(y), u(r), { friction: 0.4, frictionStatic: 0.6, restitution: 0.12, density: 0.002, ...o }));
  const decor = (id: string, kind: Kind, x: number, y: number, w: number, h: number) => add({ id, kind, w, h, fixed: { x, y, r: 0 }, live: true });
  const spawn = (p: Piece, at: number) => {
    p.live = false;
    if (p.part) Composite.remove(engine.world, p.part);
    ctls.push({ at, run: () => { p.live = true; if (p.part) Composite.add(engine.world, p.part); } });
  };
  const ground = () => {
    decor('floor', 'wood', 50, FLOOR + 4.1, 100, 8.3);
    const st = { isStatic: true, friction: 0.8 };
    // invisible: floor slab, side walls so nothing leaves the picture
    Composite.add(engine.world, [
      Bodies.rectangle(u(50), u(FLOOR + 4.1), u(120), u(8.3), st),
      Bodies.rectangle(u(-3), u(30), u(6), u(120), st),
      Bodies.rectangle(u(103), u(30), u(6), u(120), st),
    ]);
  };
  return { engine, pieces, ctls, rnd, add, box, ball, decor, spawn, ground, u };
}

type Built = { verdict: () => boolean; busy?: () => boolean; drive?: { from: number; run: () => void } };

function tower(c: Ctx, good: boolean, n: number): Built {
  const bw = 7;
  const bh = 9;
  const blocks = Array.from({ length: n }, (_, i) =>
    c.box(`b${i}`, 'photo', 50 + (c.rnd() - 0.5) * 0.6, FLOOR - bh / 2 - bh * i - 0.15 * (i + 1), bw, bh, { friction: 0.7, restitution: 0.02 }, (i % 2) as 0 | 1),
  );
  // a right tower is built block by block: each one is set down from just above the stack
  if (good) blocks.forEach((b, i) => { Body.setPosition(b.part!, { x: b.part!.position.x, y: b.part!.position.y - 14 * S }); c.spawn(b, i * 18); });
  if (!good) {
    const e = c.box('extra', 'photo', 50 + 2.6, -4, bw, bh, { friction: 0.7, restitution: 0.02 }, (n % 2) as 0 | 1);
    blocks.push(e);
    c.spawn(e, 20);
    c.ctls.push({ at: 20, run: () => { Body.setVelocity(e.part!, { x: 1.1, y: 0 }); Body.setAngularVelocity(e.part!, 0.05); } });
  }
  return { verdict: () => blocks.every((b) => Math.abs(b.part!.position.x / S - 50) < bw && Math.abs(b.part!.angle) < 0.35 && b.part!.position.y / S < FLOOR) };
}

function bridge(c: Ctx, good: boolean, n: number): Built {
  c.decor('chasm', 'chasm', 50, 48, 32, 16);
  const st = { isStatic: true, friction: 0.8 };
  c.box('left', 'stone', 17, 48, 34, 16, st);
  c.box('right', 'stone', 83, 48, 34, 16, st);
  Composite.add(c.engine.world, Bodies.rectangle(c.u(50), c.u(57), c.u(34), c.u(4), st));
  const len = good ? 40 : 21 + (n % 4);
  const plank = c.box('plank', 'wood', 50 + (c.rnd() - 0.5), 33, len, 1.6, { friction: 0.8, density: 0.003 });
  Body.setAngle(plank.part!, (c.rnd() - 0.5) * 0.04);
  const walker = c.ball('walker', 'photo', 10, 40 - 4.2, 4, { friction: 0.9, restitution: 0.05 }, 0);
  const reach = () => walker.part!.position.x / S < 88 && walker.part!.position.y / S < 50;
  return {
    verdict: () => walker.part!.position.x / S > 66 && walker.part!.position.y / S < 46,
    // the child's marble is pushed along by turning it, so it only crosses if there is something to roll on
    drive: { from: 75, run: () => reach() && Body.setAngularVelocity(walker.part!, 0.1) },
    busy: reach,
  };
}

function scale(c: Ctx, good: boolean, n: number): Built {
  const cnt = clamp(n, 3, 5);
  const sign = n % 2 === 0 ? 1 : -1;
  const [cl, cr] = good ? [cnt, cnt] : sign > 0 ? [cnt, cnt + 3] : [cnt + 3, cnt];
  const px = 50;
  const py = 22;
  const half = 30;
  const top = Bodies.rectangle(c.u(px), c.u(py), c.u(2 * half), c.u(2.4), { density: 0.002 });
  const keel = Bodies.rectangle(c.u(px), c.u(py + 7), c.u(2), c.u(12), { density: 0.0005 });
  const lipL = Bodies.rectangle(c.u(px - half + 0.6), c.u(py - 2.4), c.u(1.2), c.u(3.2), { density: 0.001 });
  const lipR = Bodies.rectangle(c.u(px + half - 0.6), c.u(py - 2.4), c.u(1.2), c.u(3.2), { density: 0.001 });
  const inL = Bodies.rectangle(c.u(px - 5.2), c.u(py - 2.4), c.u(1.2), c.u(3.2), { density: 0.001 });
  const inR = Bodies.rectangle(c.u(px + 5.2), c.u(py - 2.4), c.u(1.2), c.u(3.2), { density: 0.001 });
  const beam = Body.create({ parts: [top, keel, lipL, lipR, inL, inR], friction: 0.7, frictionStatic: 1, restitution: 0.05, frictionAir: 0.04 });
  Composite.add(c.engine.world, beam);
  const mk = (id: string, kind: Kind, b: Matter.Body, w: number, h: number) => c.pieces.push({ id, kind, w, h, part: b, live: true });
  mk('beam', 'wood', top, 2 * half, 2.4);
  mk('keel', 'stone', keel, 2, 12);
  mk('lipL', 'wood', lipL, 1.2, 3.2);
  mk('lipR', 'wood', lipR, 1.2, 3.2);
  mk('inL', 'wood', inL, 1.2, 3.2);
  mk('inR', 'wood', inR, 1.2, 3.2);
  // pivot at the beam centre, which sits above the centre of mass: the beam hangs level and swings like a real balance
  Composite.add(
    c.engine.world,
    Constraint.create({ pointA: { x: c.u(px), y: c.u(py) }, bodyB: beam, pointB: { x: c.u(px) - beam.position.x, y: c.u(py) - beam.position.y }, length: 0, stiffness: 1, damping: 0.2 }),
  );
  c.decor('post', 'wood', px, 36, 3, 25);
  const stopY = 37.5;
  c.box('stopL', 'stone', px - 29, stopY, 6, 6, { isStatic: true });
  c.box('stopR', 'stone', px + 29, stopY, 6, 6, { isStatic: true });
  const items: Piece[] = [];
  const place = (side: -1 | 1, count: number) => {
    for (let j = 0; j < count; j++) {
      const row = Math.floor(j / 5);
      const x = px + side * (26.4 - (j % 5) * 4.6) + (c.rnd() - 0.5) * 0.2;
      const p = c.box(`i${side}${j}`, 'photo', x, 14 - row * 5, 4.4, 4.4, { friction: 0.5, restitution: 0, density: 0.002 }, (j % 2) as 0 | 1);
      c.spawn(p, 4 + j * 8);
      items.push(p);
    }
  };
  place(-1, cl);
  place(1, cr);
  // the counterweight of a real balance acts like a torsion spring: it brings the beam back to level, more load on one side tips it
  const K = 1;
  return { verdict: () => Math.abs(beam.angle) < 0.05, drive: { from: 0, run: () => { beam.torque += -K * beam.angle - 1.2 * K * beam.angularVelocity; } }, busy: () => items.some((i) => !i.live) };
}

const JUG = { x: 50, left: 41, right: 59, bottom: FLOOR, top: 18, r: 1.7 };
const JUG_GOOD = 30;
function jug(c: Ctx, good: boolean): Built {
  const st = { isStatic: true, friction: 0.05 };
  const wall = (id: string, x: number, y: number, w: number, h: number) => Composite.add(c.engine.world, Bodies.rectangle(c.u(x), c.u(y), c.u(w), c.u(h), { ...st, label: id }));
  wall('jl', JUG.left - 1.5, (JUG.top + JUG.bottom) / 2, 3, JUG.bottom - JUG.top);
  wall('jr', JUG.right + 1.5, (JUG.top + JUG.bottom) / 2, 3, JUG.bottom - JUG.top);
  const N = good ? JUG_GOOD : Math.round(JUG_GOOD * 2.3);
  const drops: Piece[] = [];
  const born: number[] = [];
  let tick = 0;
  for (let i = 0; i < N; i++) {
    const p = c.ball(`w${i}`, 'water', JUG.x + ((i % 5) - 2) * 3.4 + (c.rnd() - 0.5) * 0.4, 6 - Math.floor(i / 5) * 0, JUG.r, { friction: 0.01, frictionStatic: 0, frictionAir: 0.004, restitution: 0.05, density: 0.001 });
    c.spawn(p, 6 + Math.floor(i / 5) * 12 + (i % 5) * 2);
    born.push(6 + Math.floor(i / 5) * 12 + (i % 5) * 2);
    drops.push(p);
  }
  c.decor('mark', 'zone', JUG.x, JUG.bottom - JUG_MARK, JUG.right - JUG.left + 6, 0.5);
  c.decor('jug', 'glass', JUG.x, (JUG.top + JUG.bottom) / 2 + 0.5, JUG.right - JUG.left + 3, JUG.bottom - JUG.top + 2);
  const outside = () => drops.filter((d) => d.live && d.part && (d.part.position.x / S < JUG.left || d.part.position.x / S > JUG.right)).length;
  // water has no angle of repose: above the rim a heap of discs would stand, so the surface slumps sideways (a small push away from the jet)
  const slump = () => {
    tick++;
    drops.forEach((d, i) => {
      const b = d.part!;
      if (d.live && tick - born[i] > 45 && b.position.y / S < JUG.top - 0.5 && b.speed < 0.8) Body.applyForce(b, b.position, { x: Math.sign(b.position.x / S - JUG.x || 1) * b.mass * 0.0006, y: 0 });
    });
  };
  return { verdict: () => outside() === 0, busy: () => drops.some((d) => !d.live), drive: { from: 0, run: slump } };
}
const JUG_MARK = 19.5;

function shelf(c: Ctx, good: boolean, n: number): Built {
  const cnt = clamp(n, 3, 5);
  const r = 3.6;
  const tx = 30;
  const by = 34;
  const st = { isStatic: true, friction: 0.5 };
  c.box('legL', 'wood', 20, 41.5, 2.4, 13, st);
  c.box('legR', 'wood', 40, 41.5, 2.4, 13, st);
  c.box('board', 'wood', tx, by, 24, 2.4, st);
  const inner = 2 * r * 1.08;
  const wallH = cnt * 2 * r * 0.9;
  c.box('tubeL', 'glass', tx - inner / 2 - 0.4, by - 1.2 - wallH / 2, 0.8, wallH, st);
  c.box('tubeR', 'glass', tx + inner / 2 + 0.4, by - 1.2 - wallH / 2, 0.8, wallH, st);
  const balls: Piece[] = [];
  const total = good ? cnt : cnt + 1;
  for (let i = 0; i < total; i++) {
    const last = i === total - 1 && !good;
    const p = c.ball(`p${i}`, 'photo', tx + (last ? 2.3 : (c.rnd() - 0.5) * 0.4), 2, r, { friction: 0.3, restitution: 0.1 }, (i % 2) as 0 | 1);
    c.spawn(p, 6 + i * 16);
    balls.push(p);
  }
  return { verdict: () => balls.every((b) => Math.abs(b.part!.position.x / S - tx) < inner / 2 + 0.5 && b.part!.position.y / S < by && b.part!.position.y / S > by - 1.2 - wallH - r * 0.5), busy: () => balls.some((b) => !b.live) };
}

export const COLLIDE: { good: number; short: number; long: number } = { good: 21.5, short: 13.5, long: 26 };
function collide(c: Ctx, good: boolean, n: number): Built {
  const zone = { x: 80, w: 16 };
  c.decor('zone', 'zone', zone.x, FLOOR - 4.7, zone.w, 9.4);
  const block = c.box('block', 'photo', 48, FLOOR - 4.05, 8, 8, { friction: 0.05, frictionStatic: 0.1, frictionAir: 0.03, restitution: 0.2 }, 0);
  const ballP = c.ball('ball', 'photo', 10, FLOOR - 4.05, 4, { friction: 0, frictionStatic: 0, frictionAir: 0.01, restitution: 0.2, density: 0.002 }, 1);
  const v = good ? COLLIDE.good : n % 2 === 0 ? COLLIDE.short : COLLIDE.long;
  c.ctls.push({ at: 2, run: () => Body.setVelocity(ballP.part!, { x: v, y: 0 }) });
  return { verdict: () => { const x = block.part!.position.x / S; return x > zone.x - zone.w / 2 + 1 && x < zone.x + zone.w / 2 - 1; } };
}

export function createSim(rig: Rig, good: boolean, n: number, sceneKey = ''): Sim {
  const nn = clamp(Math.round(n), 3, 6);
  const c = context(hash(`${sceneKey}|${rig}|${good}|${nn}`));
  c.ground();
  const built: Built =
    rig === 'tower' ? tower(c, good, nn) : rig === 'bridge' ? bridge(c, good, nn) : rig === 'scale' ? scale(c, good, nn) : rig === 'jug' ? jug(c, good) : rig === 'shelf' ? shelf(c, good, nn) : collide(c, good, nn);
  const ctls = c.ctls;
  const drive = built.drive;
  let frame = 0;
  let calm = 0;
  const dyn = () => Composite.allBodies(c.engine.world).filter((b) => !b.isStatic);
  // how far anything moved in the last step (velocity is useless for bodies a constraint holds up: it never reads zero)
  const last = new Map<number, [number, number, number]>();
  let moved = 0;
  const measure = () => {
    moved = 0;
    for (const b of dyn()) {
      const p = last.get(b.id);
      if (p) moved = Math.max(moved, Math.hypot(b.position.x - p[0], b.position.y - p[1]) / S, Math.abs(b.angle - p[2]) * 3);
      else moved = 1;
      last.set(b.id, [b.position.x, b.position.y, b.angle]);
    }
  };
  const energy = () => moved;
  const sim: Sim = {
    pieces: c.pieces,
    get frame() {
      return frame;
    },
    set frame(v: number) {
      frame = v;
    },
    step() {
      for (const t of ctls) if (t.at === frame) t.run();
      if (drive && frame >= drive.from) drive.run();
      Engine.update(c.engine, STEP_MS);
      frame++;
      measure();
      const busy = ctls.some((t) => t.at >= frame) || (built.busy?.() ?? false) || (drive ? frame < drive.from : false);
      calm = !busy && moved < 0.03 ? calm + 1 : 0;
    },
    get settled() {
      return frame >= MAX_FRAMES || (frame >= MIN_FRAMES && calm >= 30);
    },
    verdict: built.verdict,
    pose(p) {
      if (p.fixed) return p.fixed;
      if (!p.live || !p.part) return null;
      return { x: p.part.position.x / S, y: p.part.position.y / S, r: p.part.angle };
    },
    energy,
    bodies: dyn,
  };
  return sim;
}

/** Run to rest without drawing (reduced motion, tests). */
export function settle(sim: Sim): Sim {
  while (!sim.settled) sim.step();
  return sim;
}
