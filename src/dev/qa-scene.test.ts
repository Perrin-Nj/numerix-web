// A routed question must reach the stage as a scene, never as the photo: the QA page and the play screen share sceneStageFor.
import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => { process.env.NEXT_PUBLIC_FEATURE_SCENES = 'true'; });
import { photoFallback } from './stage-check';
import { routeQuestion, type RawQuestion } from '@/game/scene-stage/route';
import { sceneSpecFor } from './qa-beat';

const FILE = process.env.SEED_ROOT ? `${process.env.SEED_ROOT}/espace.json` : 'C:/nx/ct-espace/seed/questions/espace.json';

describe.skipIf(!fs.existsSync(FILE))('routed espace questions draw a scene', () => {
  const qs = (JSON.parse(fs.readFileSync(FILE, 'utf8')) as { questions: RawQuestion[] }).questions;
  it('every routed question gets a spec, a stage and a binding that resolves', () => {
    const bad: string[] = [];
    for (const q of qs) {
      if ('skip' in routeQuestion('espace', q)) continue;
      const spec = sceneSpecFor('espace', q);
      const why = spec ? photoFallback(q, spec) : 'no spec';
      if (why) bad.push(`${q.id}: ${why}`);
    }
    expect(bad).toEqual([]);
  });
});

describe.skipIf(!fs.existsSync(FILE))('espace order questions', () => {
  it('the answer sequence is the displayed cards sorted by their key, both ways', () => {
    const qs = (JSON.parse(fs.readFileSync(FILE, 'utf8')) as { questions: (RawQuestion & { answer: { kind: string; sequence: string[]; by: string } })[] }).questions;
    const bad: string[] = [];
    for (const q of qs.filter((x) => x.answer.kind === 'order')) {
      const cards = q.items as { id: string; key: string }[];
      const keys = q.answer.sequence.map((id) => Number(cards.find((c) => c.id === id)?.key));
      const sorted = [...keys].sort((a, b) => (q.answer.by === 'desc' ? b - a : a - b));
      if (keys.some(Number.isNaN) || keys.join() !== sorted.join() || new Set(q.answer.sequence).size !== cards.length) bad.push(q.id);
    }
    expect(bad).toEqual([]);
  });
});
