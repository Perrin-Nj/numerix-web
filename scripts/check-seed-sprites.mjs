// Fails when a seed question points to a picture that does not exist: a visual `icon`, an "img:name" grid label, a pin icon.
// A name is fine when public/objects/<name>-256.webp exists or when it is drawn inline (src/game/question-visual/drawnNames.ts).
// Seeds: SEED_QUESTIONS (comma list of files) or every ../numerix-api/seed/questions/*.json. No seeds around = skipped with a notice.
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const files = process.env.SEED_QUESTIONS
  ? process.env.SEED_QUESTIONS.split(',')
  : existsSync(new URL('../numerix-api/seed/questions/', root))
    ? readdirSync(new URL('../numerix-api/seed/questions/', root)).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => new URL(`../numerix-api/seed/questions/${f}`, root).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
    : [];
if (!files.length) {
  console.log('skip check:sprites (no seed question files; set SEED_QUESTIONS)');
  process.exit(0);
}
const drawn = new Set([...readFileSync(new URL('src/game/question-visual/drawnNames.ts', root), 'utf8').matchAll(/'([a-z-]+)'/g)].map((m) => m[1]));
const have = new Set([...readdirSync(new URL('public/objects/', root)).map((f) => f.replace(/-256\.webp$/, '')), ...drawn]);
const missing = new Map();
const add = (name, id) => {
  if (!have.has(name)) missing.set(name, [...(missing.get(name) ?? []), id]);
};
const walk = (o, id) => {
  if (Array.isArray(o)) return o.forEach((x) => walk(x, id));
  if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) {
      if (k === 'icon' && typeof v === 'string') add(v, id);
      else if (typeof v === 'string' && v.startsWith('img:')) add(v.slice(4), id);
      else walk(v, id);
    }
};
for (const f of files) for (const q of JSON.parse(readFileSync(f, 'utf8')).questions ?? []) walk(q.visual, q.id);
if (missing.size) {
  for (const [n, ids] of missing) console.log(`FAIL sprite "${n}" has no file and no drawing (${ids.length}): ${ids.slice(0, 5).join(', ')}`);
  process.exit(1);
}
console.log(`ok   every sprite named by ${files.length} seed file(s) exists`);
