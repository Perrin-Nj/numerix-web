// Deterministic scene picker. State is only the list of scene ids already shown in the session (the server may send
// the same list as `variant_history`). Rules: never the same scene twice in a row; every scene of a pool (family and
// right or wrong) is shown once before any comes back; a different set-up from the last scene when possible. Pure.
import { SCENES, SCENE_BY_ID, type Family, type SceneDef } from './catalog.ts';

export const HISTORY_CAP = 200;
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** A bridge cannot show "too much" (a longer plank still bridges), so a wrong answer above the right one never gets the bridge. */
export const allowed = (s: SceneDef, over?: boolean | null) => !(over && !s.good && s.rig === 'bridge');

/** Admin scene rules (public config `scenes`): a family can be off, and single scenes or whole rigs can be off. */
export type SceneRules = { physics_enabled: boolean; families: Record<string, { enabled: boolean; disabled_variants: string[] }> };
const CFG_KEY: Partial<Record<Family, string>> = { addsub: 'add_sub', multdiv: 'mult_div' };
export const sceneOff = (rules: SceneRules | null | undefined, s: SceneDef): boolean => {
  const f = rules?.families[CFG_KEY[s.family] ?? s.family];
  return !!f && (!f.enabled || f.disabled_variants.includes(s.id) || f.disabled_variants.includes(s.rig));
};

/** The next scene, or null when the admin switched off every scene of this pool (the screen then shows the plain how-to picture). */
export function pickScene(family: Family, good: boolean, history: readonly string[], seed: string, over?: boolean | null, off?: (s: SceneDef) => boolean): SceneDef | null {
  const pool = SCENES.filter((s) => s.family === family && s.good === good && allowed(s, over) && !off?.(s));
  if (!pool.length) return null;
  // scenes of this pool shown since the pool was last used up
  let used = new Set<string>();
  for (const id of history) {
    if (SCENE_BY_ID.get(id)?.family === family && SCENE_BY_ID.get(id)?.good === good) {
      used.add(id);
      if (used.size === pool.length) used = new Set();
    }
  }
  let cands = pool.filter((s) => !used.has(s.id));
  const lastId = history[history.length - 1];
  const lastRig = SCENE_BY_ID.get(lastId ?? '')?.rig;
  const noRepeat = cands.filter((s) => s.id !== lastId);
  if (noRepeat.length) cands = noRepeat;
  const freshRig = cands.filter((s) => s.rig !== lastRig);
  if (freshRig.length) cands = freshRig;
  return cands[hash(`${seed}|${history.length}`) % cands.length];
}

/** Server history wins when longer (a reload on another device); otherwise keep what this tab saw. */
export const mergeHistory = (local: readonly string[], server?: readonly string[] | null): string[] =>
  (server && server.length > local.length ? [...server] : [...local]).filter((id) => SCENE_BY_ID.has(id)).slice(-HISTORY_CAP);
