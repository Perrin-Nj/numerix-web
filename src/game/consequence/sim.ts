// Rigid-body scenes on matter-js (0.20.0, lazy-loaded by ConsequenceScene). Real gravity, mass, friction, restitution,
// collisions, stacking and constraints: the outcome comes out of the simulation, nothing is keyframed.
// Fixed 1/60 s step and a seed per scene make every run repeatable. Stage units: 100 wide, 56.25 high, y down; matter works at S px per unit.
import Matter from 'matter-js';
import type { Rig } from './catalog.ts';
import type { Amount } from './amounts.ts';

const { Engine, Bodies, Body, Composite, Constraint, Sleeping } = Matter;
export const S = 4;
export const STEP_MS = 1000 / 60;
const FLOOR = 48;
const MAX_FRAMES = 420; // 7 s: a scene that is still moving then is cut and shown as it is
const MIN_FRAMES = 40;

export type Kind = 'photo' | 'wood' | 'stone' | 'chasm' | 'glass' | 'water' | 'zone';
export type Pose = { x: number; y: number; r: number };
export type Piece = { id: string; kind: Kind; slot?: 0 | 1; round?: boolean; w: number; h: number; part?: Matter.Body; fixed?: Pose; live: boolean; /** Part of a compound body: where it sits relative to the body's centre of mass at rest. */ off?: { dx: number; dy: number } };
export type Sim = {
  pieces: Piece[];
  frame: number;
  step(): void;
  readonly settled: boolean;
  /** Did the thing the answer stands for happen? Computed from where the bodies ended up. */
  verdict(): boolean;
  /** For a wrong answer: did the failure itself happen in the simulation (it fell, spilled, tipped, missed)? */
  emerged(): boolean;
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
  const engine = Engine.create({ positionIterations: 10, velocityIterations: 8, constraintIterations: 8, enableSleeping: true });
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
  const ground = (gap?: [number, number]) => {
    decor('floor', 'wood', 50, FLOOR + 4.1, 100, 8.3);
    const st = { isStatic: true, friction: 0.8 };
    // invisible: floor slab, side walls so nothing leaves the picture
    const slabs = gap
      ? [Bodies.rectangle(u((gap[0] - 10) / 2), u(FLOOR + 4.1), u(gap[0] + 10), u(8.3), st), Bodies.rectangle(u((gap[1] + 110) / 2), u(FLOOR + 4.1), u(110 - gap[1]), u(8.3), st)]
      : [Bodies.rectangle(u(50), u(FLOOR + 4.1), u(120), u(8.3), st)];
    Composite.add(engine.world, [
      ...slabs,
      Bodies.rectangle(u(-3), u(30), u(6), u(120), st),
      Bodies.rectangle(u(103), u(30), u(6), u(120), st),
    ]);
  };
  return { engine, pieces, ctls, rnd, add, box, ball, decor, spawn, ground, u };
}

type Built = { verdict: () => boolean; busy?: () => boolean; drive?: { from: number; run: () => void }; emerged?: () => boolean };

