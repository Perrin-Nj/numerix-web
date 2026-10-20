// Node 22 (type stripping): scene library, picker and physics, no browser. Run: node scripts/check-consequence.mjs
import assert from 'node:assert/strict';
import { FAMILIES, SCENES, SCENE_BY_ID, familyOf } from '../src/game/consequence/catalog.ts';
import { createSim, settle } from '../src/game/consequence/sim.ts';
import { pickScene, mergeHistory } from '../src/game/consequence/picker.ts';

// library: 8 families, at least 6 wrong and 6 right each
for (const f of FAMILIES) for (const good of [true, false]) assert.ok(SCENES.filter((s) => s.family === f && s.good === good).length >= 6, `${f} ${good}`);
assert.equal(SCENES.length, 96);

// rigid-body scenes: the outcome comes out of the simulation. Right answer: it works and rests. Wrong answer: it visibly does not.
let worstStep = 0;
let capped = 0;
for (const s of SCENES) for (const n of [3, 4, 5, 6]) {
  const a = createSim(s.rig, s.good, n, s.id);
  while (!a.settled) {
    const t0 = performance.now();
    a.step();
    worstStep = Math.max(worstStep, performance.now() - t0);
  }
  assert.equal(a.verdict(), s.good, `${s.id} n=${n}: the simulation ended ${a.verdict() ? 'right' : 'wrong'}`);
  if (a.frame >= 420) capped++;
  for (const p of a.pieces) {
    const q = a.pose(p);
    if (!q) continue;
    assert.ok(Object.values(q).every(Number.isFinite), `${s.id} ${p.id} not finite`);
    assert.ok(q.x > -6 && q.x < 106 && q.y < 60, `${s.id} n=${n} ${p.id} left the stage at ${q.x.toFixed(1)},${q.y.toFixed(1)}`);
  }
  // same scene, same seed, same ending
  if (n === 4) {
    const b = settle(createSim(s.rig, s.good, n, s.id));
    assert.deepEqual(a.pieces.map((p) => a.pose(p)), b.pieces.map((p) => b.pose(p)), `${s.id} not repeatable`);
  }
}
assert.ok(capped < SCENES.length * 4 * 0.4, `${capped} scenes never came to rest`);
console.log(`     worst single physics step ${worstStep.toFixed(1)} ms on this machine; ${capped} of ${SCENES.length * 4} runs cut at 7 s`);

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
    const s = pickScene(fam, good, hist, 'session-1');
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
