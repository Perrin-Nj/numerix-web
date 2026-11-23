#!/usr/bin/env node
// Generates the scene specs the API seeds: {questionId: {question, reveal, hash}} for every covered espace question.
//   node scripts/qa/scene-specs.mjs [out.json]     default C:/nx/rel2-api/seed/scene/specs.json (override: SCENE_SPECS_OUT)
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const out = path.resolve(process.argv[2] ?? process.env.SCENE_SPECS_OUT ?? 'C:/nx/rel2-api/seed/scene/specs.json');
const r = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project', 'unit', 'src/game/scene-stage/specs-export.test.ts'], { stdio: 'inherit', shell: true, env: { ...process.env, SCENE_SPECS_OUT: out, VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' } });
console.log(r.status === 0 ? `scene-specs: ok -> ${out}` : 'scene-specs: FAILED');
process.exit(r.status ?? 1);
