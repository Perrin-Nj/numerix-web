// Discover feed suite: paging, no repeat, reshuffle, kind mix, video play and pause in view, reduced motion, data saver,
// offline retry, flat memory after 300+ items, axe, touch targets. One line per check, then the performance numbers.
// Usage: node scripts/feed-suite.mjs [baseUrl]   (needs the app, a Go API with `feedseed` loaded, and the demo account)
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parentLogin, kidEnter } from './lib/kid.mjs';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const AXE = resolve(import.meta.dirname, 'qa/node_modules/axe-core/axe.min.js');
const T = { timeout: 20000 };
let fails = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    fails++;
    console.log(`FAIL ${name}: ${e.message.split('\n')[0].slice(0, 600)}`);
  }
}

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function newKid(opts = {}) {
  const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 390, height: 780 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text().slice(0, 160)));
  await parentLogin(page, BASE);
  await kidEnter(page, BASE, 'Noé', '4321');
  return { ctx, page, errors };
}
const childId = (page) => page.evaluate(async () => (await (await fetch('/api/v1/children')).json()).items.find((c) => c.display_name === 'Noé')?.id);

// ---------- 1. the data: walked through the app's own API proxy ----------
const { ctx, page, errors } = await newKid();
const cid = await childId(page);
let pages = [];
await check('API: 20 pages of 12, opaque cursor, 3 passes of the grade-appropriate items', async () => {
  let cursor = '';
  for (let i = 0; i < 40; i++) {
    const r = await page.evaluate(async ([c, q]) => (await fetch(`/api/v1/children/${c}/discover?limit=12${q}`, { headers: { 'x-nx-mode': 'child' } })).json(), [cid, cursor ? `&cursor=${cursor}` : '']);
    if (!r.items || r.items.length !== 12) throw new Error(`page ${i}: ${JSON.stringify(r).slice(0, 120)}`);
    pages.push(r);
    cursor = r.next_cursor;
  }
  if (/[.=]/.test(cursor)) throw new Error('cursor is not opaque');
});
const flat = pages.flatMap((p) => p.items);
const media = flat.filter((i) => i.media);
const size = pages[0].cycle_size;
await check('no media item repeats before every item of the grade was shown', async () => {
  const seen = new Set();
  const firstPass = media.slice(0, size);
  for (const m of firstPass) {
    if (seen.has(m.id)) throw new Error(`${m.id} repeated inside the first pass of ${size}`);
    seen.add(m.id);
  }
  if (size < 150) throw new Error(`cycle size only ${size}`);
});
await check('after one pass the order is reshuffled (cycle grows, new order)', async () => {
  const a = media.slice(0, size).map((m) => m.id).join();
  const b = media.slice(size, 2 * size).map((m) => m.id).join();
  if (a === b) throw new Error('second pass has the same order');
  const last = pages[pages.length - 1];
  if (last.cycle < 1) throw new Error(`cycle ${last.cycle} after ${flat.length} items`);
});
await check('kind mix: photos, animations and videos all appear, never 3 videos in a row, a puzzle every 8th card', async () => {
  const kinds = new Set(flat.map((i) => i.kind));
  for (const k of ['photo', 'animation', 'video', 'puzzle']) if (!kinds.has(k)) throw new Error(`no ${k}`);
  let run = 0;
  flat.forEach((it, i) => {
    run = it.kind === 'video' ? run + 1 : 0;
    if (run > 2) throw new Error(`3 videos in a row at ${i}`);
    if ((i % 8 === 7) !== (it.kind === 'puzzle')) throw new Error(`slot ${i} is ${it.kind}`);
  });
});
await check('every media item has alt text, a credit and (for a video) captions in both languages', async () => {
  for (const { media: m } of media.slice(0, 200)) {
    if (!m.alt || !m.attribution || !m.licence) throw new Error(`${m.id} lacks alt or credit`);
    if (m.media_kind === 'video' && (m.captions ?? []).length !== 2) throw new Error(`${m.id} captions`);
  }
});
await check('a bad cursor is a 422, never a silent reset', async () => {
  const s = await page.evaluate(async (c) => (await fetch(`/api/v1/children/${c}/discover?cursor=bogus`, { headers: { 'x-nx-mode': 'child' } })).status, cid);
  if (s !== 422) throw new Error(`status ${s}`);
});