function tower(c: Ctx, good: boolean, A: Amount): Built {
  // the child's answer is the number of blocks built; the right amount is the line marked on the wall
  const hs = clamp(40 / (Math.max(A.a, A.b) + 0.6), 4, 9);
  const bw = hs * 0.78;
  const bh = hs;
  const stackN = good || A.over ? A.a : A.b;
  const extras = !good && A.over ? A.b - A.a : 0;
  const mat = { friction: 0.7, restitution: 0.02 };
  const blocks = Array.from({ length: stackN }, (_, i) => c.box(`b${i}`, 'photo', 50 + (c.rnd() - 0.5) * bw * 0.08, FLOOR - bh / 2 - bh * i - 0.15 * (i + 1), bw, bh, mat, (i % 2) as 0 | 1));
  c.decor('line', 'zone', 50, FLOOR - bh * A.a - 0.4, bw + 14, 0.5);
  // a right tower is built block by block: each one is set down from just above the stack
  if (good) blocks.forEach((b, i) => { Body.setPosition(b.part!, { x: b.part!.position.x, y: b.part!.position.y - bh * 0.8 * S }); c.spawn(b, i * 18); });
  for (let k = 0; k < extras; k++) {
    const sign = k % 2 === 0 ? 1 : -1;
    const e = c.box(`extra${k}`, 'photo', 50 + sign * bw * 0.4, -4, bw, bh, mat, ((stackN + k) % 2) as 0 | 1);
    blocks.push(e);
    c.spawn(e, 20 + k * 22);
    c.ctls.push({ at: 20 + k * 22, run: () => { Body.setVelocity(e.part!, { x: sign * 1.1, y: 0 }); Body.setAngularVelocity(e.part!, sign * 0.05); } });
  }
  const standing = () => blocks.filter((b) => b.live && Math.abs(b.part!.position.x / S - 50) < bw && Math.abs(b.part!.angle) < 0.35 && b.part!.position.y / S < FLOOR).length;
  return {
    verdict: () => blocks.length === A.a && standing() === blocks.length,
    emerged: () => (good ? true : A.over ? standing() < blocks.length : blocks.length < A.a),
    busy: () => blocks.some((b) => !b.live),
  };
}

function bridge(c: Ctx, good: boolean, A: Amount): Built {
  c.decor('chasm', 'chasm', 50, 48, 32, 16);
  const st = { isStatic: true, friction: 0.8 };
  c.box('left', 'stone', 17, 48, 34, 16, st);
  c.box('right', 'stone', 83, 48, 34, 16, st);
  Composite.add(c.engine.world, Bodies.rectangle(c.u(50), c.u(57), c.u(34), c.u(4), st));
  // the plank is as long as the child's answer says (40 covers the 32 wide gap); a too long answer is never drawn here
  const len = good ? 40 : clamp((40 * A.b) / A.a, 10, 26);
  const plank = c.box('plank', 'wood', 50 + (c.rnd() - 0.5), 33, len, 1.6, { friction: 0.8, density: 0.003 });
  Body.setAngle(plank.part!, (c.rnd() - 0.5) * 0.04);
  const walker = c.ball('walker', 'photo', 10, 40 - 4.2, 4, { friction: 0.9, restitution: 0.05 }, 0);
  const reach = () => walker.part!.position.x / S < 88 && walker.part!.position.y / S < 42;
  return {
    verdict: () => walker.part!.position.x / S > 66 && walker.part!.position.y / S < 46,
    // the marble is pushed along by turning it, so it only crosses if there is something to roll on
    drive: { from: 75, run: () => reach() && (Sleeping.set(walker.part!, false), Body.setAngularVelocity(walker.part!, 0.1)) },
    busy: reach,
  };
}

