// Copy policy: no em dashes in product text, messages or components; no stock AI phrasing.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src', import.meta.url));
const banned = [/—/, /\bas an ai\b/i, /\bdelve\b/i, /\bcertainly!/i, /fast-paced world/i];
const errors = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (p.includes(join('i18n', 'generated')) || name === 'schema.d.ts') continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|json|mdx?)$/.test(name)) {
      readFileSync(p, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          for (const re of banned) if (re.test(line)) errors.push(`${p}:${i + 1} matches ${re}`);
        });
    }
  }
}
walk(root);
if (errors.length) {
  console.error('Copy check failed:\n' + errors.slice(0, 30).join('\n'));
  process.exit(1);
}
console.log('Copy check passed');
