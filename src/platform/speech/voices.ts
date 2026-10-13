/** Pure voice ranking, no DOM needed (tested by scripts/check-voices.mjs). */
export type VoiceLike = { name: string; lang: string; localService: boolean };

const NATURAL = /natural|neural|online|google|microsoft/i;
const FEMALE = /denise|eloise|hortense|julie|amelie|chantal|sylvie|clara|caroline|linda|natasha|libby|sonia|aria|jenny|samantha|zira|google fran[cç]ais|female|femme/i;
const MALE = /paul|claude|henri|antoine|mark|david|daniel|guy|thomas|fred|(?<!fe)male/i;
const norm = (l: string) => l.toLowerCase().replace('_', '-');

/** Higher is better; -1 means wrong language. */
export function scoreVoice(v: VoiceLike, lang: string, preferredName?: string | null): number {
  const want = norm(lang);
  const have = norm(v.lang);
  if (have.split('-')[0] !== want.split('-')[0]) return -1;
  return (
    100 +
    (preferredName && v.name === preferredName ? 200 : 0) +
    (NATURAL.test(v.name) ? 16 : 0) +
    (FEMALE.test(v.name) ? 40 : MALE.test(v.name) ? -40 : 0) +
    (have === want ? 4 : 0) +
    (v.localService ? 2 : 0)
  );
}

/**
 * Returns the best voice for a language, or null when none matches. The voice named by preferredName wins;
 * otherwise natural-sounding female voices are preferred. Voices of another language are never chosen.
 */
export function pickVoice<T extends VoiceLike>(voices: readonly T[], lang: string, preferredName?: string | null): T | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const s = scoreVoice(v, lang, preferredName);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return best;
}
