// Six physical set-ups. Each builds bodies whose frames come from the solver in physics.ts, for a right and a wrong ending.
// Pure (node can run it). The last frame of every body is the finished picture.
import { ballistic, collide, fall, frames, rotAbout, slide, spring, DT, type Frame } from './physics.ts';

export type BodyKind = 'photo' | 'wood' | 'stone' | 'chasm' | 'glass' | 'water' | 'drop' | 'zone' | 'string';
export type Body = { id: string; kind: BodyKind; slot?: 0 | 1; w: number; h: number; frames: Frame[] };
export const RIGS = ['tower', 'bridge', 'scale', 'jug', 'shelf', 'collide'] as const;
export type Rig = (typeof RIGS)[number];

export const FLOOR = 48;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** One frame list of length T from a per-frame function. */
const tl = (T: number, fn: (t: number) => Partial<Frame>): Frame[] =>
  Array.from({ length: T }, (_, t) => ({ x: 0, y: 0, r: 0, sy: 1, ...fn(t) }));
const at = (a: number[], i: number) => (i < 0 ? a[0] : i < a.length ? a[i] : a[a.length - 1]);

const still = (id: string, kind: BodyKind, x: number, y: number, w: number, h: number, slot?: 0 | 1): Body => ({ id, kind, slot, w, h, frames: frames({ x, y }) });

function tower(good: boolean, n: number): Body[] {
  const B = 9;
  const rest = (i: number) => FLOOR - B / 2 - B * i;
  const bodies: Body[] = [still('floor', 'wood', 50, FLOOR + 4.1, 100, 8.3)];
  if (good) {
    const falls = Array.from({ length: n }, (_, i) => fall(-6, rest(i)));
    const land = (n - 1) * 14 + falls[n - 1].length;
    const wob = spring(0, 0, { v0: 40, k: 110, c: 3 });
    const T = land + wob.length;
    for (let i = 0; i < n; i++)
      bodies.push({
        id: `b${i}`, kind: 'photo', slot: (i % 2) as 0 | 1, w: B, h: B,
        frames: tl(T, (t) => {
          const y = at(falls[i], t - i * 14);
          const th = t >= land && i > 0 ? at(wob, t - land) : 0;
          const [x, yy] = rotAbout(50, FLOOR, 50, y, th);
          return { x, y: yy, r: th };
        }),
      });
    return bodies;
  }
  const extraFall = fall(-8, rest(n), { e: 0.15 });
  const t0 = 6;
  const land = t0 + extraFall.length;
  const sway = spring(0, 0, { v0: 80, k: 90, c: 2.2 });
  const detach = land + 14;
  const out = ballistic(50, rest(n), 18, -16, FLOOR - B / 2, 0.38);
  const T = Math.max(land + sway.length, detach + out.x.length) + 4;
  const th = (t: number) => (t >= land ? at(sway, t - land) : 0);
  for (let i = 0; i < n; i++)
    bodies.push({
      id: `b${i}`, kind: 'photo', slot: (i % 2) as 0 | 1, w: B, h: B,
      frames: tl(T, (t) => {
        const a = i > 1 ? th(t) : 0;
        const [x, y] = rotAbout(50, FLOOR - B * 2, 50, rest(i), a);
        return { x, y, r: a };
      }),
    });
  bodies.push({
    id: 'extra', kind: 'photo', slot: (n % 2) as 0 | 1, w: B, h: B,
    frames: tl(T, (t) => {
      if (t < t0) return { x: 50, y: -8 };
      if (t < land) return { x: 50, y: at(extraFall, t - t0) };
      if (t < detach) {
        const a = th(t);
        const [x, y] = rotAbout(50, FLOOR - B * 2, 50, rest(n), a);
        return { x, y, r: a };
      }
      const k = t - detach;
      const s = Math.min(1, k / Math.max(1, out.x.length - 1));
      return { x: at(out.x, k), y: at(out.y, k), r: 90 * (1 - (1 - s) ** 2) + th(detach) * (1 - s) };
    }),
  });
  return bodies;
}