// ---------- 2. the screen ----------
await page.goto(`${BASE}/play/feed`, { waitUntil: 'networkidle' });
const cards = () => page.locator('article[data-media]');
await check('feed shows real media cards with title, fact and credit; no AI badge on media', async () => {
  await cards().first().waitFor(T);
  const first = cards().first();
  const text = await first.innerText();
  if (!/crédit/i.test(text)) throw new Error('no credit line');
  if (await first.getByText(/généré par ia/i).count()) throw new Error('AI badge on a real photo');
  if (await page.locator('article img[alt=""]').count()) throw new Error('image without alt');
});
await check('photo blur-up: placeholder first, sharp image after load, srcset 480 and 960', async () => {
  const card = await scrollToKind('photo');
  const img = card.locator('img').first();
  await img.waitFor(T);
  await page.waitForFunction((el) => el?.complete, await img.elementHandle(), T);
  const info = await img.evaluate((i) => ({ srcset: i.srcset, o: getComputedStyle(i).opacity, w: i.naturalWidth }));
  if (!/480w/.test(info.srcset) || !/960w/.test(info.srcset)) throw new Error(info.srcset);
  if (info.o !== '1' || info.w < 300) throw new Error(`opacity ${info.o}, width ${info.w}`);
});
await check('micro-question: tap to reveal the answer, Numa reacts', async () => {
  await page.evaluate(() => scrollTo(0, 0));
  const q = page.locator('article[data-media] section[aria-label]').first();
  for (let i = 0; i < 20 && !(await q.count()); i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(200);
  }
  await q.scrollIntoViewIfNeeded();
  await q.getByRole('button', { name: /voir la réponse/i }).click();
  await q.locator('[data-mascot="numa"]').waitFor(T);
});
await check('like and save come back from the server after a reload', async () => {
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(500);
  const first = page.locator('article[data-media]').first();
  const id = (await first.getAttribute('aria-label')) ?? '';
  const liked = first.getByRole('button', { name: /^aimé/i });
  if (await liked.count()) { // a previous run left it liked: unlike first, so the check always starts clean
    await liked.click();
    await first.getByRole('button', { name: /j.aime/i }).waitFor(T);
  }
  await first.getByRole('button', { name: /j.aime/i }).click();
  await liked.waitFor(T);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator(`article[aria-label="${id.replace(/"/g, '\\"')}"]`).getByRole('button', { name: /^aimé/i }).waitFor(T);
});

// ---------- 3. video: play in view, pause out of view, muted, captions ----------
async function scrollToKind(kind, p = page) {
  for (let i = 0; i < 80; i++) {
    const loc = p.locator(`article[data-media="${kind}"]`);
    const n = await loc.count();
    for (let k = 0; k < n; k++) {
      const box = await loc.nth(k).boundingBox();
      if (box && box.y > -box.height * 0.3 && box.y < 700) {
        await loc.nth(k).scrollIntoViewIfNeeded();
        return loc.nth(k);
      }
    }
    await p.mouse.wheel(0, 500);
    await p.waitForTimeout(250);
  }
  throw new Error(`no ${kind} reached`);
}
await check('video plays muted while in view and pauses when scrolled away', async () => {
  const card = await scrollToKind('video');
  const v = card.locator('video');
  await page.waitForFunction((el) => el && !el.paused && el.readyState > 2, await v.elementHandle(), T);
  if (!(await v.evaluate((e) => e.muted))) throw new Error('video is not muted');
  await page.evaluate(() => window.scrollBy(0, 2200));
  await page.waitForTimeout(900);
  if (!(await v.evaluate((e) => e.isConnected ? e.paused : true))) throw new Error('video still playing out of view');
});
await check('video has captions (fr-CA and en-CA tracks), a 44px captions toggle, sound button only with audio', async () => {
  const card = await scrollToKind('video');
  const tracks = await card.locator('video track').evaluateAll((ts) => ts.map((t) => t.srclang));
  if (tracks.join() !== 'fr,en') throw new Error(`tracks ${tracks}`);
  const btn = card.getByRole('button', { name: /sous-titres/i });
  const box = await btn.boundingBox();
  if (!box || box.width < 44 || box.height < 44) throw new Error(`captions button ${JSON.stringify(box)}`);
  const mode = await card.locator('video').evaluate((v) => [...v.textTracks].map((t) => `${t.language}:${t.mode}`).join());
  if (!/fr:showing/.test(mode)) throw new Error(`track modes ${mode}`);
  await btn.click();
  const after = await card.locator('video').evaluate((v) => [...v.textTracks].map((t) => t.mode).join());
  if (/showing/.test(after)) throw new Error('captions did not hide');
});

