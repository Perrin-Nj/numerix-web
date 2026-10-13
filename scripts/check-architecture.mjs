// Enforces the layer arrows of docs/ARCHITECTURE.md by reading every import under src/.
// One line per finding, exit 1 when a layer imports something it must not. Usage: node scripts/check-architecture.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const SRC = resolve(import.meta.dirname, '../src');

/** layer -> layers it may import. A layer may always import itself. */
const ALLOWED = {
  app: ['features', 'game', 'ui', 'data', 'domain', 'platform', 'shared', 'config', 'i18n'],
  features: ['game', 'ui', 'data', 'domain', 'platform', 'shared', 'config', 'i18n'],
  game: ['ui', 'domain', 'platform', 'shared', 'config', 'i18n'],
  ui: ['platform', 'shared', 'config', 'i18n'],
  data: ['domain', 'platform', 'shared', 'config'],
  domain: ['shared'],
  platform: ['domain', 'shared', 'config'],
  shared: [],
  config: ['shared'],
  i18n: ['config', 'shared'],
};

/** Narrow, documented exceptions: `importer layer -> exact module prefix` (types only, no runtime coupling). */
const EXCEPTIONS = [
  { from: 'game', to: 'data/api/types', why: 'domain widgets are typed with the API entities' },
  { from: 'game', to: 'data/api/platform-types', why: 'subscription badge status type' },
  { from: 'game', to: 'data/api/client', why: 'error screen classifies ApiError (read only)' },
  { from: 'platform', to: 'data/api/types', why: 'speech and notify are typed with API entities' },
  { from: 'platform', to: 'data/api/platform-types', why: 'reminders are typed with the subscription entity' },
];

// Pure layers must stay free of the framework and the browser
const FORBIDDEN_IN_DOMAIN = [/^react($|\/)/, /^next($|\/)/, /^zustand/, /^@tanstack/];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const layerOf = (abs) => relative(SRC, abs).split(sep)[0];
const srcRel = (abs) => relative(SRC, abs).split(sep).join('/').replace(/\.(ts|tsx)$/, '');

let bad = 0;
const say = (msg) => {
  console.log(`FAIL ${msg}`);
  bad++;
};
let files = 0;
for (const file of walk(SRC)) {
  if (file.endsWith('.stories.tsx')) continue; // stories may compose any layer
  files++;
  const from = layerOf(file);
  if (!(from in ALLOWED)) {
    // top-level files such as proxy.ts and the middleware config belong to the app layer
    if (relative(SRC, file).includes(sep)) say(`${srcRel(file)}: unknown layer "${from}"`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    let target = null;
    if (spec.startsWith('@/')) target = spec.slice(2);
    else if (spec.startsWith('.')) target = srcRel(resolve(dirname(file), spec));
    else if (from === 'domain' && FORBIDDEN_IN_DOMAIN.some((re) => re.test(spec))) {
      say(`${srcRel(file)}: domain must stay framework free but imports "${spec}"`);
      continue;
    } else continue;
    const to = target.split('/')[0];
    if (!(to in ALLOWED) || to === from) continue;
    if (ALLOWED[from].includes(to)) continue;
    if (EXCEPTIONS.some((e) => e.from === from && target.startsWith(e.to))) continue;
    say(`${srcRel(file)} (${from}) must not import ${target} (${to})`);
  }
}
console.log(bad ? `${bad} FAILED` : `all architecture checks pass (${files} files)`);
process.exit(bad ? 1 : 0);
