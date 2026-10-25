// The picture after an answer shows the solution: arrow on the right number, tiles in the right order.
import assert from 'node:assert/strict';
import { revealBadge, revealedData } from '../src/game/question-visual/reveal.ts';

const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));
const txt = (v) => (v && typeof v === 'object' ? (v.fr ?? '') : String(v ?? ''));
assert.equal(revealedData('numberline', { min: 0, max: 20, revealArrow: true }, { numeric: 8 }, txt).arrow, 8);
assert.equal(revealedData('numberline', { min: 0, max: 20, revealArrow: true }, { numeric: 99 }, txt).arrow, undefined);
const cells = [6, 2, 8, 4].map((n, i) => ({ x: i + 1, y: 1, label: { fr: String(n), en: String(n) } }));
const cards = ['6', '2', '8', '4'].map((text, i) => ({ id: 'abcd'[i], text }));
const d = revealedData('grid', { cols: 4, rows: 1, cells }, { order: { sequence: ['b', 'd', 'a', 'c'], cards } }, txt);
assert.deepEqual(d.cells.sort((p, q) => p.x - q.x).map((c) => c.label.fr), ['2', '4', '6', '8']);
const base = { cols: 2, rows: 1, cells: [] };
assert.equal(revealedData('grid', base, undefined, txt), base);
// clocks: the hands move to the answer
assert.deepEqual(pick(revealedData('clock', { hour: 4, minute: 0 }, { text: '4 h 30' }, txt), ['hour', 'minute']), { hour: 4, minute: 30 });
assert.deepEqual(pick(revealedData('clock', { hour: 2, minute: 0 }, { numeric: 3 }, txt), ['hour', 'minute']), { hour: 3, minute: 0 });
assert.deepEqual(pick(revealedData('clock', { hour: 3, minute: 0 }, { numeric: 45 }, txt), ['hour', 'minute']), { hour: 3, minute: 0 }); // 45 is minutes, not an hour
assert.equal(revealedData('clock', { hour: 12, minute: 0 }, { text: '12 h' }, txt).hour, 0); // 12 is drawn as 0
// counting grids light up, boards do not
assert.equal(revealedData('grid', { cols: 2, rows: 1, cells: [] }, { numeric: 6 }, txt).__light, true);
assert.equal(revealedData('grid', { board: true, cells: [] }, { numeric: 6 }, txt).__light, undefined);
// the total badge
assert.equal(revealBadge('grid', { numeric: 24 }), '24');
assert.equal(revealBadge('bars', { numeric: 7 }), '7');
assert.equal(revealBadge('clock', { numeric: 3 }), null);
assert.equal(revealBadge('grid', undefined), null);
// a number line whose arrow is a given (a dose) keeps it: the answer is the missing part
assert.equal(revealedData('numberline', { min: 0, max: 20, arrow: 12 }, { numeric: 8 }, txt).arrow, 12);
// what the author drew for after the answer adds to the lists, other values replace
const af = revealedData('numberline', { style: 'vial', segments: [{ value: 12 }], after: { segments: [{ value: 8 }] } }, { numeric: 8 }, txt);
assert.deepEqual(af.segments.map((x) => x.value), [12, 8]);
assert.deepEqual(revealedData('numberline', { segments: [{ value: 12 }], after: { segments: [{ value: 8 }] } }, undefined, txt).segments.map((x) => x.value), [12]);
console.log('reveal checks pass');
