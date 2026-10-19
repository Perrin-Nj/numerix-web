// Groups out/sweep.json issues by kind+detail across routes/viewports. Usage: node scripts/qa/analyze.mjs
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const rs = JSON.parse(readFileSync(resolve(import.meta.dirname, 'out/sweep.json'), 'utf8'));
const g = new Map();
for (const r of rs) for (const [k, sev, d] of r.issues) {
  const key = `${sev} ${k} | ${d.replace(/\d+(\.\d+)?(ms|px|K)?/g, 'N').slice(0, 70)}`;
  const e = g.get(key) ?? { n: 0, routes: new Set(), ex: d, shot: r.shot };
  e.n++; e.routes.add(r.name); g.set(key, e);
}
for (const [k, e] of [...g].sort()) console.log(`${k}  x${e.n} routes=${[...e.routes].slice(0, 6).join(',')}${e.routes.size > 6 ? '+' + (e.routes.size - 6) : ''}\n      e.g. ${e.ex.slice(0, 110)}  ${e.shot}`);
const big = rs.filter((r) => r.js > 600000).map((r) => `${r.vp}/${r.name}:${(r.js / 1024) | 0}K`);
console.log('js over budget:', big.length, big.slice(0, 8).join(' '));
