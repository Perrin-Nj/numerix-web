#!/usr/bin/env node
// Deterministic scene gate, no browser: writes {id: {pass, reasons[]}} for every seed question of the three worlds.
//   node scripts/qa/scene-gate.mjs [--out C:/nx/scene-qa/deterministic.json]   (seeds: SEED_ROOT or C:/nx/ct-<world>/seed/questions)
// Logic lives in src/dev/scene-gate.test.ts (reuses routeQuestion, checkScene, objects.ts, echecs legal.ts).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const i = process.argv.indexOf('--out');
const out = path.resolve(i > 0 ? process.argv[i + 1] : 'C:/nx/scene-qa/deterministic.json');
const r = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project', 'unit', 'src/dev/scene-gate.test.ts'], { stdio: 'inherit', shell: true, env: { ...process.env, SCENE_GATE_OUT: out, VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' } });
if (r.status !== 0 || !fs.existsSync(out)) {
  console.error('scene-gate: run failed');
  process.exit(r.status || 1);
}
const res = JSON.parse(fs.readFileSync(out, 'utf8'));
const by = {};
const why = {};
for (const [id, v] of Object.entries(res)) {
  (by[id.split('.')[0]] ??= { pass: 0, fail: 0 })[v.pass ? 'pass' : 'fail']++;
  for (const x of v.reasons) why[x.split(':')[0]] = (why[x.split(':')[0]] ?? 0) + 1;
}
console.log(JSON.stringify(by), JSON.stringify(Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 8)));

// ALIGNMENT GATE (rendered): `--align <matrix.json>` merges the viewport matrix of the render audit (C:/nx/scene-qa/gl3d-space-final/matrix.mjs).
// An id fails when, at any viewport and in the question or the reveal, the object+plate box is off centre (>= 8% of the width), too small
// (width fraction < 55% and height fraction < 60%), has overlapping or clipped plates, draws other than the counted objects, has a plate font under 11 px,
// scrolls sideways, or the stage is shorter than 110 px.
const ai = process.argv.indexOf('--align');
if (ai > 0) {
  const matrix = JSON.parse(fs.readFileSync(path.resolve(process.argv[ai + 1]), 'utf8'));
  const perVp = {};
  let bad = 0;
  for (const [id, row] of Object.entries(matrix)) {
    for (const ph of ['q', 'r']) {
      for (const [vp, v] of Object.entries(row[ph] ?? {})) {
        (perVp[vp] ??= { pass: 0, fail: 0 })[v.pass ? 'pass' : 'fail']++;
        if (!v.pass) {
          bad++;
          const a = v.align ?? {};
          (res[id] ??= { pass: true, reasons: [] }).pass = false;
          res[id].reasons.push(`align: ${ph === 'q' ? 'question' : 'reveal'} ${vp} cx=${a.cx} fill=${a.widthFrac}/${a.heightFrac} overlap=${a.overlaps} clip=${a.clipped} drawn=${a.drawn}/${a.expect} font=${a.minFont}${a.cols && !a.cols.ok ? ' columns-misaligned' : ''}${v.scrollX ? ' hscroll' : ''}`);
        }
      }
    }
  }
  // SEMANTIC GATE: numbers drawn at the reveal vs the answer key, reveal differs from question, question does not leak (scripts/qa/semantic-check.mjs)
  const { semantic } = await import('./semantic-check.mjs');
  const seed = JSON.parse(fs.readFileSync(process.env.QA_SEED ?? 'C:/nx/ct-espace/seed/questions/espace.json', 'utf8')).questions;
  const sem = semantic(matrix, seed);
  let semBad = 0;
  for (const [id, v] of Object.entries(sem)) if (!v.pass) {
    semBad++;
    (res[id] ??= { pass: true, reasons: [] }).pass = false;
    res[id].reasons.push(...v.fails.map((f) => `semantic: ${f}`));
  }
  console.log(`semantic gate: ${Object.keys(sem).length - semBad} pass / ${semBad} fail`);
  bad += semBad;
  console.log('alignment gate per viewport', JSON.stringify(perVp), bad ? `FAIL (${bad})` : 'PASS');
  fs.writeFileSync(out, JSON.stringify(res));
  if (bad) process.exitCode = 1;
}
