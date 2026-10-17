// Pure place-value plans for the how-to pictures. No imports so node can run them (scripts/check-method-visual.mjs).
// A plan lists, per place (index 0 = ones), how many blocks to draw at each animation step.

export type PlacePlan = {
  /** Blocks drawn before any regrouping. */
  start: number[];
  /** Blocks after the regroup step (ten ones became one ten, or one ten was broken into ten ones). */
  regrouped: number[];
  /** Blocks drawn at the end. */
  end: number[];
  /** Per place: how many blocks of `regrouped` are new (they pop in). */
  fresh: number[];
  /** Per place: how many blocks leave (add) or are crossed out (subtract) at the end. */
  leaving: number[];
};

const digits = (n: number, len: number) => Array.from({ length: len }, (_, i) => Math.floor(n / 10 ** i) % 10);
const width = (...n: number[]) => Math.min(4, Math.max(...n.map((v) => String(Math.max(0, v)).length)));

/** Adding a and b: blocks per place, then every group of ten moves one place to the left. */
export function addPlan(a: number, b: number): PlacePlan {
  const len = width(a, b, a + b);
  const da = digits(a, len), db = digits(b, len);
  const start = da.map((d, i) => d + db[i]);
  const carryIn = new Array<number>(len).fill(0);
  const carryOut = new Array<number>(len).fill(0);
  for (let i = 0; i < len; i++) {
    carryOut[i] = Math.floor((start[i] + carryIn[i]) / 10);
    if (i + 1 < len) carryIn[i + 1] = carryOut[i];
  }
  const regrouped = start.map((n, i) => n + carryIn[i]);
  const end = regrouped.map((n, i) => n - 10 * carryOut[i]);
  return { start, regrouped, end, fresh: carryIn, leaving: carryOut.map((c) => 10 * c) };
}

/** Subtracting b from a: blocks of a per place, a ten is broken where a digit is too small, then b is crossed out. */
export function subPlan(a: number, b: number): PlacePlan {
  const len = width(a, b);
  const start = digits(a, len), take = digits(b, len);
  const regrouped = [...start];
  const fresh = new Array<number>(len).fill(0);
  for (let p = 0; p < len; p++) {
    if (regrouped[p] >= take[p]) continue;
    let q = p + 1;
    while (q < len && regrouped[q] === 0) q++;
    if (q >= len) break; // a < b: nothing to break, the picture still draws
    regrouped[q] -= 1;
    for (let r = q - 1; r > p; r--) {
      regrouped[r] += 9;
      fresh[r] += 9;
    }
    regrouped[p] += 10;
    fresh[p] += 10;
  }
  return { start, regrouped, end: regrouped, fresh, leaving: take };
}
