// Pure layout: numbers in, drawing plan out. No imports, so node can run it without a browser.
export type Group = { tens: number; units: number; total: number };
export type Layout =
  | { kind: 'add'; a: Group; b: Group; cell: number; capped: boolean }
  | { kind: 'sub'; total: number; removed: number; cols: number; cell: number }
  | { kind: 'missing'; a: Group; slots: number; cell: number }
  | { kind: 'mul'; rows: number; cols: number; cell: number }
  | { kind: 'div'; total: number; bowls: number; per: number; rem: number; cell: number }
  | { kind: 'line'; value: number; max: number };

export const MAX_GROUP = 60;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(n) ? n : lo)));

export function group(n: number): Group {
  const total = clamp(n, 0, MAX_GROUP);
  return { tens: Math.floor(total / 10), units: total % 10, total };
}

// Smallest round ceiling for the number line.
export function lineMax(value: number): number {
  for (const m of [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]) if (value <= m) return m;
  return 10 ** Math.ceil(Math.log10(value));
}

/** The operation written in the question ("63 ÷ 9 = ?"), or null. The picture follows the sum on screen, not only the skill. */
export function opOf(mathText?: string | null): 'add' | 'sub' | 'mul' | 'div' | 'missing' | null {
  const t = (mathText ?? '').replace(/\s+/g, ' ');
  if (/\+ \?|\? \+/.test(t)) return 'missing';
  if (/÷|\//.test(t)) return 'div';
  if (/×|\*/.test(t)) return 'mul';
  if (/[−–-]/.test(t)) return 'sub';
  if (/\+/.test(t)) return 'add';
  return null;
}

export function layoutFor(skillId: string, numbers: number[], mathText?: string | null): Layout {
  const [x = 1, y = 1] = numbers;
  const id = skillId.toUpperCase();
  const op = opOf(mathText);
  if (id.includes('SEN')) {
    const value = Math.max(0, Math.round(x));
    return { kind: 'line', value, max: lineMax(value) };
  }
  if (op === 'mul' || (op === null && /A06|MUL/.test(id))) {
    const rows = clamp(x, 1, 10);
    const cols = clamp(y, 1, 10);
    return { kind: 'mul', rows, cols, cell: Math.min(7, 64 / cols, 52 / rows) }; // never taller than the picture frame
  }
  if (op === 'div' || (op === null && /A07|SOP-A03|DIV/.test(id))) {
    const total = clamp(x, 0, 100);
    const bowls = clamp(y, 2, 10);
    const per = Math.floor(total / bowls);
    return { kind: 'div', total, bowls, per, rem: total - per * bowls, cell: Math.min(per > 8 ? 3.4 : 4.4, 52 / Math.max(per, 1) / 1.2) };
  }
  if (op === 'missing' || (op === null && /A05|MISS/.test(id))) {
    const a = group(x);
    const slots = clamp(y - x, 0, MAX_GROUP);
    return { kind: 'missing', a, slots, cell: a.total + slots > 20 ? 3.6 : 5.2 };
  }
  if (op === 'sub' || (op === null && /SUB|A04/.test(id))) {
    const total = clamp(x, 1, MAX_GROUP);
    const cols = Math.min(total, 10);
    return { kind: 'sub', total, removed: clamp(y, 0, total), cols, cell: Math.min(8, 64 / cols, 52 / Math.ceil(total / cols)) };
  }
  const a = group(x);
  const b = group(y);
  return { kind: 'add', a, b, cell: Math.max(a.total, b.total) <= 10 ? 5.6 : 3.6, capped: x > MAX_GROUP || y > MAX_GROUP };
}
