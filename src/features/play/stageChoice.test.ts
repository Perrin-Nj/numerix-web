import { describe, expect, it } from 'vitest';
import { stageInputs, stageKind } from './stageChoice';
import type { Question } from '@/data/api/types';

const on = { hasScene: false, hasBeat: true, outcomeStage: false, showHow: false, hasMethodVisual: false, hasVisual: false, showCounting: false };

// The play screen and the render-audit page both draw the stage from stageKind: this pins its priority order.
describe('stageKind', () => {
  it('scene wins until the how-to picture shows', () => {
    expect(stageKind({ ...on, hasScene: true, hasVisual: true })).toBe('scene');
    expect(stageKind({ ...on, hasScene: true, outcomeStage: true, showHow: true, hasMethodVisual: true })).toBe('how');
  });
  it('visual, then answer on the same visual, then counting picture, else nothing', () => {
    expect(stageKind({ ...on, hasVisual: true, showCounting: true })).toBe('visual');
    expect(stageKind({ ...on, hasVisual: true, outcomeStage: true })).toBe('answer-on-visual');
    expect(stageKind({ ...on, showCounting: true })).toBe('counting');
    expect(stageKind(on)).toBe('none');
  });
});

describe('stageInputs', () => {
  const q = (o: Partial<Question>) => ({ math_text: 'a 12 b 3', choices: [], ...o }) as Question;
  it('a curated numeric question counts only with a sprite', () => {
    expect(stageInputs(q({ kind: 'numeric' })).showCounting).toBe(false);
    expect(stageInputs(q({ kind: 'numeric', media: [{ role: 'object', image: {} as never }] })).showCounting).toBe(true);
    expect(stageInputs(q({})).showCounting).toBe(true);
  });
});

describe('stageInputs scene backdrop', () => {
  const img = { id: 'a_1', alt: '', width: 1, height: 1, color: '#000', lqip: '', srcset: [] };
  const q = (hero?: boolean) => ({ math_text: '', choices: [], media: [{ role: 'scene', image: img, ...(hero ? { hero_fallback: true } : {}) }] }) as unknown as Question;
  it('keeps a matched scene photo', () => expect(stageInputs(q()).sceneMedia).toBe(img));
  it('never uses the generic world hero as scene content', () => expect(stageInputs(q(true)).sceneMedia).toBeNull());
});
