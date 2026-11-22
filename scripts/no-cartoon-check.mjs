#!/usr/bin/env node
// Fails when the kid-facing play experience gets cartoon, flat-vector or emoji art back (owner rule: everything human-like and photographic).
// Source scan (always): emoji codepoints, cartoon libraries/components and sprite assets in src/ (stories and tests excluded).
// DOM scan (optional): node scripts/no-cartoon-check.mjs --url http://localhost:3110 fetches the public play routes and checks the text nodes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
// Pictographs, dingbats, symbols and the zero-width joiner / variation selector that glue emoji sequences
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B1B}\u{2B1C}\u{2B55}\u{231A}\u{231B}\u{23E9}-\u{23F3}\u{FE0F}\u{200D}]/u;
const BANNED = [
  [/@dicebear\//, 'cartoon avatar library'],
  [/from ['"]@\/game\/human-avatar['"]/, 'flat person avatar'],
  [/world-scene\/scenes/, 'flat vector world scenes'],
  [/\bWORLD_EMOJI\b/, 'world emoji'],
  [/fluent-emoji|3D icon/i, 'Fluent emoji sprites'],
  [/kind\s*===?\s*['"]sprite['"]/, 'sprite assets'],
];
// ALLOWLIST (owner decision 17, spec 001-three-worlds-premium): the illustrated 3D scenes under src/game/scene-stage are drawn art
// (inline SVG characters, objects, gradients and a canvas light layer). Inside that folder ONLY the figurative bans are lifted
// (flat person avatar, flat world scenes, sprite assets). Emoji, DiceBear, Fluent emoji and 3D icon packs stay banned there too,
// and every other folder keeps every ban. Add a folder here only with an owner decision; --self-test proves the scope.
export const SCENE_ALLOW = ['src/game/scene-stage/'];
const FIGURATIVE = new Set(['flat person avatar', 'flat vector world scenes', 'sprite assets']);
export function problemsFor(rel, line) {
  const out = [];
  if (EMOJI.test(line)) out.push('emoji');
  const allowed = SCENE_ALLOW.some((p) => rel.startsWith(p));
  for (const [rx, why] of BANNED) if (rx.test(line) && !(allowed && FIGURATIVE.has(why))) out.push(why);
  return out;
}
const skipFile = (f) => /\.(stories|test|spec)\.[tj]sx?$/.test(f) || /[\\/](generated|__snapshots__)[\\/]/.test(f) || /schema\.d\.ts$/.test(f);

if (process.argv.includes('--self-test')) {
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error('self-test failed: ' + m + ' got ' + JSON.stringify(a)); process.exit(1); } };
  eq(problemsFor('src/game/scene-stage/archetypes/x.tsx', "kind === 'sprite'"), [], 'sprite allowed in scene-stage');
  eq(problemsFor('src/game/scene-stage/archetypes/x.tsx', "import '@/game/world-scene/scenes'"), [], 'flat scenes allowed in scene-stage');
  eq(problemsFor('src/game/scene-stage/archetypes/x.tsx', 'const a = "😀"; 😀'.replace('\u{1F600}', String.fromCodePoint(0x1f600))), ['emoji'], 'emoji still banned in scene-stage');
  eq(problemsFor('src/game/scene-stage/x.tsx', "from '@dicebear/core'"), ['cartoon avatar library'], 'dicebear still banned in scene-stage');
  eq(problemsFor('src/game/other/x.tsx', "kind === 'sprite'"), ['sprite assets'], 'sprite banned elsewhere');
  eq(problemsFor('src/game/scene-stage-evil/x.tsx', "kind === 'sprite'"), ['sprite assets'], 'the allowlist matches the folder, not a prefix of the name');
  console.log('no-cartoon-check self-test: ok');
  process.exit(0);
}

const hits = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|json|css)$/.test(e.name) && !skipFile(p)) scan(p);
  }
}
function scan(p) {
  const rel = path.relative(ROOT, p).replace(/\\/g, '/');
  fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
    if (EMOJI.test(line)) hits.push(`${rel}:${i + 1} emoji: ${line.trim().slice(0, 80)}`);
    for (const [rx, why] of BANNED) if (rx.test(line)) hits.push(`${rel}:${i + 1} ${why}`);
  });
}
walk(SRC);

// First-run welcome gift (QA-A-009): must be a real raster photo that exists and is credited, never a CSS or SVG drawn box.
{
  const g = fs.readFileSync(path.join(SRC, 'game/welcome-gift/WelcomeGift.tsx'), 'utf8');
  const photo = /src="(\/gift\/[\w-]+\.(?:webp|jpe?g))"/.exec(g)?.[1];
  if (!photo) hits.push('game/welcome-gift/WelcomeGift.tsx: gift is not a /gift/*.webp photo');
  else if (!fs.existsSync(path.join(ROOT, 'public', photo))) hits.push(`public${photo} is missing`);
  else if (fs.statSync(path.join(ROOT, 'public', photo)).size > 60_000) hits.push(`public${photo} is over 60 KB`);
  if (!/gift/i.test(fs.readFileSync(path.join(ROOT, 'LICENSES.md'), 'utf8'))) hits.push('LICENSES.md has no credit for the gift photo');
  if (/border-2|<svg|rounded-b-lg/.test(g)) hits.push('game/welcome-gift/WelcomeGift.tsx: drawn box or heavy border');
}

const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : null;
if (url) {
  for (const route of ['/play/worlds', '/play/home', '/play/credits']) {
    try {
      const res = await fetch(url + route, { redirect: 'follow' });
      const html = await res.text();
      const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
      if (EMOJI.test(text)) hits.push(`${route} DOM text has an emoji`);
      if (/data:image\/svg\+xml[^"']*dicebear|3D icon|fluent/i.test(html)) hits.push(`${route} DOM has cartoon art`);
    } catch (e) {
      hits.push(`${route} unreachable: ${e.message}`);
    }
  }
}

if (hits.length) {
  console.error(`no-cartoon-check: ${hits.length} problem(s)\n` + hits.join('\n'));
  process.exit(1);
}
console.log('no-cartoon-check: ok');