function scale(c: Ctx, good: boolean, A: Amount): Built {
  // one pan holds the right amount, the other the child's answer
  const swap = A.a % 2 === 1;
  const [cl, cr] = good ? [A.a, A.a] : swap ? [A.b, A.a] : [A.a, A.b];
  const px = 50;
  const py = 22;
  const half = 30;
  const top = Bodies.rectangle(c.u(px), c.u(py), c.u(2 * half), c.u(2.4), { density: 0.002 });
  const keel = Bodies.rectangle(c.u(px), c.u(py + 7), c.u(2), c.u(12), { density: 0.0005 });
  const lipL = Bodies.rectangle(c.u(px - half + 0.6), c.u(py - 2.4), c.u(1.2), c.u(3.2), { density: 0.001 });
  const lipR = Bodies.rectangle(c.u(px + half - 0.6), c.u(py - 2.4), c.u(1.2), c.u(3.2), { density: 0.001 });
  const inL = Bodies.rectangle(c.u(px - 5.2), c.u(py - 2.4), c.u(1.2), c.u(3.2), { density: 0.001 });
  const inR = Bodies.rectangle(c.u(px + 5.2), c.u(py - 2.4), c.u(1.2), c.u(3.2), { density: 0.001 });
  const beam = Body.create({ parts: [top, keel, lipL, lipR, inL, inR], friction: 0.7, frictionStatic: 1, restitution: 0.05, frictionAir: 0.04, sleepThreshold: Infinity });
  Composite.add(c.engine.world, beam);
  // parts of a compound body do not move on their own in matter: they are drawn from the body's position and angle
  const mk = (id: string, kind: Kind, b: Matter.Body, w: number, h: number) => c.pieces.push({ id, kind, w, h, part: b, live: true, off: { dx: (b.position.x - beam.position.x) / S, dy: (b.position.y - beam.position.y) / S } });
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
  // more than 5 on a pan: smaller pieces, 7 to a row, same weight each
  const big = Math.max(cl, cr) > 5;
  const sz = big ? 3.4 : 4.4;
  const perRow = big ? 7 : 5;
  const place = (side: -1 | 1, count: number) => {
    for (let j = 0; j < count; j++) {
      const row = Math.floor(j / perRow);
      const x = px + side * (26.4 - (j % perRow) * sz * 1.06);
      const p = c.box(`i${side}${j}`, 'photo', x, 14 - row * (sz + 0.6), sz, sz, { friction: 0.5, restitution: 0, density: 0.008 * (4.4 / sz) ** 2, sleepThreshold: Infinity }, (j % 2) as 0 | 1);
      c.spawn(p, 4 + j * 8);
      items.push(p);
    }
  };
  place(-1, cl);
  place(1, cr);
  // the counterweight of a real balance acts like a torsion spring: it brings the beam back to level, more load on one side tips it
  const K = 1;
  let age = 0;
  return {
    verdict: () => Math.abs(beam.angle) < 0.02,
    drive: {
      from: 0,
      run: () => {
        beam.torque += -K * beam.angle - 1.2 * K * beam.angularVelocity;
        // after 3 s everything is slowed by a little extra drag so the last sliding ends
        if (++age > 180) { beam.frictionAir = 0.4; for (const i of items) if (i.part) i.part.frictionAir = 0.4; }
      },
    },
    busy: () => items.some((i) => !i.live),
  };
}