function bridge(good: boolean, n: number): Body[] {
  const top = 40;
  const bodies: Body[] = [
    still('chasm', 'chasm', 50, 48, 32, 16),
    still('left', 'stone', 17, 48, 34, 16),
    still('right', 'stone', 83, 48, 34, 16),
  ];
  const pw = good ? 40 : 24;
  const item = 8;
  if (good) {
    const f = fall(-4, top - 1.5, { e: 0.22 });
    const x = spring(12, 86, { k: 11, c: 6.4 });
    const start = f.length + 6;
    const T = start + x.length;
    bodies.push({ id: 'plank', kind: 'wood', w: pw, h: 3, frames: tl(T, (t) => ({ x: 50, y: at(f, t) })) });
    bodies.push({
      id: 'walker', kind: 'photo', slot: 0, w: item, h: item,
      frames: tl(T, (t) => {
        const px = at(x, t - start);
        const lift = 3 * Math.min(clamp((px - 28) / 4, 0, 1), clamp((72 - px) / 4, 0, 1));
        return { x: px, y: top - item / 2 - lift };
      }),
    });
    return bodies;
  }
  const f = fall(-4, 54.4, { e: 0.12 });
  const spin = (t: number) => -14 * Math.min(1, t / Math.max(1, f.length * 0.8));
  const x = spring(12, 27 + (n % 3), { k: 40, c: 12 });
  const tip = spring(0, 0, { v0: 55, k: 220, c: 5 });
  const T = Math.max(f.length, x.length + tip.length);
  bodies.push({ id: 'plank', kind: 'wood', w: pw, h: 3, frames: tl(T, (t) => ({ x: 50, y: at(f, t), r: spin(t) })) });
  bodies.push({
    id: 'walker', kind: 'photo', slot: 0, w: item, h: item,
    frames: tl(T, (t) => ({ x: at(x, t), y: top - item / 2, r: t >= x.length ? at(tip, t - x.length) : 0 })),
  });
  return bodies;
}

function scale(good: boolean, n: number): Body[] {
  const px = 50;
  const py = 24;
  const half = 30;
  const c = clamp(n, 3, 5);
  const heavy = c + 2;
  const left = c;
  const right = good ? c : heavy;
  const sign = n % 2 === 0 ? 1 : -1; // which side gets the extra weight
  const [cl, cr] = sign > 0 ? [left, right] : [right, left];
  const drop = fall(-26, 0, { e: 0.2 });
  const delayOf = (j: number) => j * 7;
  const landAll = delayOf(Math.max(cl, cr) - 1) + drop.length;
  const swing = good ? spring(7, 0, { k: 55, c: 2.6 }) : spring(0, sign * 15, { k: 70, c: 3.4 });
  const T = landAll + swing.length;
  const theta = (t: number) => (t < landAll ? (good ? 7 : 0) : at(swing, t - landAll));
  const end = (side: -1 | 1, t: number): [number, number] => {
    const a = (theta(t) * Math.PI) / 180;
    return [px + side * half * Math.cos(a), py + side * half * Math.sin(a)];
  };
  const bodies: Body[] = [
    still('floor', 'wood', 50, FLOOR + 4.1, 100, 8.3),
    still('post', 'wood', px, 36.5, 3, 23),
    still('base', 'wood', px, FLOOR - 1, 22, 2),
    { id: 'beam', kind: 'wood', w: 64, h: 2.4, frames: tl(T, (t) => ({ x: px, y: py, r: theta(t) })) },
  ];
  for (const side of [-1, 1] as const) {
    bodies.push({ id: `str${side}`, kind: 'string', w: 0.5, h: 11, frames: tl(T, (t) => { const [x, y] = end(side, t); return { x, y: y + 5.5 }; }) });
    bodies.push({ id: `pan${side}`, kind: 'wood', w: 19, h: 1.6, frames: tl(T, (t) => { const [x, y] = end(side, t); return { x, y: y + 11 }; }) });
    const cnt = side < 0 ? cl : cr;
    for (let j = 0; j < cnt; j++)
      bodies.push({
        id: `i${side}${j}`, kind: 'photo', slot: (j % 2) as 0 | 1, w: 5.4, h: 5.4,
        frames: tl(T, (t) => {
          const [x, y] = end(side, t);
          const off = (j - (cnt - 1) / 2) * 5.9;
          return { x: x + off, y: y + 11 - 0.8 - 2.7 + at(drop, t - delayOf(j)) };
        }),
      });
  }
  return bodies;
}

