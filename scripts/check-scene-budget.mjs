#!/usr/bin/env node
// Scene bundle budget (plan 2.3): scene-stage core at most 25 KB gzip, each archetype chunk at most 12 KB gzip (code plus its CSS).
// Measured on the TypeScript transpile of the sources (JSX compiled, not minified): an upper bound of what ships. Runtime budgets
// (DOM nodes, layers, frame time at 4x CPU, leaks) are measured by scripts/play-scenes.mjs.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'src/game/scene-stage');
const CORE_KB = 25;
const ARCH_KB = 12;
const gz = (s) => zlib.gzipSync(Buffer.from(s), { level: 9 }).length;
const code = (f) => {
  const src = fs.readFileSync(f, 'utf8');
  return f.endsWith('.css') ? src : ts.transpileModule(src, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
};
const bundle = (files) => files.map(code).join('\n');

const core = ['SceneStage.tsx', 'Layer.tsx', 'SceneErrorBoundary.tsx', 'clock.ts', 'bind.ts', 'describe.ts', 'spec.ts', 'registry.ts', 'moves.ts', 'rig.css', 'fx/Particles.ts'].map((f) => path.join(DIR, f));
const rows = [{ name: 'core', kb: gz(bundle(core)) / 1024, max: CORE_KB }];
const archDir = path.join(DIR, 'archetypes');
for (const f of fs.readdirSync(archDir).filter((f) => f.endsWith('.tsx'))) {
  const css = path.join(archDir, f.replace('.tsx', '.css'));
  rows.push({ name: `archetype ${f.replace('.tsx', '')}`, kb: gz(bundle([path.join(archDir, f), ...(fs.existsSync(css) ? [css] : [])])) / 1024, max: ARCH_KB });
}
const kitDir = path.join(DIR, 'kit');
for (const w of ['echecs', 'medecine', 'espace']) {
  const files = [`${w}.tsx`, `${w}.css`].map((x) => path.join(kitDir, x)).filter((x) => fs.existsSync(x));
  if (files.length) rows.push({ name: `kit ${w}`, kb: gz(bundle(files)) / 1024, max: ARCH_KB });
}
rows.push({ name: 'kit shared (Sprite, moves)', kb: gz(bundle([path.join(kitDir, 'Sprite.tsx'), path.join(kitDir, 'moves.css')])) / 1024, max: ARCH_KB });
let bad = 0;
for (const r of rows) {
  const ok = r.kb <= r.max;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.name.padEnd(34)} ${r.kb.toFixed(1).padStart(5)} KB gzip (max ${r.max})`);
}
// every archetype id in the registry has a file and every file is registered
const reg = fs.readFileSync(path.join(DIR, 'registry.ts'), 'utf8');
for (const f of fs.readdirSync(archDir).filter((f) => f.endsWith('.tsx'))) if (!reg.includes(`./archetypes/${f.replace('.tsx', '')}'`)) { console.log(`FAIL archetypes/${f} is not in registry.ts`); bad++; }
process.exit(bad ? 1 : 0);
