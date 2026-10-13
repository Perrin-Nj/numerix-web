// Node 22 type stripping: runs the pure layout without a browser.
import assert from 'node:assert/strict';
import { layoutFor } from '../src/game/scene-picture/layout.ts';

const cases = [
  ['ARI-OPE-A02a', [28, 19], (l) => l.kind === 'add' && l.a.tens === 2 && l.a.units === 8 && l.b.tens === 1 && l.b.units === 9],
  ['ARI-OPE-A02a', [7, 5], (l) => l.kind === 'add' && l.a.tens === 0 && l.a.units === 7 && l.cell > 5],
  ['ARI-OPE-A03a', [150, 3], (l) => l.kind === 'add' && l.a.total === 60 && l.capped],
  ['ARI-SUB-A01', [25, 8], (l) => l.kind === 'sub' && l.total === 25 && l.removed === 8 && l.cols === 10],
  ['ARI-OPE-A05', [12, 20], (l) => l.kind === 'missing' && l.a.total === 12 && l.slots === 8],
  ['ARI-OPE-A06a', [4, 7], (l) => l.kind === 'mul' && l.rows === 4 && l.cols === 7],
  ['ARI-SOP-A03a', [12, 3], (l) => l.kind === 'div' && l.per === 4 && l.rem === 0 && l.bowls === 3],
  ['ARI-OPE-A07a', [14, 4], (l) => l.kind === 'div' && l.per === 3 && l.rem === 2],
  ['ARI-SEN-A01c', [347], (l) => l.kind === 'line' && l.value === 347 && l.max === 500],
  ['ARI-SEN-A01c', [6], (l) => l.kind === 'line' && l.max === 10],
  ['ARI-OPE-A02a', [], (l) => l.kind === 'add'],
];
for (const [id, nums, ok] of cases) assert.ok(ok(layoutFor(id, nums)), `${id} ${JSON.stringify(nums)} -> ${JSON.stringify(layoutFor(id, nums))}`);
// Different numbers give a different picture.
assert.notDeepEqual(layoutFor('ARI-OPE-A02a', [28, 19]), layoutFor('ARI-OPE-A02a', [27, 19]));
assert.notDeepEqual(layoutFor('ARI-OPE-A06a', [3, 4]), layoutFor('ARI-OPE-A06a', [4, 3]));
console.log(`scene layout ok (${cases.length + 2} checks)`);
