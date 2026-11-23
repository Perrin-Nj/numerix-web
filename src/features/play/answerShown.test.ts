import { describe, expect, it } from 'vitest';
import { answerShown } from './sceneStageFor';

describe('answerShown', () => {
  it('words every answer kind the stage badge can carry', () => {
    expect(answerShown(39, false)).toBe('39');
    expect(answerShown(601, true)).toBe('≈ 600');
    expect(answerShown(4215, true)).toBe('≈ 4000');
    expect(answerShown(true, false)).toBe('@true');
    expect(answerShown(false, false)).toBe('@false');
    expect(answerShown('5 h', false)).toBe('5 h');
    expect(answerShown([4, 2], false)).toBe('4 r 2');
    expect(answerShown(null, false)).toBeUndefined();
  });
});
