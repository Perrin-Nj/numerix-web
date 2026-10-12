// Every reaction file exists, is under 60 KB, and is listed in the licence ledger.
import { readFileSync, statSync } from 'node:fs';
const NAMES = ['happy', 'sad', 'thinking', 'party', 'hug', 'thumbs-up', 'star-struck', 'pleading', 'sleepy', 'wave', 'clap', 'hearts'];
const ledger = readFileSync(new URL('../public/LICENSES.md', import.meta.url), 'utf8');
const errors = [];
for (const n of NAMES) {
  try {
    const kb = statSync(new URL(`../public/reactions/${n}.svg`, import.meta.url)).size / 1024;
    if (kb > 60) errors.push(`${n}.svg is ${kb.toFixed(1)} KB (max 60)`);
  } catch {
    errors.push(`${n}.svg missing`);
  }
  if (!ledger.includes(n)) errors.push(`${n} not in public/LICENSES.md`);
}
if (errors.length) {
  console.error('FAIL ' + errors.join('; '));
  process.exit(1);
}
console.log(`ok reactions: ${NAMES.length} files under 60 KB and in the ledger`);
