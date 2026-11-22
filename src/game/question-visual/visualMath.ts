// Pure helpers of the question pictures (no React): easy to test, shared by the components.

type Pt = { x: number; y: number };

/** Grid cells are 1-based: x counts columns from the left, y counts rows from the TOP (row 1 is the top row), as the questions say. */
export function gridCellAt<T extends Pt>(cells: T[], col: number, row: number, oneBased: boolean): T | undefined {
  return oneBased ? cells.find((c) => c.x === col + 1 && c.y === row + 1) : cells.find((c) => c.x === col && c.y === row);
}

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
/** Whole-number axis for a bar chart: at most 5 steps, the top is a multiple of the step. */
export function niceAxis(max: number): { top: number; step: number; ticks: number[] } {
  const m = Math.max(1, Math.ceil(max));
  const step = STEPS.find((s) => Math.ceil(m / s) <= 5) ?? Math.ceil(m / 5);
  const top = Math.ceil(m / step) * step;
  return { top, step, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) };
}

/** Whole numbers written in a text that fall inside [min, max], in order, once each. */
export function namedNumbers(text: string | undefined, min: number, max: number): number[] {
  const found = (text ?? '').match(/\d+/g)?.map(Number) ?? [];
  return [...new Set(found)].filter((n) => n >= min && n <= max).sort((a, b) => a - b);
}

const ICONS: [RegExp, string][] = [
  [/\bpions?\b|\bpawns?\b/i, 'chess-pawn-b'],
  [/\bchaises?\b|\bchairs?\b/i, 'chair'],
  [/\bfourgonnettes?\b|\bvans?\b|\bautobus\b|\bbus\b/i, 'bus'],
  [/\bbo[iî]tes?\b|\bboxes?\b/i, 'box'],
  [/\bfus[ée]es?\b|\brockets?\b/i, 'rocket'],
];
/** The object a story is about, for a pictograph row that names none (so a pawn story never shows stars). */
export function iconForContext(text: string | undefined): string | null {
  for (const [re, icon] of ICONS) if (re.test(text ?? '')) return icon;
  return null;
}

/** Tile colour and pattern a row label asks for (pansements bleus, a pois, rayés), or null. */
export function tileLook(label: string): { bg: string; pattern?: 'dots' | 'stripes' } | null {
  const l = label.toLowerCase();
  const pattern = /pois|dots/.test(l) ? 'dots' : /ray[eé]|stripe/.test(l) ? 'stripes' : undefined;
  const bg = /bleu|blue/.test(l) ? '#bfdbfe' : /vert|green/.test(l) ? '#bbf7d0' : /rouge|red/.test(l) ? '#fecaca' : /jaune|yellow/.test(l) ? '#fef08a' : /rose|pink/.test(l) ? '#fbcfe8' : pattern ? '#f1f5f9' : null;
  return bg ? { bg, pattern } : null;
}

/** A partly filled array (23 items in rows of 5) must not show its remainder before the answer: it is drawn as a loose pile. */
export function loosePile(count: number, cols: number): { cols: number } | null {
  if (cols < 2 || count <= cols || count % cols === 0) return null;
  const c = Math.max(2, Math.ceil(Math.sqrt(count * 1.6)));
  return { cols: c === cols ? cols + 1 : c };
}
