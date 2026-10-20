// Tiny deterministic solver (no imports, runs in node). Stage units: 100 wide, 56.25 high, y grows downward.
// Every function returns one sample per frame at DT; nothing here touches the DOM or a timer.
export const DT = 1 / 60;
export const G = 140; // units per second squared
export type Frame = { x: number; y: number; r: number; sy: number };

const MAX = 360;

/** Gravity with bounce: centre y from y0 down to the floor, ends at rest exactly on `floor`. */
export function fall(y0: number, floor: number, o: { v0?: number; e?: number; g?: number } = {}): number[] {
  const { v0 = 0, e = 0.32, g = G } = o;
  const out = [y0];
  let y = y0;
  let v = v0;
  while (out.length < MAX) {
    v += g * DT;
    y += v * DT;
    if (y >= floor) {
      y = floor;
      v = -v * e;
      if (Math.abs(v) < 6) {
        out.push(floor);
        return out;
      }
    }
    out.push(y);
  }
  out.push(floor);
  return out;
}

/** Damped spring (value, not force): from `from` toward `to`, stops when settled, ends exactly on `to`. */
export function spring(from: number, to: number, o: { k?: number; c?: number; v0?: number } = {}): number[] {
  const { k = 160, c = 8, v0 = 0 } = o;
  const out = [from];
  let x = from;
  let v = v0;
  while (out.length < MAX) {
    v += (-k * (x - to) - c * v) * DT;
    x += v * DT;
    out.push(x);
    if (Math.abs(x - to) < 0.02 && Math.abs(v) < 0.08) break;
  }
  out.push(to);
  return out;
}

/** Slide with friction deceleration `a` (units/s2) from speed v0; returns x samples, rests where it stops. */
export function slide(x0: number, v0: number, a: number): number[] {
  const out = [x0];
  let x = x0;
  let v = v0;
  while (v > 0 && out.length < MAX) {
    x += v * DT;
    v -= a * DT;
    out.push(x);
  }
  return out;
}

/** Stopping distance of `slide`. */
export const stopDistance = (v0: number, a: number) => (v0 * v0) / (2 * a);

/** Speeds after a 1D collision of mass m1 at speed v1 into m2 at rest (elastic). */
export function collide(m1: number, v1: number, m2: number): { v1: number; v2: number } {
  return { v1: ((m1 - m2) / (m1 + m2)) * v1, v2: ((2 * m1) / (m1 + m2)) * v1 };
}

/** Thrown body: x and y per frame until it rests on `floor`, bouncing with `e` and losing sideways speed on each bounce. */
export function ballistic(x0: number, y0: number, vx: number, vy: number, floor: number, e = 0.4): { x: number[]; y: number[] } {
  const xs = [x0];
  const ys = [y0];
  let x = x0;
  let y = y0;
  let vyy = vy;
  let vxx = vx;
  while (xs.length < MAX) {
    vyy += G * DT;
    y += vyy * DT;
    x += vxx * DT;
    if (y >= floor) {
      y = floor;
      vyy = -vyy * e;
      vxx *= 0.55;
      if (Math.abs(vyy) < 8) {
        xs.push(x);
        ys.push(floor);
        break;
      }
    }
    xs.push(x);
    ys.push(y);
  }
  return { x: xs, y: ys };
}

/** Rotate point (x,y) about (px,py) by deg. */
export function rotAbout(px: number, py: number, x: number, y: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  const dx = x - px;
  const dy = y - py;
  return [px + dx * Math.cos(a) - dy * Math.sin(a), py + dx * Math.sin(a) + dy * Math.cos(a)];
}

const last = <T,>(a: T[]) => a[a.length - 1];
/** Stretch/pad channels to one Frame list; a number is a constant, a short list holds its last value. */
export function frames(ch: { x?: number | number[]; y?: number | number[]; r?: number | number[]; sy?: number | number[] }, lead = 0): Frame[] {
  const get = (v: number | number[] | undefined, d: number) => (v === undefined ? [d] : Array.isArray(v) ? v : [v]);
  const x = get(ch.x, 0);
  const y = get(ch.y, 0);
  const r = get(ch.r, 0);
  const sy = get(ch.sy, 1);
  const n = Math.max(x.length, y.length, r.length, sy.length);
  const at = (a: number[], i: number) => (i < a.length ? a[i] : last(a));
  const out: Frame[] = [];
  for (let i = 0; i < n; i++) out.push({ x: at(x, i), y: at(y, i), r: at(r, i), sy: at(sy, i) });
  // hold the first frame `lead` frames (the delay before this body moves)
  return lead > 0 ? [...Array.from({ length: lead }, () => out[0]), ...out] : out;
}

/** A value list that waits `n` frames on its first sample. */
export const wait = (n: number, a: number[]) => [...Array.from({ length: Math.max(0, n) }, () => a[0]), ...a];
