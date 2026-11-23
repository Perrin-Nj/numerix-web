// Delivery of a scene spec through the API: the question phase never carries an answer-bound value, the reveal part arrives with the released answer.
// Pure and node runnable: scripts/qa/scene-specs.mjs splits every spec with it, the play screen merges it back.
import { createHash } from 'node:crypto';
import type { BindSource, Loc, SceneSpec } from './spec';

export type SceneQuestionPart = Omit<SceneSpec, 'alt'> & { alt: Loc };
/** `setting` is only set when the full setting holds an end time ("-e4:30", the asked answer): the question part carries it without. */
export type SceneRevealPart = { bind: Record<string, BindSource>; alt_reveal?: Loc; setting?: string };
const END_TIME = /-e\d{1,2}:\d{2}/;
export type SceneEntry = { question: SceneQuestionPart; reveal: SceneRevealPart; hash: string };

const revealOnly = (b: BindSource) => b.from === 'answer' || (b.from === 'derive' && b.reveal_only === true);

export function splitSpec(spec: SceneSpec): { question: SceneQuestionPart; reveal: SceneRevealPart } {
  const bind: Record<string, BindSource> = {};
  const rbind: Record<string, BindSource> = {};
  for (const [k, b] of Object.entries(spec.bind)) (revealOnly(b) ? rbind : bind)[k] = b;
  const { reveal: altReveal, ...alt } = spec.alt;
  const endTime = END_TIME.test(spec.setting);
  return { question: { ...spec, setting: spec.setting.replace(END_TIME, ''), bind, alt }, reveal: { bind: rbind, ...(altReveal ? { alt_reveal: altReveal } : {}), ...(endTime ? { setting: spec.setting } : {}) } };
}

/** The full spec the stage needs at the reveal (or the question part alone before it). */
export function mergeReveal(q: SceneQuestionPart, r?: Partial<SceneRevealPart> | null): SceneSpec {
  if (!r) return q as SceneSpec;
  return { ...q, ...(r.setting ? { setting: r.setting } : {}), bind: { ...q.bind, ...(r.bind ?? {}) }, alt: r.alt_reveal ? { ...q.alt, reveal: r.alt_reveal } : q.alt };
}

const sortKeys = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])])) : v;

export function entryOf(spec: SceneSpec): SceneEntry {
  const { question, reveal } = splitSpec(spec);
  const sorted = sortKeys({ question, reveal }) as { question: SceneQuestionPart; reveal: SceneRevealPart };
  return { ...sorted, hash: createHash('sha256').update(JSON.stringify(sorted)).digest('hex').slice(0, 16) };
}
