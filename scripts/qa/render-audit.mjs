// Render audit: draws every bank question of the three worlds like the play screen and saves screenshots + index.json + contact sheets.
// Needs the dev route (web started with QA_RENDER_AUDIT=1) and an API serving /assets. See specs/001-three-worlds-premium/review/render-audit-harness.md
// Usage: node scripts/qa/render-audit.mjs [--base http://localhost:3400] [--out C:/nx/audit] [--only <id-or-prefix>] [--conc 4] [--no-sheets]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://localhost:3400').replace(/\/$/, '');
const OUT = arg('out', './qa-audit');
const ONLY = arg('only', '');
const CONC = Number(arg('conc', '4'));
const VPS = [['phone', 390, 844], ['desktop', 1280, 800]].filter(([n]) => !arg('vp', '') || n === arg('vp', ''));
const PHASES = [['q', 'question', 1200], ['r', 'reveal', 4500]];

const list = (await (await fetch(`${BASE}/dev/questions`)).json()).filter((q) => !ONLY || q.id.startsWith(ONLY));
if (!list.length) throw new Error('no question matched (is the web running with QA_RENDER_AUDIT=1?)');
for (const w of new Set(list.map((q) => q.world))) mkdirSync(`${OUT}/${w}`, { recursive: true });

const browser = await chromium.launch();
const ctxs = {};
for (const [vp, w, h] of VPS) ctxs[vp] = await browser.newContext({ locale: 'fr-CA', viewport: { width: w, height: h }, isMobile: vp === 'phone', hasTouch: vp === 'phone' });

// What the stage really holds once drawn: text in SVG, images, labels
const probe = () => {
  const st = document.querySelector('[data-qa=stage]');
  if (!st) return null;
  const imgs = [...st.querySelectorAll('img')].map((i) => ({ src: i.currentSrc || i.src, w: i.naturalWidth, ok: i.complete && i.naturalWidth > 0, alt: i.alt }));
  const texts = [...st.querySelectorAll('svg text')].map((t) => t.textContent.trim()).filter(Boolean);
  const labels = [...st.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).filter(Boolean);
  const innerText = st.innerText.replace(/\s+/g, ' ').trim();
  return { imgs, texts, labels, innerText, svgs: st.querySelectorAll('svg').length, kind: document.querySelector('main')?.dataset.qaKind ?? null, drawn: Boolean(st.querySelector('[data-scene]')) };
};

async function shoot(q, vp, [tag, phase, wait]) {
  const page = await ctxs[vp].newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
  const file = `${OUT}/${q.world}/${q.id}-${vp}-${tag}.jpg`;
  try {
    const res = await page.goto(`${BASE}/dev/question/${encodeURIComponent(q.id)}?phase=${phase}`, { waitUntil: 'networkidle', timeout: 30000 });
    if (!res || res.status() !== 200) throw new Error(`http ${res?.status()}`);
    await page.waitForSelector('[data-qa=stage]', { timeout: 10000 });
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(wait);
    await page.screenshot({ path: file, type: 'jpeg', quality: 72 });
    if (q.id === 'espace.horloge.106' && vp === 'phone' && tag === 'q') await page.screenshot({ path: `${OUT}/owner-example.png` });
    return { file, probe: await page.evaluate(probe), errs };
  } catch (e) {
    return { file: null, error: String(e.message).slice(0, 200), errs };
  } finally { await page.close(); }
}

