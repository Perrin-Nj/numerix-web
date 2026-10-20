// Contact sheet of the sprite assets that questions use (role "object") to judge flat art. Output out/sprites.png
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const SEED = resolve(process.env.API_DIR ?? resolve(import.meta.dirname, '../../../numerix-api'), 'seed');
const sp = JSON.parse(readFileSync(`${SEED}/assets/sprites.json`, 'utf8'));
const used = new Set(), ph = new Set();
for (const w of JSON.parse(readFileSync(`${SEED}/assets/credits.json`, 'utf8')).photos) ph.add(w.id);
for (const f of ['animaux','arts','construction','cuisine','dinosaures','echecs','espace','hiver','jeux','marche','medecine','meteo','musique','nature','ocean','pirates','robots','science','sport','transport'])
  for (const q of JSON.parse(readFileSync(`${SEED}/questions/${f}.json`, 'utf8')).questions) for (const m of q.media ?? []) used.add(m.role + ':' + m.asset);
const objs = [...used].filter((u) => u.startsWith('object:')).map((u) => u.slice(7));
console.log(`object-role assets used: ${objs.length}; photo-role/scene used: ${[...used].filter((u) => u.startsWith('scene:')).length}; sprites.json ${sp.length}`);
const imgs = objs.slice(0, 48).map((id) => { const f = ['256', '480'].map((s) => `${SEED}/assets/files/${id}-${s}.webp`).find(existsSync); return f ? `<img src="file:///${f.replaceAll(String.fromCharCode(92), '/')}" style="width:150px;height:150px;object-fit:contain;background:#fff;margin:3px">` : ''; });
writeFileSync('out/sprites.html', `<body style="margin:0;background:#888">${imgs.join('')}</body>`);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1250, height: 700 } });
await p.goto('file:///' + resolve('out/sprites.html').replaceAll(String.fromCharCode(92), '/')); await p.waitForTimeout(500);
await p.screenshot({ path: 'out/sprites.png', fullPage: true }); await b.close();
