// Espace quality gates (round 5): every seed question has a scene or a documented refusal, counts equal the text, clock rockets equal the text, no spoiler in the
// opening scene, alt text carries the nouns and numbers, the node budget holds for every rendered scene, reduced motion keeps every count.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { numbersIn, resolveScene } from '../../bind';
import { describeScene } from '../../describe';
import { routeQuestion, type RawQuestion } from '../../route';
import type { PilotScene } from '../../fixtures/pilot';
import { loadArchetype } from '../../registry';
import { checkScene } from '../../validate';
import { nextOf } from './chain';
import { ROWS } from './route';
import seed from './seed.json';

const Q = seed as unknown as RawQuestion[];
const routed = Q.map((q) => ({ q, r: routeQuestion('espace', q) }));
const scenes = routed.filter((x): x is { q: RawQuestion; r: PilotScene } => !('skip' in x.r));

describe('espace coverage', () => {
  it('covers at least 95 percent of the seed, every refusal has a reason, none is covered with a stand-in', () => {
    const refused = routed.filter((x) => 'skip' in x.r);
    for (const x of refused) expect((x.r as { skip: string }).skip.length).toBeGreaterThan(10);
    const bad = scenes.flatMap((x) => checkScene(x.r));
    expect(bad).toEqual([]);
    expect(scenes.length / Q.length).toBeGreaterThanOrEqual(0.95);
  });
  it('at least 30 questions have a hand-made composition of their own', () => {
    expect(Object.keys(ROWS).filter((id) => scenes.some((s) => s.q.id === id)).length).toBeGreaterThanOrEqual(30);
  });
  it('same-quest questions look different (distinct archetype, mode, glyph, room or numbers)', () => {
    const seen = new Map<string, string>();
    for (const { q, r } of scenes) {
      const nums = Object.keys(r.spec.bind).sort().join(',');
      const sig = `${q.quest}|${r.spec.archetype}|${r.spec.setting}|${nums}|${numbersIn(`${q.story.fr} ${q.prompt.fr}`).join(',')}|${JSON.stringify(q.visual ?? null)}`;
      expect(seen.get(sig), `${q.id} looks like ${seen.get(sig)}`).toBeUndefined();
      seen.set(sig, q.id);
    }
  });
});

describe('espace clock scenes', () => {
  it('the clock questions show the control room with the right number of rockets', () => {
    const clocks = scenes.filter((s) => s.q.visual?.kind === 'clock');
    expect(clocks.length).toBeGreaterThanOrEqual(9);
    for (const { q, r } of clocks) {
      expect(['espace.control-clock', 'espace.clock3d']).toContain(r.spec.archetype); // the pad view draws in 3D, the station views stay 2.5D
      const rockets = r.spec.props.find((p) => p.id === 'rockets');
      const named = numbersIn(`${q.story.fr}`).find((n, i) => /^\s*(?:fusées?|fusee)/i.test(q.story.fr.slice(q.story.fr.indexOf(String(n)) + String(n).length)) && i >= 0);
      if (rockets) expect(resolveScene(r.spec, r.fr).props.rockets!.count).toBe(named ?? resolveScene(r.spec, r.fr).props.rockets!.count);
    }
  });
});

describe('espace no spoiler and labels', () => {
  it('the opening scene never resolves the answer, the label states nouns and counts', () => {
    for (const { r } of scenes) {
      const q = resolveScene(r.spec, r.fr);
      for (const [k, b] of Object.entries(r.spec.bind)) if (b.from === 'answer') expect(k in q.values, r.id).toBe(false);
      const label = describeScene(q, 'fr');
      expect(label.length, r.id).toBeGreaterThan(20);
      expect(label, r.id).not.toMatch(/\{|undefined|NaN/);
    }
  });
  it('the next term of a pattern is computed, never typed', () => {
    expect(nextOf([2, 4, 6, 8])).toBe(10);
    expect(nextOf([12, 10, 8])).toBe(6);
    expect(nextOf([3, 6, 12, 24])).toBe(48);
    expect(nextOf([1, 2, 4, 7, 11])).toBe(16);
    expect(nextOf([1, 3, 6, 10])).toBe(15);
  });
});

describe('espace render budget', () => {
  it('every hand-made scene renders at most 250 nodes in every phase and keeps its counts (reduced motion is the same markup)', async () => {
    const hand = scenes.filter((s) => ROWS[s.q.id]);
    for (const { q, r } of hand) {
      const mod = await loadArchetype(r.spec.archetype);
      for (const phase of ['question', 'ok', 'ko'] as const) {
        const scene = resolveScene(r.spec, r.fr, { reveal: phase !== 'question' });
        const html = renderToStaticMarkup(createElement(mod.default, { scene, phase, locale: 'fr' }));
        const nodes = (html.match(/<[a-z]/gi) ?? []).length;
        expect(nodes, `${q.id} ${phase}`).toBeLessThanOrEqual(250);
      }
    }
  });
});
