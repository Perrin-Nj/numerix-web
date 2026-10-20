// Node 22 (type stripping): scene library, picker and physics, no browser. Run: node scripts/check-consequence.mjs
import assert from 'node:assert/strict';
import { FAMILIES, SCENES, SCENE_BY_ID, familyOf } from '../src/game/consequence/catalog.ts';
import { createSim, settle } from '../src/game/consequence/sim.ts';
import { amountOf, rightAmount, numberOf } from '../src/game/consequence/amounts.ts';
import { pickScene, mergeHistory } from '../src/game/consequence/picker.ts';

// library: 8 families, at least 6 wrong and 6 right each
for (const f of FAMILIES) for (const good of [true, false]) assert.ok(SCENES.filter((s) => s.family === f && s.good === good).length >= 6, `${f} ${good}`);
assert.equal(SCENES.length, 96);

// rigid-body scenes: the outcome comes out of the simulation. Right answer: it works and rests. Wrong answer: the failure itself happens,
// sized by the child's real answer (more or less than the right one, small or large numbers).
const PAIRS = [[4, 5], [4, 3], [6, 9], [8, 5], [3, 7], [5, 2], [2, 1], [7, 11], [42, 47], [347, 374], [120, 96], [2.5, 1.5], [12, 3], [9, 30]];
const RIGHTS = [2, 3, 4, 5, 6, 7, 8, 42, 120];
// amounts: the drawn right and wrong sizes are never equal and stay in range
for (const [r, g] of PAIRS) {
  const A = amountOf(r, g);
  assert.ok(A.a >= 2 && A.a <= 8 && A.b >= 1 && A.b <= A.a + 4 && A.a !== A.b && A.over === (g > r), `amount ${r},${g} -> ${JSON.stringify(A)}`);
}
assert.deepEqual([amountOf('7', '9').a, amountOf([5, 1], 4).over, numberOf('3,5')], [7, false, 3.5]);
let worstStep = 0;
let capped = 0;
const slow = [];
let runs = 0;
const jobs = [];
for (const s of SCENES) {
  if (s.good) for (const r of RIGHTS) jobs.push([s, rightAmount(r), `right ${r}`]);
  else for (const [r, g] of PAIRS) jobs.push([s, amountOf(r, g), `${r} vs ${g}`]);
}
for (const [s, A, label] of jobs) {
  const a = createSim(s.rig, s.good, A, s.id);
  while (!a.settled) {
    const t0 = performance.now();
    a.step();
    worstStep = Math.max(worstStep, performance.now() - t0);
  }
  runs++;
  assert.equal(a.verdict(), s.good, `${s.id} (${label}): the simulation ended ${a.verdict() ? 'right' : 'wrong'}`);
  if (!s.good) assert.ok(a.emerged(), `${s.id} (${label}): the failure did not happen in the simulation`);
  if (a.frame >= 420) { capped++; slow.push(`${s.rig}.${s.good ? 'ok' : 'ko'} ${label}`); }
  for (const p of a.pieces) {
    const q = a.pose(p);
    if (!q) continue;
    assert.ok(Object.values(q).every(Number.isFinite), `${s.id} ${p.id} not finite`);
    assert.ok(q.x > -6 && q.x < 106 && q.y < 60, `${s.id} (${label}) ${p.id} left the stage at ${q.x.toFixed(1)},${q.y.toFixed(1)}`);
  }
  // same scene, same seed, same ending
  if (label === '4 vs 5' || label === 'right 4') {
    const b = settle(createSim(s.rig, s.good, A, s.id));
    assert.deepEqual(a.pieces.map((p) => a.pose(p)), b.pieces.map((p) => b.pose(p)), `${s.id} not repeatable`);
  }
}
assert.equal(capped, 0, `${capped} of ${runs} runs never came to rest before the 7 s cap: ${[...new Set(slow)].slice(0, 12).join(', ')}`);
console.log(`     ${runs} runs, worst single physics step ${worstStep.toFixed(1)} ms on this machine; ${capped} cut at 7 s`);

// picker: 200 simulated answers over random families, never the same scene twice in a row, and each pool cycles fully before reuse
let seedv = 7;
const rnd = () => ((seedv = (seedv * 1664525 + 1013904223) >>> 0) / 2 ** 32);
for (const mode of ['mixed', 'sameTopic']) {
  seedv = 7;
  const hist = [];
  const perPool = new Map();
  let rigRepeats = 0;
  for (let i = 0; i < 200; i++) {
    const fam = mode === 'sameTopic' ? 'addsub' : FAMILIES[Math.floor(rnd() * FAMILIES.length)];
    const good = rnd() < 0.5;
    const over = !good && rnd() < 0.5;
    const s = pickScene(fam, good, hist, 'session-1', over);
    assert.ok(!(over && s.rig === 'bridge'), 'a too-big wrong answer never gets the bridge');
    assert.notEqual(s.id, hist[hist.length - 1], `repeat at ${i}`);
    const prev = SCENE_BY_ID.get(hist[hist.length - 1]); if (prev?.rig === s.rig && prev.good === s.good) rigRepeats++;
    hist.push(s.id);
    const k = `${fam}${good}`;
    perPool.set(k, [...(perPool.get(k) ?? []), s.id]);
  }
  for (const [k, ids] of perPool) for (let i = 0; i + 6 <= ids.length; i += 6) assert.equal(new Set(ids.slice(i, i + 6)).size, 6, `${mode} ${k} cycle ${i / 6}`);
  if (mode === 'sameTopic') assert.equal(rigRepeats, 0, 'failing twice on one topic never shows the same set-up');
}
// deterministic, and server history is honoured
assert.equal(pickScene('time', false, ['time.tower.ko'], 'a').id, pickScene('time', false, ['time.tower.ko'], 'a').id);
assert.notEqual(pickScene('time', false, ['time.tower.ko'], 'a').id, 'time.tower.ko');
assert.deepEqual(mergeHistory(['time.tower.ko'], ['a.b', 'time.jug.ko', 'time.tower.ko']), ['time.jug.ko', 'time.tower.ko']);

// family hints
assert.equal(familyOf({ sceneKey: 'fractions:m12' }), 'fractions');
assert.equal(familyOf({ visualKind: 'clock' }), 'time');
assert.equal(familyOf({ skillId: 'ARI-SEN-A01c' }), 'number');
assert.equal(familyOf({ skillId: 'ARI-OPE-A06a' }), 'multdiv');
assert.equal(familyOf({ skillId: 'ARI-OPE-A02a' }), 'addsub');
console.log(`ok   consequence library: ${SCENES.length} scenes, picker 200 answers x2, matter-js scenes end as the answer deserves`);
