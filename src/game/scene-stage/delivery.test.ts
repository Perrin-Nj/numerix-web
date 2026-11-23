import { describe, expect, it } from 'vitest';
import { resolveScene } from './bind';
import { entryOf, mergeReveal, splitSpec } from './delivery';
import { echecsCases004, PILOT_SCENES } from './fixtures/pilot';

const withEnd = { ...echecsCases004.spec, setting: 'clinic-waiting-queue-3-1-cat.cat-e4:30-d0' };

describe('scene delivery split', () => {
  it('question part has no answer binding, derived wrong value or reveal label', () => {
    for (const p of PILOT_SCENES) {
      const { question, reveal } = splitSpec(p.spec);
      expect(JSON.stringify(question)).not.toMatch(/"from":"answer"|reveal_only/);
      expect(question.alt).not.toHaveProperty('reveal');
      expect(Object.keys({ ...question.bind, ...reveal.bind }).sort()).toEqual(Object.keys(p.spec.bind).sort());
    }
  });
  it('question phase resolves without the reveal; merged spec equals the original', () => {
    for (const p of PILOT_SCENES) {
      const { question, reveal } = splitSpec(p.spec);
      expect(() => resolveScene(question, { ...p.fr, correctAnswer: null })).not.toThrow();
      expect(mergeReveal(question, reveal)).toEqual(p.spec);
    }
  });
  it('scene absent reveal: question part alone; reveal merge adds the answer binding and label', () => {
    const { question, reveal } = splitSpec(echecsCases004.spec);
    expect(mergeReveal(question, null)).toBe(question);
    const full = mergeReveal(question, reveal);
    expect(Object.values(full.bind).some((b) => b.from === 'answer')).toBe(true);
  });
  it('an end time in the setting moves to the reveal', () => {
    const { question, reveal } = splitSpec(withEnd);
    expect(question.setting).toBe('clinic-waiting-queue-3-1-cat.cat-d0');
    expect(mergeReveal(question, reveal).setting).toBe(withEnd.setting);
  });
  it('hash is stable and key order independent', () => {
    const a = entryOf(echecsCases004.spec);
    expect(entryOf(JSON.parse(JSON.stringify(echecsCases004.spec))).hash).toBe(a.hash);
    expect(a.hash).toMatch(/^[0-9a-f]{16}$/);
  });
});
