/** Next hint from the pool: never a repeat until every hint has been shown, then the cycle starts over. */
export function nextHint(pool: readonly string[], shown: readonly string[], rng: () => number = Math.random): string | null {
  if (pool.length === 0) return null;
  let fresh = pool.filter((h) => !shown.includes(h));
  if (fresh.length === 0) {
    const last = shown[shown.length - 1];
    fresh = pool.length > 1 ? pool.filter((h) => h !== last) : [...pool];
  }
  return fresh[Math.floor(rng() * fresh.length) % fresh.length];
}
