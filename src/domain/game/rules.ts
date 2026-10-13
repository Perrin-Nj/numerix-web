// Game rules shared by selectors and screens. Plain module so node scripts can import it.
// The card threshold is a platform setting (admin dashboard later, BE-22); the app sets it from config at start.
let thresholdPct = 70;
/** Sets the pass threshold, clamped to 0-100. Called once at app start from config; do not call it from screens. */
export const setCardThresholdPct = (n: number) => {
  thresholdPct = Math.min(100, Math.max(0, n));
};
/**
 * Current pass threshold in percent (default 70). Screens read it to show the target; the check itself is
 * passes.
 */
export const cardThresholdPct = () => thresholdPct;
/** A chapter counts as completed, and wins its card, only at or above the threshold. */
export const passes = (correct: number, total: number) => total > 0 && (correct / total) * 100 >= thresholdPct;
/** Steps playable ahead of the completed ones: the map never shows fewer than two ready steps. */
export const READY_AHEAD = 2;