function jug(good: boolean): Body[] {
  const jw = 22;
  const jh = 30;
  const inner = { w: 19.6, h: 27.4 };
  const bottom = FLOOR - 0.8;
  const mark = 0.66;
  const fill = good ? spring(0, mark, { k: 22, c: 5.6 }) : spring(0, 1.3, { k: 14, c: 7.2 });
  const level = (t: number) => clamp(at(fill, t), 0, 1);
  const spillAt = good ? Infinity : fill.findIndex((v) => v >= 1);
  const spills = good
    ? []
    : [-1, 1, -1, 1].map((s, i) => {
        const b = ballistic(50 + s * (jw / 2 - 1), FLOOR - jh + 1, s * (10 + i * 2.5), -8, FLOOR - 1.2, 0.3);
        return { s, t0: spillAt + i * 9, b };
      });
  const puddle = spring(0, 1, { k: 40, c: 9 });
  const T = good ? fill.length + 6 : Math.max(fill.length + 6, ...spills.map((s) => s.t0 + s.b.x.length), spillAt + 20 + puddle.length);
  const bodies: Body[] = [
    still('floor', 'wood', 50, FLOOR + 4.1, 100, 8.3),
    {
      id: 'water', kind: 'water', w: inner.w, h: inner.h,
      frames: tl(T, (t) => { const s = level(t); return { x: 50, y: bottom - (inner.h * s) / 2, sy: Math.max(s, 0.001) }; }),
    },
    {
      id: 'stream', kind: 'water', w: 1.6, h: 1,
      frames: tl(T, (t) => {
        const surf = bottom - inner.h * level(t);
        const on = t < fill.length - 2 && (good || level(t) < 1 || t < spillAt + 14);
        const h = on ? Math.max(0, surf - 0) : 0;
        return { x: 50, y: h / 2, sy: Math.max(h, 0.001) };
      }),
    },
    still('jug', 'glass', 50, FLOOR - jh / 2, jw, jh),
    still('mark', 'zone', 50, bottom - inner.h * mark, jw + 4, 0.5),
  ];
  if (!good) {
    bodies.push({ id: 'puddle', kind: 'water', w: 36, h: 1.8, frames: tl(T, (t) => ({ x: 50, y: FLOOR - 0.6, sy: t < spillAt + 10 ? 0.001 : Math.max(at(puddle, t - spillAt - 10), 0.001) })) });
    spills.forEach((sp, i) =>
      bodies.push({
        id: `drop${i}`, kind: 'drop', w: 2.2, h: 3.2,
        frames: tl(T, (t) => (t < sp.t0 ? { x: 50 + sp.s * 9.5, y: FLOOR - jh + 1, sy: 0.001 } : { x: at(sp.b.x, t - sp.t0), y: at(sp.b.y, t - sp.t0) })),
      }),
    );
  }
  return bodies;
}

