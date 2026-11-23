// Scene spec delivery export + spoiler gate over the real seed questions (espace). Run through scripts/qa/scene-specs.mjs and scripts/qa/scene-spoiler-check.mjs.
//   SCENE_SPECS_OUT=<file>  write the specs (deterministic, sorted keys)
//   SCENE_SPOILER=<file>    read a specs file and fail when any question-phase part leaks an answer-bound value
// Seeds: SEED_ROOT (<world>.json) or the API seed (C:/nx/rel2-api/seed/questions).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { entryOf, mergeReveal, type SceneEntry } from './delivery';
import { espaceClockDocked } from './fixtures/espace-clock';
import { PILOT_SCENES } from './fixtures/pilot';
import { hasProvenance, resolveScene } from './bind';
import type { World } from './objects';
import { routeQuestion, type RawQuestion } from './route';
import { checkScene } from './validate';

const WORLDS: World[] = ['espace'];
const file = (w: World) => [process.env.SEED_ROOT && path.join(process.env.SEED_ROOT, `${w}.json`), `C:/nx/rel2-api/seed/questions/${w}.json`].find((f) => f && fs.existsSync(f));
const have = WORLDS.every(file);

export function spoilers(id: string, e: SceneEntry, r: ReturnType<typeof routeQuestion>): string[] {
  if ('skip' in r) return [];
  const out: string[] = [];
  const raw = JSON.stringify(e.question);
  if (/"from":"answer"|reveal_only|"reveal":\{"fr"/.test(raw)) out.push('question part holds an answer binding or the reveal label');
  for (const src of [r.fr, r.en]) {
    const a = src.correctAnswer;
    let q;
    try { q = resolveScene(e.question as never, { ...src, correctAnswer: null }); } catch (err) { return [...out, `question phase does not resolve: ${(err as Error).message}`]; }
    if (typeof a === 'number' && !hasProvenance(a, src)) {
      if (Object.values(q.values).includes(a)) out.push(`a question-phase value equals the answer ${a}`);
      if (Object.values(q.props).some((p) => p.count === a && a > 1)) out.push(`a question-phase prop count equals the answer ${a}`);
    }
    if (typeof a === 'string' && a.length > 3 && !`${src.story} ${src.prompt}`.includes(a) && raw.includes(a)) out.push(`question part contains the answer text "${a}"`);
    // the reveal part, merged back, resolves at the reveal
    try { resolveScene(mergeReveal(e.question, e.reveal), src, { reveal: true }); } catch (err) { out.push(`reveal does not resolve: ${(err as Error).message}`); }
  }
  return out.map((p) => `${id}: ${p}`);
}

function routed(): { id: string; r: ReturnType<typeof routeQuestion> }[] {
  const rows: { id: string; r: ReturnType<typeof routeQuestion> }[] = [];
  for (const w of WORLDS) {
    const qs = (JSON.parse(fs.readFileSync(file(w)!, 'utf8')) as { questions: RawQuestion[] }).questions;
    for (const q of qs) rows.push({ id: q.id, r: [...PILOT_SCENES, espaceClockDocked].find((p) => p.id === q.id) ?? routeQuestion(w, q) });
  }
  return rows.sort((a, b) => (a.id < b.id ? -1 : 1));
}

describe.skipIf(!have || !process.env.SCENE_SPECS_OUT)('export scene specs', () => {
  it('writes specs.json for every covered question', () => {
    const lines: string[] = [];
    let skipped = 0;
    const bad: string[] = [];
    for (const { id, r } of routed()) {
      if ('skip' in r || checkScene(r).length) { skipped++; continue; }
      const e = entryOf(r.spec);
      bad.push(...spoilers(id, e, r));
      lines.push(`${JSON.stringify(id)}:${JSON.stringify(e)}`);
    }
    fs.mkdirSync(path.dirname(process.env.SCENE_SPECS_OUT!), { recursive: true });
    fs.writeFileSync(process.env.SCENE_SPECS_OUT!, `{\n${lines.join(',\n')}\n}\n`);
    console.log(`scene-specs: ${lines.length} written, ${skipped} skipped (no scene)`);
    expect(bad).toEqual([]);
  });
});

describe.skipIf(!have || !process.env.SCENE_SPOILER)('scene spoiler gate', () => {
  it('no question-phase part leaks an answer-bound value (every spec)', () => {
    const specs = JSON.parse(fs.readFileSync(process.env.SCENE_SPOILER!, 'utf8')) as Record<string, SceneEntry>;
    const bad: string[] = [];
    let n = 0;
    for (const { id, r } of routed()) {
      const e = specs[id];
      if (!e) continue;
      n++;
      bad.push(...spoilers(id, e, r));
    }
    console.log(`scene-spoiler-check: ${n} specs checked`);
    expect(n).toBeGreaterThan(100);
    expect(bad).toEqual([]);
  });
});
