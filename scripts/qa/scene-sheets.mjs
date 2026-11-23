#!/usr/bin/env node
// Contact sheets for scene review: 8 questions per sheet (2 columns x 4 rows), each tile = question frame | right-answer reveal frame,
// caption = id, then story and prompt in small type. Reads the render-audit output (phone frames) and scene-meta.json from scene-gate.
//   node scripts/qa/scene-sheets.mjs [--frames C:/nx/scene-qa/frames] [--qa C:/nx/scene-qa]
// Writes <qa>/sheets/<world>-NN.jpg (JPEG q70, 1000 px wide) and <qa>/index.json.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const FR = arg('frames', 'C:/nx/scene-qa/frames');
const QA = arg('qa', 'C:/nx/scene-qa');
const audit = JSON.parse(fs.readFileSync(`${FR}/index.json`, 'utf8')).questions;
const meta = JSON.parse(fs.readFileSync(`${QA}/scene-meta.json`, 'utf8'));
const seed = {};
for (const w of ['echecs', 'medecine', 'espace']) for (const q of JSON.parse(fs.readFileSync(`C:/nx/ct-${w}/seed/questions/${w}.json`, 'utf8')).questions) seed[q.id] = q;
const txt = (l) => l?.fr ?? l;
// the answer as a reviewer reads it: order = the card texts in answer order, match = "left -> right" texts, truefalse = Vrai/Faux
const answerOf = (q) => {
  const a = q?.answer;
  if (!a) return null;
  if (a.kind === 'order' && Array.isArray(q.items)) return a.sequence.map((id) => txt(q.items.find((i) => i.id === id)?.text)).join(a.by === 'desc' ? ' > ' : ' < ');
  if (a.kind === 'match' && q.items?.left) return a.pairs.map(([l, r]) => `${txt(q.items.left.find((i) => i.id === l)?.text)} -> ${txt(q.items.right.find((i) => i.id === r)?.text)}`).join(' ; ');
  if (a.kind === 'truefalse') return a.value ? 'Vrai' : 'Faux';
  if (a.value !== undefined) return a.value;
  // estimate: the number the text states = the exact value rounded to one significant figure (same rule as answerShown in src/features/play/sceneStageFor.tsx)
  if (a.kind === 'range' && a.exact_for_check) { const p = 10 ** Math.floor(Math.log10(a.exact_for_check)); return `≈ ${Math.round(a.exact_for_check / p) * p}`; }
  if (a.kind === 'choice') return q.choices?.find((c) => c.id === a.correct)?.text?.fr ?? a.correct;
  return a.sequence ?? a.pairs ?? null;
};
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

fs.mkdirSync(`${QA}/sheets`, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
const index = [];
for (const w of ['echecs', 'medecine', 'espace']) {
  const ws = audit.filter((e) => e.world === w).sort((a, b) => a.id.localeCompare(b.id));
  for (let s = 0; s * 8 < ws.length; s++) {
    const name = `${w}-${String(s + 1).padStart(2, '0')}.jpg`;
    const chunk = ws.slice(s * 8, s * 8 + 8);
    const cells = chunk.map((e, t) => {
      const img = (k) => (e.screenshots?.[k] ? `<img src="${pathToFileURL(e.screenshots[k])}">` : '<div class=miss>no frame</div>');
      const m = meta[e.id] ?? {};
      index.push({ id: e.id, world: w, grade: e.grade, story: e.story, prompt: e.prompt, answer: answerOf(seed[e.id]), scene_archetype: m.archetype ?? null, required_objects: m.requires ?? [], bound_numbers: m.bound ?? {}, sheet: name, tile: t, failed: !!e.failed });
      return `<figure><div class=p>${img('phone-q')}${img('phone-r')}</div><figcaption><b>${esc(e.id)}</b><br>${esc(e.story)}<br><i>${esc(e.prompt)}</i><br><u>cle: ${esc(answerOf(seed[e.id]))}</u></figcaption></figure>`;
    }).join('');
    fs.writeFileSync(`${QA}/sheets/_tmp.html`, `<meta charset=utf-8><style>body{margin:0;background:#222;color:#eee;font:11px/1.25 sans-serif;width:1000px}.g{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px}figure{margin:0}.p{display:flex;gap:2px}img{width:50%;display:block}.miss{width:50%;background:#600;padding:8px}figcaption{padding:3px 2px;font-size:10px}b{font-size:12px;color:#8cf}</style><div class=g>${cells}</div>`);
    await page.goto(pathToFileURL(`${QA}/sheets/_tmp.html`).href);
    await page.waitForFunction(() => [...document.images].every((m) => m.complete));
    await page.screenshot({ path: `${QA}/sheets/${name}`, fullPage: true, type: 'jpeg', quality: 70 });
  }
}
fs.rmSync(`${QA}/sheets/_tmp.html`, { force: true });
await browser.close();
fs.writeFileSync(`${QA}/index.json`, JSON.stringify(index, null, 1));
console.log(`sheets: ${new Set(index.map((i) => i.sheet)).size}, questions: ${index.length}`);