function shelf(good: boolean, n: number): Body[] {
  const c = clamp(n, 3, 5);
  const sw = 12;
  const left = 8;
  const bw = sw * c + 4;
  const by = 34;
  const iz = 8.4;
  const slotX = (i: number) => left + 2 + sw * i + sw / 2;
  const rest = by - 1.2 - iz / 2;
  const bodies: Body[] = [
    still('floor', 'wood', 50, FLOOR + 4.1, 100, 8.3),
    still('leg1', 'wood', left + 3, 41.7, 2.4, 12.8),
    still('leg2', 'wood', left + bw - 3, 41.7, 2.4, 12.8),
    still('board', 'wood', left + bw / 2, by, bw, 2.4),
  ];
  for (let i = 0; i < c; i++) bodies.push(still(`slot${i}`, 'zone', slotX(i), rest, 10.4, 9.2));
  const falls = Array.from({ length: c }, () => fall(-6, rest));
  const land = (c - 1) * 16 + falls[c - 1].length;
  const exFall = fall(-6, rest - iz, { e: 0.3 });
  const exLand = land + 8 + exFall.length;
  const out = ballistic(slotX(c - 1), rest - iz, 27, -15, FLOOR - iz / 2, 0.42);
  const roll = slide(0, 12, 30).map((d) => d * 0.5);
  const T = good ? land + 6 : exLand + out.x.length + roll.length;
  for (let i = 0; i < c; i++)
    bodies.push({ id: `p${i}`, kind: 'photo', slot: (i % 2) as 0 | 1, w: iz, h: iz, frames: tl(T, (t) => ({ x: slotX(i), y: at(falls[i], t - i * 16) })) });
  if (!good)
    bodies.push({
      id: 'extra', kind: 'photo', slot: (c % 2) as 0 | 1, w: iz, h: iz,
      frames: tl(T, (t) => {
        const x0 = slotX(c - 1);
        if (t < land + 8) return { x: x0, y: -8 };
        if (t < exLand) return { x: x0, y: at(exFall, t - land - 8) };
        const k = t - exLand;
        const done = k >= out.x.length;
        return { x: done ? at(out.x, out.x.length - 1) + at(roll, k - out.x.length) : at(out.x, k), y: at(out.y, k), r: done ? 0 : 200 * Math.min(1, k / out.x.length) };
      }),
    });
  return bodies;
}

function collideRig(good: boolean, n: number): Body[] {
  const a = 49; // friction deceleration
  const bs = 8;
  const y = FLOOR - bs / 2;
  const zone = { x: 80, w: 16 };
  const target = good ? zone.x - 48 : n % 2 === 0 ? 14 : 44;
  const v0 = Math.sqrt(2 * a * target);
  const contactX = 48 - bs;
  const x0 = 10;
  const tc = Math.round((contactX - x0) / v0 / DT);
  const after = collide(1, v0, 1);
  const run = slide(48, after.v2, a);
  const T = tc + run.length + 8;
  return [
    still('floor', 'wood', 50, FLOOR + 4.1, 100, 8.3),
    still('zone', 'zone', zone.x, FLOOR - 4.7, zone.w, 9.4),
    {
      id: 'block', kind: 'photo', slot: 0, w: bs, h: bs,
      frames: tl(T, (t) => ({ x: t < tc ? 48 : at(run, t - tc), y })),
    },
    {
      id: 'ball', kind: 'photo', slot: 1, w: bs, h: bs,
      frames: tl(T, (t) => {
        const x = Math.min(contactX, x0 + v0 * t * DT);
        return { x, y, r: ((x - x0) / (bs / 2)) * (180 / Math.PI) };
      }),
    },
  ];
}

const BUILD: Record<Rig, (good: boolean, n: number) => Body[]> = { tower, bridge, scale, jug, shelf, collide: collideRig };

/** n picks the variation inside a set-up (how many pieces, which side), so two scenes of one kind are never the same picture. */
export const buildBodies = (rig: Rig, good: boolean, n: number): Body[] => BUILD[rig](good, clamp(Math.round(n), 3, 6));
export const finalFrame = (b: Body): Frame => b.frames[b.frames.length - 1];
export const bodyLength = (bodies: Body[]) => Math.max(...bodies.map((b) => b.frames.length));
