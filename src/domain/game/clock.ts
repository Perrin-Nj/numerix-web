/** Wall clock for derived state (decay, streaks). Time passing is the point, so this is deliberately not memoized away. */
export const nowMs = () => Date.now();
