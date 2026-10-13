// Merges every src/**/messages.<locale>.json into src/i18n/generated/<locale>.json.
// Components own their copy next to the component; this keeps parallel work conflict free.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const locales = ['fr-CA', 'en-CA'];
const out = join(root, 'i18n', 'generated');
mkdirSync(out, { recursive: true });

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (p.includes(join('i18n', 'generated'))) continue;
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function merge(a, b, path = '') {
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      a[k] = merge(a[k] && typeof a[k] === 'object' ? a[k] : {}, v, `${path}${k}.`);
    } else {
      if (k in a) throw new Error(`Duplicate message key: ${path}${k}`);
      a[k] = v;
    }
  }
  return a;
}

const files = walk(root);
const missing = [];
for (const locale of locales) {
  const merged = {};
  for (const f of files.filter((f) => f.endsWith(`messages.${locale}.json`))) {
    merge(merged, JSON.parse(readFileSync(f, 'utf8')));
  }
  writeFileSync(join(out, `${locale}.json`), JSON.stringify(merged, null, 2) + '\n');
}
// Every messages file must exist for both locales
for (const f of files.filter((f) => /messages\.[a-zA-Z-]+\.json$/.test(f))) {
  const base = f.replace(/messages\.[a-zA-Z-]+\.json$/, '');
  for (const l of locales) if (!files.includes(`${base}messages.${l}.json`)) missing.push(`${base}messages.${l}.json`);
}
if (missing.length) {
  console.error('Missing locale files:\n' + [...new Set(missing)].join('\n'));
  process.exit(1);
}
console.log(`messages built for ${locales.join(', ')}`);
