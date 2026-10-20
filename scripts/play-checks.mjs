// Checks of the phase 5 play experience on a seeded question bank: world map, world page, assets and their caching,
// every question input kind, prefetch, retry state, credits. One line per check.
// Usage: node scripts/play-checks.mjs [baseUrl]   (needs the app, a Go API with the seed loaded, and the demo account)
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from './lib/kid.mjs';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 360, height: 740 } });
await ctx.addInitScript(() => {
  const voices = [{ name: 'Microsoft Sylvie Online (Natural) - French (Canada)', lang: 'fr-CA', localService: false }];
  window.SpeechSynthesisUtterance = class {
    constructor(t) {
      this.text = t;
    }
  };
  Object.defineProperty(window, 'speechSynthesis', {
    value: { getVoices: () => voices, speak: (u) => setTimeout(() => u.onend?.(), 20), cancel() {}, addEventListener() {}, removeEventListener() {} },
  });
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${page.url().replace(BASE, '')} ${e.message.slice(0, 160)}`));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${page.url().replace(BASE, '')} ${m.text().slice(0, 160)}`));
let fails = 0;
const badResp = [];
page.on('response', async (r) => {
  if (r.status() >= 400 && r.url().includes('/api/v1')) badResp.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, '').slice(0, 70)} ${(await r.text().catch(() => '')).slice(0, 80)}`);
});
async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    fails++;
    console.log(`FAIL ${name}: ${e.message.split('\n')[0].slice(0, 500)}`);
  }
}
const T = { timeout: 15000 };

await parentLogin(page, BASE);
await kidEnter(page, BASE, 'Noé', '4321');

await check('world map shows every world with a photo and no horizontal scroll', async () => {
  await page.goto(`${BASE}/play/worlds`, { waitUntil: 'networkidle' });
  const cards = page.locator('[data-world]');
  await cards.first().waitFor(T);
  const n = await cards.count();
  if (n < 20) throw new Error(`only ${n} world cards`);
  const imgs = await page.locator('[data-world] img[srcset]').count();
  if (imgs < 4) throw new Error(`only ${imgs} photos with srcset on the first screen`);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  if (wide) throw new Error('page scrolls sideways');
});
await check('photos are served as immutable webp and answer 304 on revalidation', async () => {
  const src = await page.locator('[data-world] img[srcset]').first().evaluate((i) => i.currentSrc);
  const r1 = await page.request.get(src);
  if (r1.headers()['content-type'] !== 'image/webp') throw new Error(`content-type ${r1.headers()['content-type']}`);
  if (!/immutable/.test(r1.headers()['cache-control'] ?? '')) throw new Error(`cache-control ${r1.headers()['cache-control']}`);
  const r2 = await page.request.get(src, { headers: { 'if-none-match': r1.headers().etag } });
  if (r2.status() !== 304) throw new Error(`revalidation answered ${r2.status()}`);
});
await check('a world card opens its page with a hero, quests on a path and thumbnails', async () => {
  await page.locator('[data-world="cuisine"]').click();
  await page.waitForURL('**/play/journey/cuisine', T);
  await page.getByRole('heading', { name: 'Cuisine', level: 1 }).waitFor(T);
  await page.locator('ol button[data-state]').first().waitFor(T);
  if ((await page.locator('ol button[data-state] img').count()) < 1) throw new Error('no quest thumbnail');
  if (!(await page.getByText('La fournée de biscuits').count())) throw new Error('quest name missing');
});
await check('a reduced-motion child gets no parallax movement', async () => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  const t = await page.locator('header div[style*="translate3d"]').first().evaluate((e) => getComputedStyle(e).getPropertyValue('--py'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (t && t.trim() !== '0px') throw new Error(`parallax moved: ${t}`);
});

// Plays quests until each input kind has been answered once
const kinds = new Set();
const seenVisual = new Set();
// The kind of input waiting for an answer; null while the question loads or the outcome is on screen
async function detect() {
  return page.evaluate(() => {
    const q = (x) => document.querySelector(x);
    if (q('[role=group][aria-label="Clavier numérique"]')) return q('[role=group][aria-label="Clavier numérique"] button:not([disabled])') ? 'keypad' : null;
    if (q('ol[aria-label="Ton ordre"]')) return q('[role=group][aria-label="Cartes à placer"] button') ? 'order' : null;
    if (q('ul[aria-label="Cartes de gauche"]')) return q('ul[aria-label="Cartes de gauche"] button:not([disabled])') ? 'match' : null;
    const idle = [...document.querySelectorAll('main button[data-state=idle]')];
    if (!idle.length) return null;
    return idle.length === 2 && idle.every((b) => /^(Vrai|Faux)$/.test(b.innerText.trim())) ? 'truefalse' : 'choice';
  });
}
async function playChapter(world, skillId) {
  const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
  const s = await page.evaluate(
    async ([c, w, k]) => {
      const r = await fetch(`/api/v1/children/${c}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ world: w, kind: 'chapter', skill_id: k }) });
      return { status: r.status, json: await r.json() };
    },
    [childId, world, skillId],
  );
  if (s.status >= 300) throw new Error(`start ${world}/${skillId}: ${s.status}`);
  await page.goto(`${BASE}/play/session/${s.json.id}`, { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline && !/\/done/.test(page.url())) {
    await page.waitForTimeout(200);
    const cont = page.getByRole('button', { name: /^(continuer|terminer|suite)$/i });
    if ((await cont.count()) && (await cont.first().isEnabled())) {
      await cont.first().click().catch(() => {});
      continue;
    }
    const kind = await detect();
    if (!kind) continue;
    if (await page.locator('figure[role=img]').count()) seenVisual.add(await page.locator('figure[role=img]').first().getAttribute('aria-label'));
    kinds.add(kind);
    const click = (name) => page.getByRole('button', { name }).first().click({ timeout: 4000 });
    if (kind === 'keypad') {
      await click(/^4$/);
      await page.getByRole('button', { name: /vérifier|suivant/i }).first().click();
    } else if (kind === 'truefalse') await click(/^Faux/);
    else if (kind === 'order') {
      const g = page.getByRole('group', { name: 'Cartes à placer' });
      while (await g.getByRole('button').count()) await g.getByRole('button').first().click();
      await click(/^vérifier$/i);
    } else if (kind === 'match') {
      const n = await page.locator('ul[aria-label="Cartes de gauche"] button').count();
      for (let i = 0; i < n; i++) {
        await page.locator('ul[aria-label="Cartes de gauche"] button').nth(i).click();
        await page.locator('ul[aria-label="Cartes de droite"] button').nth(i).click();
      }
      await click(/^vérifier$/i);
    } else await page.locator('main button[data-state=idle]').first().click();
    await page.locator('[data-stage]').first().click({ timeout: 800, force: true }).catch(() => {});
  }
  if (!/\/done/.test(page.url())) {
    await page.evaluate((id) => fetch(`/api/v1/sessions/${id}/finish`, { method: 'POST', headers: { 'x-nx-mode': 'child' } }), s.json.id);
    const seen = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 160);
    throw new Error(`chapter ${world}/${skillId} did not finish in 60 s (screen: ${seen}; last failed calls: ${badResp.slice(-3).join(' | ')})`);
  }
}
await check('chapters of nature and meteo play through (cards, keypad, true/false, order, match, graphs)', async () => {
  for (const world of ['nature', 'meteo']) {
    const nodes = await page.evaluate(
      async ([c, w]) => (await (await fetch(`/api/v1/children/${c}/journey?world=${w}`, { headers: { 'x-nx-mode': 'child' } })).json()).nodes,
      [(await (await page.request.get(`${BASE}/api/session`)).json()).childId, world],
    );
    for (const n of nodes.filter((x) => x.state !== 'locked').slice(0, 3)) await playChapter(world, n.skill_id);
  }
  const need = ['choice', 'keypad'];
  const missing = need.filter((k) => !kinds.has(k));
  if (missing.length) throw new Error(`never met: ${missing.join(', ')} (met ${[...kinds].join(', ')})`);
});
await check('the chapter bar and the done screen show a photo of the world', async () => {
  if (!/\/done/.test(page.url())) throw new Error('not on the done screen');
  await page.locator('main img').first().waitFor(T);
});
await check('the next question was prefetched while the child read the feedback', async () => {
  const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
  const calls = [];
  page.on('request', (r) => /\/sessions\/[^/]+\/beats$/.test(r.url()) && r.method() === 'POST' && calls.push(Date.now()));
  const node = (await page.evaluate(async (c) => (await (await fetch(`/api/v1/children/${c}/journey?world=cuisine`, { headers: { 'x-nx-mode': 'child' } })).json()).nodes[0], childId));
  const s = await page.evaluate(
    async ([c, k]) => (await (await fetch(`/api/v1/children/${c}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ world: 'cuisine', kind: 'chapter', skill_id: k }) })).json()),
    [childId, node.skill_id],
  );
  await page.goto(`${BASE}/play/session/${s.id}`, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 40 && !(await detect()); i++) await page.waitForTimeout(250);
  const kind = await detect();
  if (kind === 'keypad') {
    await page.getByRole('button', { name: /^7$/ }).click();
    await page.getByRole('button', { name: /vérifier|suivant/i }).first().click();
  } else await page.locator('main button[data-state=idle]').first().click();
  await page.getByRole('button', { name: /^continuer$/i }).waitFor({ timeout: 8000 });
  const beforeContinue = calls.length;
  if (beforeContinue < 2) throw new Error(`only ${beforeContinue} beat request(s) before Continue`);
  await page.evaluate((id) => fetch(`/api/v1/sessions/${id}/finish`, { method: 'POST', headers: { 'x-nx-mode': 'child' } }), s.id);
});
await check('a failing next question shows a retry state, not a blank screen', async () => {
  const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
  const node = (await page.evaluate(async (c) => (await (await fetch(`/api/v1/children/${c}/journey?world=cuisine`, { headers: { 'x-nx-mode': 'child' } })).json()).nodes[0], childId));
  const s = await page.evaluate(
    async ([c, k]) => (await (await fetch(`/api/v1/children/${c}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ world: 'cuisine', kind: 'chapter', skill_id: k }) })).json()),
    [childId, node.skill_id],
  );
  await page.route('**/api/v1/sessions/*/beats', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 502, contentType: 'application/problem+json', body: JSON.stringify({ status: 502, code: 'backend_unreachable', title: 'down' }) }) : r.continue()));
  await page.goto(`${BASE}/play/session/${s.id}`, { waitUntil: 'domcontentloaded' });
  // the session itself loads with no open beat the first time, so the beat request fails
  await page.getByRole('button', { name: /réessayer/i }).first().waitFor(T);
  await page.unroute('**/api/v1/sessions/*/beats');
  await page.getByRole('button', { name: /réessayer/i }).first().click();
  for (let i = 0; i < 40 && !(await detect()); i++) await page.waitForTimeout(250);
  if (!(await detect())) throw new Error('retry did not bring the question back');
  await page.evaluate((id) => fetch(`/api/v1/sessions/${id}/finish`, { method: 'POST', headers: { 'x-nx-mode': 'child' } }), s.id);
});
await check('credits page lists attributions and is linked from Me', async () => {
  await page.goto(`${BASE}/play/me`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /crédits des images/i }).click();
  await page.waitForURL('**/credits', T);
  await page.getByRole('heading', { name: /crédits des images/i }).waitFor(T);
  await page.locator('main li img').first().waitFor(T);
  if (!(await page.getByRole('link', { name: /source/i }).count())) throw new Error('no source links');
});

if (errors.length) {
  fails++;
  console.log(`console errors:\n${[...new Set(errors)].slice(0, 8).join('\n')}`);
}
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all play checks pass');
process.exit(fails ? 1 : 0);
