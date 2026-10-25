// What a question picture shows once the answer is known. Pure, no React, so a plain node script can check it.
type Loc = string | number | { fr?: string; en?: string } | undefined | null;
type D = Record<string, unknown>;
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** After the answer the picture shows the solution: a number line gets its arrow, ordered tiles line up. */
export type Reveal = {
  numeric?: number;
  text?: string;
  order?: { sequence: string[]; cards: { id: string; text: string }[] };
};

/** The picture data with the solution drawn in. A number line moves its arrow to the answer only when its author set revealArrow. */
export function revealedData(kind: string, base: D, reveal: Reveal | undefined, txt: (v: Loc) => string): D {
  let data = base;
  if (reveal && kind === 'numberline' && data.revealArrow === true && reveal.numeric !== undefined && reveal.numeric >= num(data.min) && reveal.numeric <= num(data.max, 100)) {
    data = { ...data, arrow: reveal.numeric }; // the arrow lands on the answer
  }
  if (reveal?.order && kind === 'grid') {
    const cells = (data.cells as { x: number; y: number; label: Loc }[] | undefined) ?? [];
    const picked = reveal.order.sequence.map((id) => {
      const text = reveal.order!.cards.find((c) => c.id === id)?.text;
      return cells.find((c) => text !== undefined && txt(c.label) === text);
    });
    if (picked.length > 0 && picked.every(Boolean)) {
      const y = picked[0]!.y;
      const placed = picked.map((c, i) => ({ ...c!, x: i + 1, y })); // tiles line up in the right order
      data = {
        ...data,
        cells: [...cells.filter((c) => !picked.includes(c)), ...placed],
      };
    }
  }
  if (reveal && kind === 'clock') {
    // a clock question: the hands move to the answer ("4 h 30", or an hour such as 3)
    const m = reveal.text ? /(\d{1,2})\s*h\s*(\d{1,2})?/i.exec(reveal.text) : null;
    if (m)
      data = {
        ...data,
        hour: Number(m[1]) % 12,
        minute: m[2] ? Number(m[2]) : 0,
      };
    else if (reveal.numeric !== undefined && Number.isInteger(reveal.numeric) && reveal.numeric >= 1 && reveal.numeric <= 12) data = { ...data, hour: reveal.numeric % 12, minute: 0 };
  }
  if (reveal && kind === 'grid' && !(data.board === true)) data = { ...data, __light: true }; // counted tiles light up one by one
  // what the question's author drew for the moment after the answer: highlighted squares and arrows
  const after = data.after as Record<string, unknown> | undefined;
  if (reveal && after) {
    const merged: D = { ...data };
    for (const [k, v] of Object.entries(after)) merged[k] = Array.isArray(v) ? [...(Array.isArray(data[k]) ? (data[k] as unknown[]) : []), ...v] : v; // lists add up, other values replace
    data = merged;
  }
  return data;
}

/** The total written under a counting picture once the answer is known (grid, pictograph, bars), or null. */
export function revealBadge(kind: string, reveal: Reveal | undefined): string | null {
  if (!reveal || reveal.numeric === undefined) return null;
  return kind === 'grid' || kind === 'pictograph' || kind === 'bars' ? String(reveal.numeric) : null;
}