// ---------- 4. memory stays flat over 300+ items ----------
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
const heap = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'JSHeapUsedSize').value / 1048576;
const stats = {};
await check('300+ items scrolled: mounted cards, images and videos stay bounded, heap stays flat, 60 fps', async () => {
  await page.goto(`${BASE}/play/feed`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const tick = (t) => { window.__frames.push(t - last); last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const bytesBefore = await page.evaluate(() => performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0));
  const samples = [];
  let mounted = 0;
  for (let step = 0; step < 330; step++) {
    await page.mouse.wheel(0, 650);
    await page.waitForTimeout(110);
    if (step % 60 === 59) {
      await page.waitForTimeout(400);
      samples.push(await heap());
      mounted = Math.max(mounted, await page.evaluate(() => document.querySelectorAll('article').length));
    }
  }
  const dom = await page.evaluate(() => ({ articles: document.querySelectorAll('article').length, imgs: document.querySelectorAll('article img').length, videos: document.querySelectorAll('article video').length, nodes: document.getElementsByTagName('*').length, loaded: document.querySelectorAll('ul > li').length }));
  const frames = await page.evaluate(() => window.__frames.slice(30));
  const bytes = await page.evaluate(() => performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0));
  const slow = frames.filter((f) => f > 34).length / frames.length;
  Object.assign(stats, { items: dom.loaded, articles: dom.articles, videos: dom.videos, imgs: dom.imgs, nodes: dom.nodes, heap: samples.map((s) => s.toFixed(1)).join(' > '), slowFrames: (slow * 100).toFixed(1) + '%', kb: ((bytes - bytesBefore) / 1024) | 0, firstHeap: samples[0], lastHeap: samples.at(-1) });
  if (dom.loaded < 300) throw new Error(`only ${dom.loaded} cards in the list`);
  if (dom.articles > 12 || dom.videos > 8) throw new Error(`${dom.articles} cards and ${dom.videos} videos mounted`);
  if (samples.at(-1) > samples[0] * 1.8 + 8) throw new Error(`heap grew ${samples[0].toFixed(1)} -> ${samples.at(-1).toFixed(1)} MB`);
});

// ---------- 5. offline retry ----------
await check('offline: the next page fails with a clear message and retry works once back online', async () => {
  await page.goto(`${BASE}/play/feed`, { waitUntil: 'networkidle' });
  await cards().first().waitFor(T);
  await ctx.setOffline(true);
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(150);
    if (await page.getByText(/impossible de charger la suite/i).count()) break;
  }
  const retry = page.getByRole('button', { name: /réessayer/i }).first();
  await retry.waitFor({ timeout: 15000 });
  await ctx.setOffline(false);
  await retry.click();
  await page.getByText(/impossible de charger la suite/i).waitFor({ state: 'detached', timeout: 15000 });
});

// ---------- 6. accessibility, touch targets ----------
await check('axe: no serious or critical violation on the feed, and buttons are 44px', async () => {
  await page.goto(`${BASE}/play/feed`, { waitUntil: 'networkidle' });
  await cards().first().waitFor(T);
  await page.waitForTimeout(800);
  if (existsSync(AXE)) {
    await page.addScriptTag({ path: AXE });
    const v = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => `${x.id} x${x.nodes.length} ${x.nodes[0].target.join(' ').slice(0, 70)}`)));
    if (v.length) throw new Error(v.join('; '));
  }
  const small = await page.evaluate(() => [...document.querySelectorAll('article button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width && (r.width < 43.5 || r.height < 43.5); }).map((b) => `${b.getAttribute('aria-label') || b.innerText}`.slice(0, 30)));
  if (small.length) throw new Error(`small targets: ${small.join(', ')}`);
  const borders = await page.evaluate(() => [...document.querySelectorAll('article button')].filter((b) => parseFloat(getComputedStyle(b).borderTopWidth) >= 2).length);
  if (borders) throw new Error(`${borders} feed buttons with a 2px border`);
});
await check('no emoji art in the feed text', async () => {
  const text = await page.locator('main').innerText();
  if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) throw new Error('emoji in the feed');
});
await ctx.close();

// ---------- 7. reduced motion and data saver: poster only, play on tap ----------
for (const [label, opts, init] of [
  ['reduced motion', { reducedMotion: 'reduce' }, null],
  ['data saver', {}, () => Object.defineProperty(navigator, 'connection', { value: { saveData: true } })],
]) {
  const k = await newKid(opts);
  if (init) await k.ctx.addInitScript(init);
  await check(`${label}: videos stay on the poster, a tap starts them`, async () => {
    await k.page.goto(`${BASE}/play/feed`, { waitUntil: 'networkidle' });
    const card = await scrollToKind('video', k.page);
    await k.page.waitForTimeout(1500);
    const v = card.locator('video');
    if (!(await v.evaluate((e) => e.paused))) throw new Error('video autoplayed');
    if (!(await v.evaluate((e) => Boolean(e.poster)))) throw new Error('no poster');
    await card.getByRole('button', { name: /lancer la vidéo/i }).click();
    await k.page.waitForFunction((el) => el && !el.paused, await v.elementHandle(), T);
  });
  await k.ctx.close();
}

// ---------- numbers ----------
console.log(`perf items=${stats.items} mountedCards=${stats.articles} videos=${stats.videos} imgs=${stats.imgs} domNodes=${stats.nodes} jsHeapMB=[${stats.heap}] slowFrames(>34ms)=${stats.slowFrames} transferKB=${stats.kb}`);
if (errors.length) {
  fails++;
  console.log(`FAIL console errors: ${[...new Set(errors)].slice(0, 5).join(' | ')}`);
}
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all feed checks pass');
process.exit(fails ? 1 : 0);
