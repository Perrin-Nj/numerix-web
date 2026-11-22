#!/usr/bin/env node
// Scene spec validator (node only, no browser). Runs src/game/scene-stage/validate.test.ts with vitest:
// bindings resolve, counts equal the bound numbers (48 renders 48), answers never leak into the entrance, alt text carries only resolved numbers,
// subjects fit the world or are named by the question (a clock in space fails unless the text says clock), signatures are unique,
// and the archetype list matches the API's seed/scene/archetypes.json when that file exists (drift test).
//   node scripts/check-scene-spec.mjs                          pilot fixtures
//   node scripts/check-scene-spec.mjs --export questions.json  an API export [{id, world, grade, scene, source_fr, source_en}]
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const exp = process.argv.indexOf('--export');
const env = { ...process.env, ...(exp > 0 ? { SCENE_EXPORT: path.resolve(process.argv[exp + 1]) } : {}), VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' };
const r = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project', 'unit', 'src/game/scene-stage/validate.test.ts', 'src/game/scene-stage/coverage.test.ts'], { stdio: 'inherit', env, shell: true });
console.log(r.status === 0 ? 'check-scene-spec: ok' : 'check-scene-spec: FAILED');
process.exit(r.status ?? 1);
