// Every exported function, hook, class and component in the logic layers needs a one-line TSDoc comment, and every
// folder under src/ needs a README. One line per finding, exit 1 on any. Usage: node scripts/check-docs.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const SRC = resolve(import.meta.dirname, '../src');
const LAYERS = ['data', 'domain', 'platform', 'shared', 'config', 'i18n', 'features', 'game', 'ui'];
const NEEDS_DOC = ['data', 'domain', 'platform', 'shared', 'config', 'i18n', 'features', 'game', 'ui'];
const STRICT_DIRS = new Set(['data', 'domain', 'platform', 'shared', 'config', 'i18n']); // every export documented; elsewhere only components and hooks

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts') && !name.endsWith('.stories.tsx') && name !== 'index.ts') out.push(p);
  }
  return out;
}

let bad = 0;
const say = (m) => {
  console.log(`FAIL ${m}`);
  bad++;
};

for (const layer of LAYERS) {
  const dir = join(SRC, layer);
  if (!existsSync(join(dir, 'README.md'))) say(`src/${layer}: missing README.md`);
  if (!NEEDS_DOC.includes(layer)) continue;
  for (const file of walk(dir)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const m = /^export (?:default )?(?:async )?(function|class|const) ([A-Za-z0-9_]+)/.exec(line);
      if (!m) return;
      const name = m[2];
      const isUse = /^use[A-Z]/.test(name);
      const isComponent = /^[A-Z][A-Za-z0-9]+$/.test(name) && m[1] !== 'const';
      const isArrowComponent = m[1] === 'const' && /^[A-Z][a-z]/.test(name) && /=\s*(memo\(|\(|\{)/.test(line);
      if (!STRICT_DIRS.has(layer) && !isUse && !isComponent && !isArrowComponent) return;
      // walk upward over decorators and blank-free comment blocks
      let j = i - 1;
      while (j >= 0 && lines[j].trim() === '') j--;
      const prev = lines[j]?.trim() ?? '';
      const documented = prev.endsWith('*/') || prev.startsWith('//') || prev.startsWith('*');
      if (!documented) say(`${relative(SRC, file).split(sep).join('/')}:${i + 1} ${name} has no doc comment`);
    });
  }
}
console.log(bad ? `${bad} FAILED` : 'all doc checks pass');
process.exit(bad ? 1 : 0);
