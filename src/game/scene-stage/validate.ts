// Content validators for scenes (FR-004, FR-005, FR-050). Pure, node runnable: scripts/check-scene-spec.mjs bundles this file.
import { hasProvenance, resolveScene, SceneBindError } from './bind';
import { altNumbersAreBound } from './describe';
import type { PilotScene } from './fixtures/pilot';
import { namedObjects, type World } from './objects';
import { ARCHETYPE_IDS, ARCHETYPE_META } from './registry';
import { validateSpec, type SceneSource } from './spec';

/** Props each world allows by default. A subject outside this list is only legal when the question text names it (FR-005). */
export const WORLD_PROPS: Record<string, readonly string[]> = {
  echecs: ['board', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'clock-chess', 'trophy', 'table', 'study'],
  medecine: ['puppy', 'kitten', 'rabbit', 'dropper', 'drops', 'syringe', 'bandage', 'scale', 'tray', 'bottle', 'stethoscope', 'vial', 'jar'],
  espace: ['planet', 'moon', 'star', 'rocket', 'capsule', 'station', 'robot', 'astronaut', 'crew', 'comet', 'drone', 'window', 'console'],
};

/** Words that make an otherwise foreign subject legal because the question itself names it. */
const NAMED_BY: Record<string, RegExp> = {
  clock: /horloge|clock|montre|watch|aiguille|hand/i,
  scale: /balance|scale|poids|weigh|kg|gramme/i,
  dropper: /goutte|drop|pipette/i,
};

export type Problem = { id: string; rule: string; detail: string };

export function checkScene(p: PilotScene): Problem[] {
  const out: Problem[] = [];
  const add = (rule: string, detail: string) => out.push({ id: p.id, rule, detail });
  for (const e of validateSpec(p.spec, ARCHETYPE_IDS)) add('spec', e);
  if (!ARCHETYPE_META[p.spec.archetype]) add('registry', `no META for ${p.spec.archetype}`);
  const world = p.spec.archetype.split('.')[0]!;
  if (world !== p.world) add('world', `archetype ${p.spec.archetype} is not a ${p.world} archetype`);
  for (const lang of ['fr', 'en'] as const) {
    const src: SceneSource = p[lang];
    try {
      const q = resolveScene(p.spec, src);
      const r = resolveScene(p.spec, src, { reveal: true });
      // counts equal bound numbers (48 renders 48)
      for (const prop of p.spec.props) {
        if (typeof prop.count === 'string') {
          const want = r.values[prop.count.slice(1)];
          if (r.props[prop.id]?.count !== want) add('count', `${prop.id} renders ${r.props[prop.id]?.count} but ${prop.count} is ${want}`);
        }
      }
      for (const [name, b] of Object.entries(p.spec.bind)) if (b.from === 'answer' && name in q.values) add('answer-leak', `${name} resolved before the reveal`);
      for (const stray of altNumbersAreBound(r, lang)) add('alt', `${lang} label has ${stray}, not a resolved value`);
    } catch (e) {
      add(e instanceof SceneBindError ? 'bind' : 'error', `${lang}: ${(e as Error).message}`);
    }
    for (const prop of p.spec.props) {
      if (typeof prop.count === 'number' && prop.count > 1 && !hasProvenance(prop.count, src)) add('literal-count', `${lang}: ${prop.id} is hand-typed ${prop.count} and the question has no such number`);
    }
    const text = `${src.story} ${src.prompt}`;
    // story-objects: every object the question names is declared in spec.requires and the archetype can draw it
    const can = ARCHETYPE_META[p.spec.archetype]?.can ?? [];
    for (const o of namedObjects(p.world as World, text)) {
      if (!(p.spec.requires ?? []).includes(o)) add('story-objects', `${lang}: the question names "${o}" but spec.requires lacks it`);
      else if (!can.includes(o)) add('story-objects', `${lang}: the question names "${o}" and ${p.spec.archetype} cannot draw it`);
    }
    const allowed = WORLD_PROPS[world] ?? [];
    for (const s of p.spec.subjects) {
      if (!allowed.includes(s) && !(NAMED_BY[s] && NAMED_BY[s]!.test(text))) add('forbidden-prop', `${lang}: subject "${s}" is not a ${world} prop and the question does not name it`);
    }
  }
  return out;
}

export function checkAll(scenes: PilotScene[]): { problems: Problem[]; warnings: string[] } {
  const problems = scenes.flatMap(checkScene);
  const warnings: string[] = [];
  const seen = new Map<string, string>();
  const perBand = new Map<string, number>();
  for (const p of scenes) {
    let sig = '';
    try {
      sig = resolveScene(p.spec, p.fr).signature;
    } catch {
      continue;
    }
    const prev = seen.get(sig);
    if (prev) problems.push({ id: p.id, rule: 'signature', detail: `same signature as ${prev}` });
    seen.set(sig, p.id);
    const band = `${p.world}/g${p.grade}/${p.spec.archetype}`;
    perBand.set(band, (perBand.get(band) ?? 0) + 1);
  }
  for (const [band, n] of perBand) if (n > 3) warnings.push(`${band} used by ${n} questions (limit 3 per world and grade)`);
  return { problems, warnings };
}
