#!/usr/bin/env node
// Gate: no question-phase scene spec leaks an answer-bound value, and every reveal merges back and resolves (all specs).
//   node scripts/qa/scene-spoiler-check.mjs [specs.json]     default C:/nx/rel2-api/seed/scene/specs.json (override: SCENE_SPOILER)
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const f = path.resolve(process.argv[2] ?? process.env.SCENE_SPOILER ?? 'C:/nx/rel2-api/seed/scene/specs.json');
const r = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project', 'unit', 'src/game/scene-stage/specs-export.test.ts'], { stdio: 'inherit', shell: true, env: { ...process.env, SCENE_SPOILER: f, VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' } });
console.log(r.status === 0 ? 'scene-spoiler-check: ok' : 'scene-spoiler-check: FAILED');
process.exit(r.status ?? 1);
