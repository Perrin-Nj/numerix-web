// Surface textures for the consequence scenes (wood, stone, glass, water, cloth) from Wikimedia Commons.
// Only CC0, public domain and CC BY 2.0 to 4.0 are accepted (licence read from extmetadata; SA, NC, ND, GFDL are rejected).
//   node scripts/fetch-textures.mjs candidates <outDir>        download 5 candidates per kind and print their credits
//   node scripts/fetch-textures.mjs pick <outDir> wood=2 stone=0 ...   crop the chosen candidates to 384 px WebP in public/textures and write textures.json
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(resolve(import.meta.dirname, '../node_modules/.pnpm/sharp@0.35.5_@types+node@20.19.43/node_modules/sharp'));
const API = 'https://commons.wikimedia.org/w/api.php';
const QUERIES = {
  wood: 'wooden planks texture',
  stone: 'grey stone surface texture',
  glass: 'frosted glass texture',
  water: 'water surface ripples',
  cloth: 'linen fabric texture',
};
const OK = /^(CC0|Public domain|PD|CC BY (2\.0|2\.5|3\.0|4\.0)$)/i;
const [mode, outDir = 'textures-candidates', ...rest] = process.argv.slice(2);
const strip = (h) => String(h ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const get = async (u) => (await fetch(u, { headers: { 'User-Agent': 'NumerixTextures/1.0 (contact: wandjiperrin@gmail.com)' } })).json();

if (mode === 'candidates') {
  mkdirSync(outDir, { recursive: true });
  const meta = {};
  for (const [kind, q] of Object.entries(QUERIES)) {
    const s = await get(`${API}?action=query&generator=search&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=640&format=json`);
    const pages = Object.values(s.query?.pages ?? {}).sort((a, b) => a.index - b.index);
    meta[kind] = [];
    for (const p of pages) {
      const ii = p.imageinfo?.[0];
      const lic = ii?.extmetadata?.LicenseShortName?.value ?? '';
      if (!ii || !OK.test(lic) || ii.width < 800 || ii.height < 800 || /\.(svg|gif|tif)/i.test(p.title)) continue;
      const i = meta[kind].length;
      const buf = Buffer.from(await (await fetch(ii.thumburl, { headers: { 'User-Agent': 'NumerixTextures/1.0' } })).arrayBuffer());
      writeFileSync(join(outDir, `${kind}-${i}.jpg`), buf);
      meta[kind].push({ title: p.title, url: ii.descriptionurl, licence: lic, author: strip(ii.extmetadata?.Artist?.value), source: ii.descriptionurl });
      if (meta[kind].length >= 5) break;
    }
    console.log(kind, meta[kind].map((m, i) => `${i}: ${m.title} [${m.licence}]`).join('\n     '));
  }
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 1));
} else if (mode === 'pick') {
  const meta = JSON.parse(readFileSync(join(outDir, 'meta.json'), 'utf8'));
  const pubDir = resolve(import.meta.dirname, '../public/textures');
  mkdirSync(pubDir, { recursive: true });
  const ledger = {};
  for (const arg of rest) {
    const [kind, i] = arg.split('=');
    await sharp(join(outDir, `${kind}-${i}.jpg`)).resize(384, 384, { fit: 'cover', position: 'centre' }).webp({ quality: 68 }).toFile(join(pubDir, `${kind}.webp`));
    ledger[kind] = meta[kind][+i];
  }
  writeFileSync(join(pubDir, 'textures.json'), JSON.stringify(ledger, null, 1));
  console.log('written', Object.keys(ledger).join(', '));
}
