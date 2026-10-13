// Prints variant count per sound and fails on too few variants or a repeated consecutive pick.
import { readFileSync } from 'node:fs';
import { pickVariant } from '../src/lib/audio/pick.ts';

const src = readFileSync(new URL('../src/lib/audio/sound-map.ts', import.meta.url), 'utf8');
const block = src.slice(src.indexOf('SOUND_FILES'), src.indexOf('SOUND_VOLUME'));
const files = Object.fromEntries([...block.matchAll(/^\s+(\w+): \[([^\]]*)\]/gm)].map((m) => [m[1], m[2].match(/'[^']+'/g) ?? []]));
const min = { beat_success: 3, beat_detour: 3, beat_surprise: 4 };
const errors = [];
for (const [name, list] of Object.entries(files)) {
  console.log(`${name}: ${list.length}`);
  if (list.length < (min[name] ?? 1)) errors.push(`${name} needs >= ${min[name] ?? 1} variants`);
  let last;
  for (let k = 0; k < 500; k++) {
    const i = pickVariant(list, last);
    if (i < 0 || i >= list.length) errors.push(`${name} pick out of range`);
    if (list.length > 1 && i === last) { errors.push(`${name} repeated variant ${i}`); break; }
    last = i;
  }
}
if (!Object.keys(files).length) errors.push('no sounds parsed');
if (errors.length) {
  console.error('Variant check failed:\n' + errors.map((e) => '  ' + e).join('\n'));
  process.exit(1);
}
