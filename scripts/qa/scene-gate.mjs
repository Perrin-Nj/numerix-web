#!/usr/bin/env node
// Deterministic scene gate, no browser: writes {id: {pass, reasons[]}} for every seed question of the three worlds.
//   node scripts/qa/scene-gate.mjs [--out C:/nx/scene-qa/deterministic.json]   (seeds: SEED_ROOT or C:/nx/ct-<world>/seed/questions)
// Logic lives in src/game/scene-stage/gate.test.ts (reuses routeQuestion, checkScene, objects.ts, echecs legal.ts).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const i = process.argv.indexOf('--out');
const out = path.resolve(i > 0 ? process.argv[i + 1] : 'C:/nx/scene-qa/deterministic.json');
const r = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project', 'unit', 'src/game/scene-stage/gate.test.ts'], { stdio: 'inherit', shell: true, env: { ...process.env, SCENE_GATE_OUT: out, VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' } });
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
