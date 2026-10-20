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
const skipFile = (f) => /\.(stories|test|spec)\.[tj]sx?$/.test(f) || /[\\/](generated|__snapshots__)[\\/]/.test(f) || /schema\.d\.ts$/.test(f);

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
