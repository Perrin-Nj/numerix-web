// Turns a recorder export (admin /voice, schema 1) into public/voice files and manifest entries.
//   node scripts/import-voice-export.mjs voice-export-2026-10-20.json
// Writes public/voice/<lang>/<line_id>.wav, updates public/voice/manifest.json (key "<id>@fr|en" and "t:<text>@fr|en")
// and appends the talent consent record to public/voice/credits.json. Refuses any clip without consent.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const file = process.argv[2];
if (!file) throw new Error('usage: node scripts/import-voice-export.mjs <export.json>');
const exp = JSON.parse(readFileSync(file, 'utf8'));
if (exp.schema !== 1) throw new Error('unknown export schema');
const dir = new URL('../public/voice/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const read = (n, d) => (existsSync(join(dir, n)) ? JSON.parse(readFileSync(join(dir, n), 'utf8')) : d);
const manifest = read('manifest.json', { schema: 1, base: '/voice/', lines: {} });
const credits = read('credits.json', { schema: 1, clips: [] });

for (const c of exp.clips) {
  if (!c.consent?.consented || !c.consent.release_text || !c.consent.talent_name) throw new Error(`${c.line_id}: no talent consent`);
  if (!['fr-CA', 'en-CA'].includes(c.lang)) throw new Error(`${c.line_id}: lang must be fr-CA or en-CA`);
  const p = c.lang.slice(0, 2);
  const rel = `${p}/${c.line_id}.wav`;
  mkdirSync(join(dir, p), { recursive: true });
  writeFileSync(join(dir, rel), Buffer.from(c.audio.base64, 'base64'));
  const entry = { file: rel, locale: c.lang };
  manifest.lines[`${c.line_id}@${p}`] = entry;
  manifest.lines[`t:${c.text.trim()}@${p}`] = entry; // lets screens find the clip from the caption text
  credits.clips = credits.clips.filter((x) => !(x.line_id === c.line_id && x.lang === c.lang));
  credits.clips.push({ line_id: c.line_id, lang: c.lang, speaker: c.speaker, consent: c.consent, licence: 'owned-release', recorded_at: exp.exported_at });
}
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
writeFileSync(join(dir, 'credits.json'), JSON.stringify(credits, null, 1) + '\n');
console.log(`imported ${exp.clips.length} clips`);
