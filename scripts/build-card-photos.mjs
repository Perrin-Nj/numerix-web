// Collectible-card photo pool from the API's approved seed assets (tools/assets pipeline: licence-checked, credited).
// Usage: node scripts/build-card-photos.mjs <path to numerix-api seed/assets>
// Copies each approved photo's 480 px WebP to public/cards/<id>.webp, writes src/game/story-card/card-photos.json (matching words) and public/cards/credits.json.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const seed = path.resolve(process.argv[2] ?? '../numerix-api/seed/assets');
const out = path.join(ROOT, 'public/cards');
fs.mkdirSync(out, { recursive: true });
const words = (s) => [...new Set(String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4))];
const pool = [];
const credits = [];
for (const f of fs.readdirSync(seed).sort()) {
  if (!f.endsWith('.json') || /^(credits|objects|picks|rejected)/.test(f)) continue;
  for (const a of JSON.parse(fs.readFileSync(path.join(seed, f), 'utf8'))) {
    if (a.kind !== 'photo' || a.review_status !== 'approved') continue;
    const v = a.variants.find((x) => x.w === 480);
    if (!v) continue;
    fs.copyFileSync(path.join(seed, 'files', v.file), path.join(out, `${a.id}.webp`));
    pool.push({ id: a.id, world: a.world_id, fr: a.alt_fr, en: a.alt_en, w: words(`${a.tags.map((t) => t.value).join(' ')} ${a.alt_fr} ${a.alt_en}`) });
    credits.push({ id: a.id, world: a.world_id, creator: a.creator, licence: a.licence, source_url: a.source_url, attribution: a.attribution_text });
  }
}
fs.writeFileSync(path.join(ROOT, 'src/game/story-card/card-photos.json'), JSON.stringify(pool));
fs.writeFileSync(path.join(out, 'credits.json'), JSON.stringify(credits, null, 1) + '\n');
console.log(`${pool.length} photos, ${new Set(pool.map((p) => p.world)).size} worlds`);
