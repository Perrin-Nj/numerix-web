import { describe, expect, it } from 'vitest';
import type { Question } from '@/data/api/types';
import { sceneStageFor } from './sceneStageFor';

describe('sceneStageFor with NEXT_PUBLIC_FEATURE_SCENES off (default)', () => {
  it('renders no scene even when the question carries one', () => {
    const q = { id: 'q1', story: 's', prompt: 'p', scene: { kind: 'any' } } as unknown as Question;
    expect(sceneStageFor(q, 'question', 1, null)).toBeNull();
  });
});

describe('sceneStageFor without a scene', () => {
  it('returns null when the question has no scene (flag state irrelevant)', () => {
    expect(sceneStageFor({ story: 's', prompt: 'p' } as unknown as Question, 'question', 1, null)).toBeNull();
    expect(sceneStageFor(undefined, 'question', 1, null)).toBeNull();
  });
});