const JUG = { x: 50, left: 41, right: 59, bottom: FLOOR, top: 18, r: 1.7 };
const JUG_GOOD = 30;
const JUG_MARK = 31.2; // surface of 30 discs, measured (scripts/check-consequence.mjs keeps it honest)
function jug(c: Ctx, good: boolean, A: Amount): Built {
  const st = { isStatic: true, friction: 0.05 };
  const wall = (id: string, x: number, y: number, w: number, h: number) => Composite.add(c.engine.world, Bodies.rectangle(c.u(x), c.u(y), c.u(w), c.u(h), { ...st, label: id }));
  wall('jl', JUG.left - 1.5, (JUG.top + JUG.bottom) / 2, 3, JUG.bottom - JUG.top);
  wall('jr', JUG.right + 1.5, (JUG.top + JUG.bottom) / 2, 3, JUG.bottom - JUG.top);
  // the line is the right amount; the water poured is the child's: more or less in proportion, never within a row of the line
  const step = Math.max(10, Math.round((JUG_GOOD * Math.abs(A.b - A.a) * 1.5) / A.a));
  // too much always means more than the jug holds (62 discs fill it to the rim), so it spills
  const N = good ? JUG_GOOD : A.over ? clamp(Math.max(JUG_GOOD + step, 66), 66, 80) : clamp(JUG_GOOD - step, 12, 22);
  const drops: Piece[] = [];
  const born: number[] = [];
  let tick = 0;
  for (let i = 0; i < N; i++) {
    const p = c.ball(`w${i}`, 'water', JUG.x + ((i % 5) - 2) * 3.4 + (c.rnd() - 0.5) * 0.4, 6, JUG.r, { friction: 0.01, frictionStatic: 0, frictionAir: 0.02, restitution: 0.05, density: 0.001, sleepThreshold: 20 });
    const at = 6 + Math.floor(i / 5) * 12 + (i % 5) * 2;
    c.spawn(p, at);
    born.push(at);
    drops.push(p);
  }
  c.decor('mark', 'zone', JUG.x, JUG_MARK, JUG.right - JUG.left + 6, 0.5);
  c.decor('jug', 'glass', JUG.x, (JUG.top + JUG.bottom) / 2 + 0.5, JUG.right - JUG.left + 3, JUG.bottom - JUG.top + 2);
  const inside = () => drops.filter((d) => d.live && d.part && d.part.position.x / S >= JUG.left && d.part.position.x / S <= JUG.right);
  const outside = () => drops.filter((d) => d.live && d.part && (d.part.position.x / S < JUG.left || d.part.position.x / S > JUG.right)).length;
  const surface = () => {
    const ys = inside().map((d) => d.part!.position.y / S).sort((x, y) => x - y);
    return ys.length ? ys[Math.floor(ys.length * 0.1)] - JUG.r : JUG.bottom;
  };
  // water has no angle of repose: above the rim a heap of discs would stand, so the surface slumps sideways (a small push away from the jet)
  const slump = () => {
    tick++;
    drops.forEach((d, i) => {
      const b = d.part!;
      // the last bits of sloshing die out: the liquid turns viscous after 3.5 s so the scene always comes to rest
      if (tick > 220) b.frictionAir = 0.3;
      else if (d.live && tick - born[i] > 45 && b.position.y / S < JUG.top - 0.5 && b.speed < 0.8) Body.applyForce(b, b.position, { x: Math.sign(b.position.x / S - JUG.x || 1) * b.mass * 0.0006, y: 0 });
    });
  };
  return { verdict: () => outside() === 0 && Math.abs(surface() - JUG_MARK) < 2.6, busy: () => drops.some((d) => !d.live), drive: { from: 0, run: slump } };
}

function shelf(c: Ctx, good: boolean, A: Amount): Built {
  // the tube holds the right amount (the line); the child's answer is how many pieces are put in
  const r = clamp(15 / Math.max(A.a, A.b), 1.8, 3.6);
  const tx = 30;
  const by = 34;
  const st = { isStatic: true, friction: 0.5 };
  c.box('legL', 'wood', 20, 41.5, 2.4, 13, st);
  c.box('legR', 'wood', 40, 41.5, 2.4, 13, st);
  c.box('board', 'wood', tx, by, 24, 2.4, st);
  const inner = 2 * r * 1.08;
  const wallH = A.a * 2 * r * 0.9;
  c.box('tubeL', 'glass', tx - inner / 2 - 0.4, by - 1.2 - wallH / 2, 0.8, wallH, st);
  c.box('tubeR', 'glass', tx + inner / 2 + 0.4, by - 1.2 - wallH / 2, 0.8, wallH, st);
  c.decor('line', 'zone', tx, by - 1.2 - A.a * 2 * r, inner + 7, 0.5);
  const balls: Piece[] = [];
  const total = good ? A.a : A.b;
  for (let i = 0; i < total; i++) {
    const extra = i >= A.a;
    const sign = i % 2 === 0 ? 1 : -1;
    const p = c.ball(`p${i}`, 'photo', tx + (extra ? sign * r * 0.64 : (c.rnd() - 0.5) * 0.4), 2, r, { friction: 0.3, restitution: 0.1 }, (i % 2) as 0 | 1);
    c.spawn(p, 6 + i * 16);
    balls.push(p);
  }
  const inTube = (b: Piece) => Math.abs(b.part!.position.x / S - tx) < inner / 2 + 0.5 && b.part!.position.y / S < by && b.part!.position.y / S > by - 1.2 - wallH - r * 0.5;
  return {
    verdict: () => balls.length === A.a && balls.every(inTube),
    emerged: () => (good ? true : A.over ? balls.some((b) => !inTube(b)) : balls.length < A.a),
    busy: () => balls.some((b) => !b.live),
  };
}

