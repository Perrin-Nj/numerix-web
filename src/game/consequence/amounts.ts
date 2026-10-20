// What a scene shows: the right amount and the child's own wrong one, scaled to a drawable size. Pure.
export type Amount = {
  /** Drawn right amount, 2 to 8 pieces. */
  a: number;
  /** Drawn amount of the child's answer, 1 to a+4 (never equal to a). */
  b: number;
  /** The child answered more than the right amount. */
  over: boolean;
  /** The real numbers, for the caption. Null when the answer is not a number. */
  right: number | null;
  given: number | null;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** First number inside an answer value (a number, a numeric string, or [quotient, remainder]). */
export function numberOf(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.replace(',', '.')))) return Number(v.replace(',', '.'));
  if (Array.isArray(v) && v.length) return numberOf(v[0]);
  return null;
}

/** Size of a wrong answer next to the right one. Large numbers keep their ratio (347 against 374 is 6 against 7), small ones are drawn as they are. */
export function amountOf(right?: unknown, given?: unknown, salt = 0): Amount {
  const r = numberOf(right);
  const g = numberOf(given);
  if (r === null || g === null || r === g || Math.abs(r) < 1e-9) {
    const over = salt % 2 === 0;
    return { a: 4, b: over ? 6 : 2, over, right: r, given: g };
  }
  const R = Math.abs(r);
  const G = Math.abs(g);
  const over = G > R;
  const a = clamp(Math.round(R <= 8 ? R : 6), 2, 8);
  let b = clamp(Math.round(a * (G / R)), 1, a + 4);
  if (b === a) b = over ? a + 1 : Math.max(1, a - 1);
  if (over && b <= a) b = a + 1;
  if (!over && b >= a) b = a - 1;
  return { a, b, over, right: r, given: g };
}

/** The right amount only (a right answer). */
export const rightAmount = (right?: unknown): Amount => {
  const r = numberOf(right);
  return { a: r !== null && Math.abs(r) >= 2 && Math.abs(r) <= 8 ? Math.round(Math.abs(r)) : r !== null && Math.abs(r) > 8 ? 6 : 4, b: 0, over: false, right: r, given: null };
};
