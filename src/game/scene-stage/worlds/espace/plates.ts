// What the tag row paints at run time, from what the child's screen already holds: the cards of an order or match question, or numeric choices.
// Question phase: the texts only (the rank of each card is its place on screen). Reveal: the rank of each card in the answer, the matched partner, the right choice.
type Card = { id: string; text: string };
export type RunItems = { cards?: Card[]; left?: Card[]; right?: Card[] };
export type Plates = { t: string[]; rank: number[]; pair: string[]; win: number };

const first = (t: string) => Number((/\d+(?:[.,]\d+)?/.exec(t.replace(/[\u00a0\u202f ]/g, ''))?.[0] ?? 'NaN').replace(',', '.'));
const rankBy = (v: number[]) => v.map((x, i) => v.filter((y, j) => y < x || (y === x && j < i)).length);

export function runtimePlates(items: RunItems | undefined, choices: readonly (number | string)[], correct: unknown, reveal: boolean): Plates | null {
  if (items?.cards) {
    const seq = reveal && Array.isArray(correct) ? (correct as string[]) : [];
    return { t: items.cards.map((x) => x.text), rank: items.cards.map((x, i) => (seq.includes(x.id) ? seq.indexOf(x.id) : i)), pair: [], win: -1 };
  }
  if (items?.left && items.right) {
    const pairs = reveal && Array.isArray(correct) ? (correct as string[][]) : [];
    const pair = items.left.map((l) => items.right!.find((r) => pairs.some(([a, b]) => a === l.id && b === r.id))?.text ?? '');
    const v = pair.map(first);
    return { t: items.left.map((x) => x.text), rank: reveal && !v.some(Number.isNaN) ? rankBy(v) : v.map((_, i) => i), pair, win: -1 };
  }
  const txt = choices.map(String);
  if (!txt.length || txt.some((t) => Number.isNaN(first(t)))) return null;
  return { t: txt, rank: rankBy(txt.map(first)), pair: [], win: reveal ? choices.findIndex((c) => c === correct || String(c) === String(correct)) : -1 };
}