// push speed (matter units) against how far the block slides, measured on this table (see check-consequence.mjs)
const PUSH: [number, number][] = [[1.3, 4], [3.3, 7], [7.3, 10], [12.1, 13], [18.7, 16], [26.5, 19], [34, 22], [41.5, 25], [47.5, 28]];
const pushFor = (d: number) => {
  for (let i = 1; i < PUSH.length; i++) if (d <= PUSH[i][0]) { const [d0, v0] = PUSH[i - 1]; const [d1, v1] = PUSH[i]; return v0 + ((v1 - v0) * (d - d0)) / (d1 - d0); }
  return PUSH[PUSH.length - 1][1];
};
function collide(c: Ctx, good: boolean, A: Amount): Built {
  const zone = { x: 80, w: 16 };
  c.decor('zone', 'zone', zone.x, FLOOR - 4.7, zone.w, 9.4);
  const block = c.box('block', 'photo', 48, FLOOR - 4.05, 8, 8, { friction: 0.05, frictionStatic: 0.1, frictionAir: 0.03, restitution: 0.2 }, 0);
  const ballP = c.ball('ball', 'photo', 10, FLOOR - 4.05, 4, { friction: 0, frictionStatic: 0, frictionAir: 0.01, restitution: 0.2, density: 0.002 }, 1);
  // the right push sends the block to the middle of the zone (32 away); the child's push is in proportion, never inside the zone
  const ratio = (32 * A.b) / A.a;
  const d = good ? 32 : A.over ? clamp(ratio, 43, 47) : clamp(ratio, 5, 19);
  const v = pushFor(d);
  c.ctls.push({ at: 2, run: () => { Sleeping.set(ballP.part!, false); Body.setVelocity(ballP.part!, { x: v, y: 0 }); } });
  return { verdict: () => { const x = block.part!.position.x / S; return x > zone.x - zone.w / 2 + 1 && x < zone.x + zone.w / 2 - 1; } };
}

export function createSim(rig: Rig, good: boolean, amount: Amount, sceneKey = ''): Sim {
  // a bridge cannot show "too much" (a longer plank still bridges): it is drawn as a too short plank
  const A: Amount = rig === 'bridge' && !good && amount.over ? { ...amount, over: false, b: Math.max(1, amount.a - 1) } : amount;
  const c = context(hash(`${sceneKey}|${rig}|${good}|${A.a}|${A.b}`));
  c.ground(rig === 'bridge' ? [34, 66] : undefined); // the bridge gap has no floor under it
  const built: Built = rig === 'tower' ? tower(c, good, A) : rig === 'bridge' ? bridge(c, good, A) : rig === 'scale' ? scale(c, good, A) : rig === 'jug' ? jug(c, good, A) : rig === 'shelf' ? shelf(c, good, A) : collide(c, good, A);
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
      calm = !busy && moved < 0.05 ? calm + 1 : (calm > 0 ? calm - 1 : 0);
    },
    get settled() {
      return frame >= MAX_FRAMES || (frame >= MIN_FRAMES && calm >= 30);
    },
    verdict: built.verdict,
    emerged: () => built.emerged?.() ?? !built.verdict(),
    pose(p) {
      if (p.fixed) return p.fixed;
      if (!p.live || !p.part) return null;
      if (p.off) {
        const par = p.part.parent;
        const cos = Math.cos(par.angle);
        const sin = Math.sin(par.angle);
        return { x: par.position.x / S + p.off.dx * cos - p.off.dy * sin, y: par.position.y / S + p.off.dx * sin + p.off.dy * cos, r: par.angle };
      }
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
