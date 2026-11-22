#!/usr/bin/env node
// Brief conformance gate: every scene spec cites its approved brief (scene-briefs/<world>.md) with keywords that must occur in the brief's lines,
// and the numbers of the brief's scene line equal the numbers the spec binds. Runs src/game/scene-stage/brief.test.ts (vitest, node).
// The briefs folder is found in this worktree, in SCENE_BRIEFS_DIR, or in the main checkout of the same repo.
import { spawnSync } from 'node:child_process';

const env = { ...process.env, VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' };
const r = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project', 'unit', 'src/game/scene-stage/brief.test.ts'], { stdio: 'inherit', env, shell: true });
console.log(r.status === 0 ? 'check-scene-brief: ok' : 'check-scene-brief: FAILED');
process.exit(r.status ?? 1);
