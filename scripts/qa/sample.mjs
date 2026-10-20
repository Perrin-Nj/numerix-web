// Prints a seeded random sample of N questions (default 60) in full, fr only, for hand re-solving. Usage: node scripts/qa/sample.mjs [n] [seed]
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const SEED = resolve(process.env.API_DIR ?? resolve(import.meta.dirname, '../../../numerix-api'), 'seed');
const qs = [];
for (const f of readdirSync(`${SEED}/questions`).filter((f) => f.endsWith('.json') && !/^(_examples|picks|rejected|sprites|credits)/.test(f))) for (const q of JSON.parse(readFileSync(`${SEED}/questions/${f}`, 'utf8')).questions ?? []) qs.push(q);
let s = Number(process.argv[3] ?? 20261020); const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const loc = (v) => (v && typeof v === 'object' && 'fr' in v ? v.fr : v);
const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) && 'fr' in v ? v.fr : v)));
for (const q of [...qs].sort(() => rnd() - 0.5).slice(0, Number(process.argv[2] ?? 60))) {
  const { id, type, grade, story, prompt, math_text, visual, choices, options, items, pairs, answer, common_errors, hint, explain } = q;
  console.log(JSON.stringify(strip({ id, type, grade, story, prompt, math_text, visual, choices, options, items, pairs, answer, common_errors: (common_errors ?? []).map((c) => c.value ?? c), hint, explain })));
}
