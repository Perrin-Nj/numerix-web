import { describe, expect, it } from 'vitest';
import { revealedData } from './reveal';

describe('revealedData before the answer', () => {
  const base = { board: true, marks: [{ x: 3, y: 3, tone: 'info' }], after: { arrows: [{ from: { x: 1, y: 1 }, to: { x: 3, y: 3 } }] } };
  it('does not pre-light the destination square the arrow will show', () => {
    expect(revealedData('grid', base, undefined, String).marks).toEqual([]);
  });
  it('keeps the mark once the answer is known', () => {
    expect((revealedData('grid', base, { numeric: 2 }, String).marks as unknown[]).length).toBe(1);
  });
});
