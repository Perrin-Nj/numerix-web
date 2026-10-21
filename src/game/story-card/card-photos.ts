import pool from './card-photos.json';
import { assignPhotos, type CardPhoto } from './card-pick';

export type { CardPhoto };
const POOL = pool as CardPhoto[];

/** Photo per card id for a list of cards. Choices are pinned on the device so a card looks the same on every screen. */
export function photosFor(cards: Parameters<typeof assignPhotos>[1], scope = ''): Map<string, CardPhoto> {
  const KEY = `nx.cardPhotos${scope}`;
  let pinned: Record<string, string> = {};
  try {
    pinned = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    // private window or blocked storage: the pick is still deterministic, just not pinned
  }
  const out = assignPhotos(POOL, cards, pinned);
  try {
    const next = { ...pinned, ...Object.fromEntries([...out].map(([id, p]) => [id, p.id])) };
    if (Object.keys(next).length !== Object.keys(pinned).length) localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // see above
  }
  return out;
}
