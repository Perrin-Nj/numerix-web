// Sound policy: every sound in the event list exists as webm and mp3, is listed in LICENSES.md,
// and the whole folder stays under 1 MB.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../public/sounds', import.meta.url));
const names = ['tap', 'beat_success', 'beat_detour', 'beat_surprise', 'chapter_complete', 'card_earned', 'streak_up', 'notice_warning', 'notice_error', 'open', 'close', 'toggle', 'select', 'switch', 'scroll', 'pluck', 'drop', 'back', 'confirm', 'question', 'glass', 'tick', 'minimize', 'maximize'];
const license = readFileSync(join(dir, 'LICENSES.md'), 'utf8');
const files = readdirSync(dir);
const errors = [];
let total = 0;
for (const n of names) {
  for (const ext of ['webm', 'mp3']) {
    if (!files.includes(`${n}.${ext}`)) errors.push(`missing ${n}.${ext}`);
    else {
      const size = statSync(join(dir, `${n}.${ext}`)).size;
      total += size;
      if (size > 60 * 1024) errors.push(`${n}.${ext} is over 60 KB`);
    }
  }
  if (!license.includes(`| ${n} |`)) errors.push(`${n} not listed in LICENSES.md`);
}
if (total > 1024 * 1024) errors.push('sounds folder over 1 MB');
if (errors.length) {
  console.error('Sound check failed:\n' + errors.map((e) => '  ' + e).join('\n'));
  process.exit(1);
}
console.log(`Sound check passed (${(total / 1024).toFixed(0)} KB)`);
