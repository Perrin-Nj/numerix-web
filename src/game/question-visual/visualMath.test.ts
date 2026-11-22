import { describe, expect, it } from 'vitest';
import { gridCellAt, iconForContext, loosePile, namedNumbers, niceAxis, tileLook } from './visualMath';

describe('gridCellAt', () => {
  const robot = { x: 1, y: 3, label: 'robot' };
  it('puts "en bas a gauche" (x 1, y 3 of 3) at the last row, first column', () => {
    expect(gridCellAt([robot], 0, 2, true)).toBe(robot);
    expect(gridCellAt([robot], 0, 0, true)).toBeUndefined(); // not top-left
  });
  it('a rover that goes down 3 ends 3 rows below the ramp', () => {
    const cells = [{ x: 1, y: 1 }, { x: 3, y: 4 }];
    expect(gridCellAt(cells, 0, 0, true)).toBe(cells[0]);
    expect(gridCellAt(cells, 2, 3, true)).toBe(cells[1]);
  });
  it('zero based grids keep col,row from the top left', () => {
    const c = { x: 0, y: 2 };
    expect(gridCellAt([c], 0, 2, false)).toBe(c);
  });
});

describe('niceAxis', () => {
  it('uses whole steps only', () => {
    for (const m of [3, 6, 7, 13, 40, 50, 83, 90]) expect(niceAxis(m).ticks.every(Number.isInteger)).toBe(true);
    expect(niceAxis(6).ticks).toEqual([0, 2, 4, 6]);
    expect(niceAxis(90).top).toBe(100);
    expect(niceAxis(50).ticks).toEqual([0, 10, 20, 30, 40, 50]);
  });
});

it('names the numbers a story gives', () => {
  expect(namedNumbers('La fiche montre le 84, puis le 86.', 80, 90)).toEqual([84, 86]);
});
it('follows the story object', () => {
  expect(iconForContext('Léa pose des pions : 1 pion')).toBe('chess-pawn-b');
  expect(iconForContext('rien')).toBeNull();
});
it('reads colours and patterns of a label', () => {
  expect(tileLook('à pois')?.pattern).toBe('dots');
  expect(tileLook('rayés')?.pattern).toBe('stripes');
  expect(tileLook('bleus')?.bg).toBe('#bfdbfe');
  expect(tileLook('chiens')).toBeNull();
});
it('hides the remainder of a partial array until the answer', () => {
  expect(loosePile(23, 5)).not.toBeNull();
  expect(loosePile(20, 5)).toBeNull();
  expect(loosePile(23, 5)!.cols).not.toBe(5);
});
