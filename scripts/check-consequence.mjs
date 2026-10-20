// Node 22 (type stripping): scene library, picker and physics, no browser. Run: node scripts/check-consequence.mjs
import assert from 'node:assert/strict';
import { FAMILIES, SCENES, SCENE_BY_ID, familyOf } from '../src/game/consequence/catalog.ts';
import { RIGS, buildBodies, finalFrame, FLOOR } from '../src/game/consequence/rigs.ts';
import { pickScene, mergeHistory } from '../src/game/consequence/picker.ts';
import { fall, spring, slide, ballistic, collide, stopDistance } from '../src/game/consequence/physics.ts';

// library: 8 families, at least 6 wrong and 6 right each
for (const f of FAMILIES) for (const good of [true, false]) assert.ok(SCENES.filter((s) => s.family === f && s.good === good).length >= 6, `${f} ${good}`);
assert.equal(SCENES.length, 96);

// physics: things land on the floor, springs settle on target, momentum is kept
const f = fall(0, 40);
assert.equal(f[f.length - 1], 40);
assert.ok(f.every((y) => y <= 40 + 1e-9), 'nothing sinks below the floor');
assert.ok(f.length < 360, 'fall settles');
const sp = spring(10, 0);
assert.equal(sp[sp.length - 1], 0);
assert.ok(sp.length < 300, 'spring settles');
const sl = slide(0, 50, 49);
assert.ok(Math.abs(sl[sl.length - 1] - stopDistance(50, 49)) < 1, 'slide stops where the formula says');
const c = collide(2, 10, 1);
assert.ok(Math.abs(2 * 10 - (2 * c.v1 + c.v2)) < 1e-9, 'momentum kept');
const b = ballistic(0, 0, 10, -10, 30);
assert.equal(b.y[b.y.length - 1], 30);

// every scene builds, stays finite, and its finished picture is on stage with nothing under the floor
for (const s of SCENES) for (const n of [3, 4, 5, 6]) {
  const bodies = buildBodies(s.rig, s.good, n);
  assert.ok(bodies.length >= 3, s.id);
  for (const body of bodies) {
    assert.ok(body.frames.length > 0 && body.frames.length < 800, `${s.id} ${body.id} length ${body.frames.length}`);
    for (const fr of body.frames) assert.ok(Object.values(fr).every(Number.isFinite), `${s.id} ${body.id} not finite`);
    const e = finalFrame(body);
    if (body.kind === 'photo') {
      assert.ok(e.x > -2 && e.x < 102, `${s.id} ${body.id} final x ${e.x}`);
      assert.ok(e.y + body.h / 2 <= FLOOR + 8.4, `${s.id} ${body.id} final y ${e.y}`);
    }
  }
}
// the consequence is in the picture: wrong and right end differently
for (const rig of RIGS) {
  const w = JSON.stringify(buildBodies(rig, false, 4).map(finalFrame));
  const r = JSON.stringify(buildBodies(rig, true, 4).map(finalFrame));
  assert.notEqual(w, r, rig);
}

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
console.log(`ok   consequence library: ${SCENES.length} scenes, picker 200 answers x2, physics`);
