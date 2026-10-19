// Storybook-only policy: every component folder in src/ui and src/game must have a story,
// and no component file may live outside a component folder.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const errors = [];
for (const layer of ['ui', 'game']) {
  const dir = join(root, layer);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'README.md') continue; // the layer's documentation, required by check-docs
    if (!statSync(p).isDirectory()) {
      errors.push(`${layer}/${name}: component files must live in a folder (src/${layer}/<name>/)`);
      continue;
    }
    const files = readdirSync(p);
    if (!files.some((f) => f.endsWith('.stories.tsx'))) errors.push(`${layer}/${name}: missing *.stories.tsx`);
    if (!files.includes('index.ts')) errors.push(`${layer}/${name}: missing index.ts`);
  }
}
if (errors.length) {
  console.error('Storybook-only check failed:\n' + errors.map((e) => '  ' + e).join('\n'));
  process.exit(1);
}
console.log('Storybook-only check passed');
