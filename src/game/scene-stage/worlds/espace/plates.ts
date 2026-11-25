// What the tag row paints at run time, from what the child's screen already holds: the cards of an order or match question, or numeric choices.
// Question phase: the texts only (the rank of each card is its place on screen). Reveal: the rank of each card in the answer, the matched partner, the right choice.
type Card = { id: string; text: string };
export type RunItems = { cards?: Card[]; left?: Card[]; right?: Card[] };
export type Plates = { t: string[]; rank: number[]; pair: string[]; win: number; /** match: the right column as the child sees it (the partner cards, in their own order) */ right?: string[] };

const first = (t: string) => Number((/\d+(?:[.,]\d+)?/.exec(t.replace(/[\u00a0\u202f ]/g, ''))?.[0] ?? 'NaN').replace(',', '.'));
const rankBy = (v: number[]) => v.map((x, i) => v.filter((y, j) => y < x || (y === x && j < i)).length);

export function runtimePlates(items: RunItems | undefined, choices: readonly (number | string)[], correct: unknown, reveal: boolean): Plates | null {
  if (items?.cards) {
    // the released answer arrives as the ids in order, or (render audit) as the rank of each card "2,1,3"
    const ranksCsv = reveal && typeof correct === 'string' && /^\d+(,\d+)*$/.test(correct) ? correct.split(',').map((x) => Number(x) - 1) : null;
    const seq = reveal && Array.isArray(correct) ? (correct as string[]) : [];
    if (ranksCsv && ranksCsv.length === items.cards.length) return { t: items.cards.map((x) => x.text), rank: ranksCsv, pair: [], win: -1 };
    return { t: items.cards.map((x) => x.text), rank: items.cards.map((x, i) => (seq.includes(x.id) ? seq.indexOf(x.id) : i)), pair: [], win: -1 };
  }
  if (items?.left && items.right) {
    const pairs = reveal && Array.isArray(correct) ? (correct as string[][]) : [];
    const partners = reveal && typeof correct === 'string' ? correct.split('|') : null; // render audit: the partner text of each card
    const pair = partners && partners.length === items.left.length ? partners : items.left.map((l) => items.right!.find((r) => pairs.some(([a, b]) => a === l.id && b === r.id))?.text ?? '');
    const v = pair.map(first);
    return { t: items.left.map((x) => x.text), rank: reveal && !v.some(Number.isNaN) ? rankBy(v) : v.map((_, i) => i), pair, win: -1, right: items.right.map((x) => x.text) };
  }
  const txt = choices.map(String);
  if (!txt.length || txt.some((t) => Number.isNaN(first(t)))) return null;
  return { t: txt, rank: rankBy(txt.map(first)), pair: [], win: reveal ? choices.findIndex((c) => c === correct || String(c) === String(correct)) : -1 };
}
