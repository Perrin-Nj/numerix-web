// Content gate for scenes (run by scripts/check-scene-spec.mjs). Pilot fixtures by default; SCENE_EXPORT=file.json checks an API export.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PILOT_SCENES, type PilotScene } from './fixtures/pilot';
import { ARCHETYPE_IDS } from './registry';
import { checkAll, checkScene } from './validate';

function scenes(): PilotScene[] {
  const f = process.env.SCENE_EXPORT;
  if (!f) return PILOT_SCENES;
  const rows = JSON.parse(fs.readFileSync(f, 'utf8')) as Array<Record<string, unknown>>;
  return rows.filter((q) => q.scene).map((q) => ({ id: q.id, world: q.world, grade: q.grade, spec: q.scene, fr: q.source_fr, en: q.source_en }) as PilotScene);
}

describe('scene content gate', () => {
  it('every scene passes: bindings, counts equal bound numbers, no answer leak, alt numbers, world props, unique signature', () => {
    const { problems, warnings } = checkAll(scenes());
    for (const w of warnings) console.warn('warn: ' + w);
    expect(problems).toEqual([]);
  });

  it('flags a clock on a chess board (FR-005) unless the question names a clock', () => {
    const base = PILOT_SCENES.find((p) => p.id === 'echecs.cases.004')!;
    const bad = { ...base, spec: { ...base.spec, subjects: ['board', 'clock'] } };
    expect(checkScene(bad).some((p) => p.rule === 'forbidden-prop')).toBe(true);
    const clockQ = PILOT_SCENES.find((p) => p.id === 'espace.horloge.001')!;
    expect(checkScene(clockQ)).toEqual([]); // the story names the control centre clock
  });

  it('flags a hand-typed count that disagrees with the question', () => {
    const base = PILOT_SCENES.find((p) => p.id === 'medecine.doses.001')!;
    const bad = { ...base, spec: { ...base.spec, props: [{ id: 'slots', count: 37, layout: 'ten-frame', lane: 'mid' as const }, base.spec.props[1]!] } };
    // a literal that is not a bound number still renders 37: the provenance rule is on bindings, so the validator checks literals against the text
    const r = checkScene(bad);
    expect(r.length).toBeGreaterThan(0);
  });

  it('web registry matches the API archetype list when the API file exists (drift)', () => {
    const f = path.resolve(__dirname, '../../../../numerix-api/seed/scene/archetypes.json');
    if (!fs.existsSync(f)) return; // lands with the API change (contract-delta.md)
    const api = JSON.parse(fs.readFileSync(f, 'utf8'));
    const ids = (Array.isArray(api) ? api : api.archetypes).map((a: string | { id: string }) => (typeof a === 'string' ? a : a.id)).sort();
    expect(ids).toEqual([...ARCHETYPE_IDS].sort());
  });
});