const entries = [];
let next = 0, done = 0;
async function worker() {
  while (next < list.length) {
    const q = list[next++];
    try {
      const d = await (await fetch(`${BASE}/dev/question/${encodeURIComponent(q.id)}/data`)).json();
      const shots = {}, fails = [];
      for (const [vp] of VPS) for (const ph of PHASES) {
        const r = await shoot(q, vp, ph);
        shots[`${vp}-${ph[0]}`] = r;
        if (r.error) fails.push(`${vp}-${ph[0]}: ${r.error}`);
        if (r.errs?.length) fails.push(`${vp}-${ph[0]}: page error ${r.errs[0]}`);
        if (r.probe?.kind === 'scene' && !r.probe.drawn) fails.push(`${vp}-${ph[0]}: scene stage fell back to the photo`);
        if (r.probe?.imgs.some((i) => !i.ok)) fails.push(`${vp}-${ph[0]}: broken image in stage`);
      }
      const pq = shots['phone-q'].probe, pr = shots['phone-r'].probe;
      const nums = (p) => [...new Set([...(p?.texts ?? []), ...(p?.labels ?? [])].join(' ').match(/\d+([.,]\d+)?/g) ?? [])];
      const scene = d.question.media?.find((m) => m.role === 'scene')?.image;
      entries.push({
        id: q.id, world: q.world, grade: q.grade, skill: d.skill,
        story: d.question.story, prompt: d.question.prompt, math_text: d.question.math_text,
        question_kind: d.question.kind, choices: d.question.choices, items: d.question.items ?? null,
        visual: d.question.visual ?? null,
        media_criteria: d.debug.criteria, media_resolved: d.debug.resolved, hero_fallback: d.debug.resolved.some((r) => r.via === 'world hero'),
        scene_image: scene?.id ?? null, scene_image_alt: scene?.alt ?? null,
        stage_kind: d.stage, counting_picture_used: d.stage.question === 'counting',
        stage_in_screen: { question: pq?.kind ?? null, reveal: pr?.kind ?? null },
        numbers_in_picture: { question: nums(pq), reveal: nums(pr) },
        stage_text: { question: pq?.innerText ?? '', reveal: pr?.innerText ?? '' },
        stage_images: pq?.imgs ?? [],
        screenshots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, v.file])),
        failed: fails.length > 0, failures: fails,
      });
    } catch (e) {
      entries.push({ id: q.id, world: q.world, grade: q.grade, failed: true, failures: [String(e.message).slice(0, 200)], screenshots: {} });
    }
    if (++done % 10 === 0) console.log(`${done}/${list.length}`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
entries.sort((a, b) => (a.world + a.id).localeCompare(b.world + b.id));

const worlds = {};
for (const e of entries) {
  const w = (worlds[e.world] ??= { total: 0, failed: 0, no_scene_image: 0, hero_fallback: 0, counting: 0 });
  w.total++;
  if (e.failed) w.failed++;
  if (!e.scene_image) w.no_scene_image++;
  if (e.media_resolved?.some((r) => r.via === 'world hero')) w.hero_fallback++;
  if (e.counting_picture_used) w.counting++;
}
const summary = { generated: new Date().toISOString(), base: BASE, total: entries.length, failed: entries.filter((e) => e.failed).length, worlds };
writeFileSync(`${OUT}/${ONLY ? 'index.partial.json' : 'index.json'}`, JSON.stringify({ summary, questions: entries }, null, 1));

// Contact sheets: 12 phone question screens per sheet (6 x 2), id and stage kind under each
if (!process.argv.includes('--no-sheets') && !ONLY) {
  mkdirSync(`${OUT}/sheets`, { recursive: true });
  const sp = await browser.newPage({ viewport: { width: 2000, height: 1500 } });
  for (const w of Object.keys(worlds)) {
    const ws = entries.filter((e) => e.world === w && e.screenshots['phone-q']);
    for (let i = 0; i * 12 < ws.length; i++) {
      const cells = ws.slice(i * 12, i * 12 + 12).map((e) => `<figure><img src="${pathToFileURL(e.screenshots['phone-q'])}"><figcaption>${e.id}<br><small>${e.stage_kind.question}${e.scene_image ? '' : ' / no image'}</small></figcaption></figure>`).join('');
      const html = `${OUT}/sheets/_tmp.html`;
      writeFileSync(html, `<meta charset=utf-8><style>body{margin:8px;background:#222;color:#fff;font:15px sans-serif}.g{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}figure{margin:0;text-align:center}img{width:100%;border:1px solid #666}figcaption{padding:3px}</style><div class=g>${cells}</div>`);
      await sp.goto(pathToFileURL(html).href);
      await sp.waitForFunction(() => [...document.images].every((m) => m.complete));
      await sp.screenshot({ path: `${OUT}/sheets/${w}-${i + 1}.jpg`, fullPage: true, type: 'jpeg', quality: 80 });
    }
  }
  rmSync(`${OUT}/sheets/_tmp.html`, { force: true });
}
await browser.close();
console.log(JSON.stringify(summary, null, 1));
for (const e of entries.filter((x) => x.failed)) console.log('FAILED', e.id, e.failures.join(' | '));
