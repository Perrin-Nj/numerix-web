import { describe, expect, it } from 'vitest';
import { groupCount, resolveScene, SceneBindError } from './bind';
import { altNumbersAreBound, describeScene } from './describe';
import { PILOT_SCENES, echecsCases004, espaceHorloge001, medecineDoses001 } from './fixtures/pilot';
import { ARCHETYPE_IDS } from './registry';
import { validateSpec, type SceneSpec } from './spec';

describe('scene binding (counts come from the question, never typed)', () => {
  it('echecs row: 8 squares, 6 pawns from the visual cells, 2 free only at reveal', () => {
    const q = resolveScene(echecsCases004.spec, echecsCases004.fr);
    expect(q.values).toEqual({ cols: 8, covered: 6 });
    expect(q.props.pawns!.count).toBe(6);
    expect(q.props.pawns!.cells).toHaveLength(6);
    expect('free' in q.values).toBe(false); // the answer never reaches the entrance
    const r = resolveScene(echecsCases004.spec, echecsCases004.fr, { reveal: true });
    expect(r.values.free).toBe(2);
  });

  it('medecine dose: 20 places and 12 drops read from the sentence; the 8 missing arrive at reveal', () => {
    const q = resolveScene(medecineDoses001.spec, medecineDoses001.fr);
    expect(q.values).toEqual({ total: 20, given: 12 });
    expect(q.props.slots!.count).toBe(20);
    expect(q.props.drops!.count).toBe(12);
    expect(resolveScene(medecineDoses001.spec, medecineDoses001.fr, { reveal: true }).values.left).toBe(8);
  });

  it('the same spec follows other numbers (48 drops renders 48, not 37.5)', () => {
    const src = { ...medecineDoses001.fr, prompt: 'Un chiot doit prendre 48 gouttes. Il en a pris 31 : combien en reste-t-il ?', calc: '48-31', correctAnswer: 17 };
    const r = resolveScene(medecineDoses001.spec, src, { reveal: true });
    expect(r.props.slots!.count).toBe(48);
    expect(r.props.drops!.count).toBe(31);
    expect(r.values.left).toBe(17);
  });

  it('clock hands come from the visual data', () => {
    const src = { ...espaceHorloge001.fr, visual: { kind: 'clock', data: { hour: 9, minute: 30 } }, prompt: 'Quelle heure ? 9 h 30' };
    expect(resolveScene(espaceHorloge001.spec, src).values).toEqual({ hour: 9, minute: 30 });
  });

  it('the clock works for any time and never types it (9:30 reads 9 and 30, label has no hand text)', () => {
    const src = { ...espaceHorloge001.fr, visual: { kind: 'clock', data: { hour: 9, minute: 30 } } };
    const q = describeScene(resolveScene(espaceHorloge001.spec, src), 'fr');
    expect(q).not.toMatch(/[0-9]/);
    expect(describeScene(resolveScene(espaceHorloge001.spec, src, { reveal: true }), 'en')).toContain('9:30');
  });

  it('derives the typical wrong value (20 + 12 = 32) only at reveal', () => {
    expect(resolveScene(medecineDoses001.spec, medecineDoses001.fr).values.wrong).toBeUndefined();
    expect(resolveScene(medecineDoses001.spec, medecineDoses001.fr, { reveal: true }).values.wrong).toBe(32);
  });

  it('refuses a number that is not in the question (provenance)', () => {
    const spec: SceneSpec = { ...medecineDoses001.spec, bind: { ...medecineDoses001.spec.bind, given: { from: 'text', index: 5 } } };
    expect(() => resolveScene(spec, medecineDoses001.fr)).toThrow(SceneBindError);
  });

  it('refuses cells that disagree with the count', () => {
    const src = { ...echecsCases004.fr, visual: { kind: 'grid', data: { cols: 8, rows: 1, cells: [{ x: 1, y: 1 }] } } };
    const spec: SceneSpec = { ...echecsCases004.spec, props: [{ id: 'pawns', count: 6, layout: 'row', lane: 'mid', at: { from: 'visual', pointer: '/data/cells' } }] };
    expect(() => resolveScene(spec, src)).toThrow(/cells but count/);
  });

  it('refuses more than 60 props when the archetype has no grouping', () => {
    const spec: SceneSpec = { ...medecineDoses001.spec, props: [{ id: 'slots', count: 64, layout: 'ten-frame', lane: 'mid' }] };
    expect(validateSpec(spec, ARCHETYPE_IDS).join()).toMatch(/out of 0\.\.60/);
    const bound: SceneSpec = { ...medecineDoses001.spec, bind: { n: { from: 'text', index: 0 } }, props: [{ id: 'slots', count: '$n', layout: 'x', lane: 'mid' }] };
    expect(() => resolveScene(bound, { ...medecineDoses001.fr, prompt: '64 gouttes', story: '' })).toThrow(/over 60/);
  });

  it('groups tens and ones above the cap', () => {
    expect(groupCount(64)).toEqual({ tens: 6, ones: 4 });
  });
});

describe('pilot specs', () => {
  it.each(PILOT_SCENES)('$id is a valid spec with bound alt text in both languages', (p) => {
    expect(validateSpec(p.spec, ARCHETYPE_IDS)).toEqual([]);
    for (const lang of ['fr', 'en'] as const) {
      const r = resolveScene(p.spec, p[lang], { reveal: true });
      expect(altNumbersAreBound(r, lang)).toEqual([]);
      expect(describeScene(r, lang).length).toBeGreaterThan(20);
    }
  });

  it('every question has its own signature', () => {
    const sigs = PILOT_SCENES.map((p) => resolveScene(p.spec, p.fr).signature);
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it('the label states the quantities at rest and adds the answer at reveal', () => {
    const q = describeScene(resolveScene(medecineDoses001.spec, medecineDoses001.fr), 'fr');
    expect(q).toContain('20');
    expect(q).toContain('12');
    expect(q).not.toContain('8 ');
    expect(describeScene(resolveScene(medecineDoses001.spec, medecineDoses001.fr, { reveal: true }), 'en')).toContain('the 8 drops');
  });

  it('flags an unknown archetype and an alt hole', () => {
    const bad: SceneSpec = { ...echecsCases004.spec, archetype: 'echecs.nope', alt: { fr: 'a {zzz}', en: 'b' } };
    expect(validateSpec(bad, ARCHETYPE_IDS).join()).toMatch(/unknown archetype/);
    expect(validateSpec(bad, ARCHETYPE_IDS).join()).toMatch(/\{zzz\}/);
  });
});
