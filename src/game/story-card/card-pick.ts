// Pure and import-free so node can load it for scripts/check-card-styles.mjs.
export type CardPhoto = { id: string; world: string; fr: string; en: string; w: string[] };
type CardLike = { id: string; world: string; title: string; earned_at: string };

const words = (s: string) => new Set(s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4));
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h ^ (h >>> 15)) >>> 0;
}

/**
 * One photo per card, never shared inside the list until the pool runs out.
 * Best fit first (title words found in the photo's topic words, then same world), ties broken by the card id.
 * `pinned` (card id to photo id, kept on the device) wins, so a card keeps its photo on every screen and when newer cards arrive.
 */
export function assignPhotos(pool: CardPhoto[], cards: CardLike[], pinned: Record<string, string> = {}): Map<string, CardPhoto> {
  const out = new Map<string, CardPhoto>();
  const byId = new Map(pool.map((p) => [p.id, p]));
  const used = new Set(Object.values(pinned));
  const order = [...cards].sort((a, b) => a.earned_at.localeCompare(b.earned_at) || a.id.localeCompare(b.id));
  for (const c of order) {
    const keep = byId.get(pinned[c.id]);
    if (keep) {
      out.set(c.id, keep);
      continue;
    }
    const tw = words(c.title);
    const rank = (p: CardPhoto) => p.w.filter((x) => tw.has(x)).length * 1000 + (p.world === c.world ? 100 : 0);
    let free = pool.filter((p) => !used.has(p.id));
    if (free.length === 0) {
      used.clear(); // pool exhausted: start a second round
      free = pool;
    }
    let best = free[0];
    let bestKey = -Infinity;
    for (const p of free) {
      const key = rank(p) * 1e6 - (hash(`${c.id}|${p.id}`) % 1e6);
      if (key > bestKey) [best, bestKey] = [p, key];
    }
    used.add(best.id);
    out.set(c.id, best);
  }
  return out;
}
