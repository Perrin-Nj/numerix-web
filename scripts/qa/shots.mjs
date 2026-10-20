// Human-eye review captures: home, world map, world page, question + feedback screens of 8 worlds, feed scroll, parent area.
// Output out/review/{vp}-*.png and one contact sheet per vp+group. Usage: node scripts/qa/shots.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parentLogin, kidEnter } from '../lib/kid.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3130').replace(/\/$/, '');
const OUT = resolve(import.meta.dirname, 'out/review');
mkdirSync(OUT, { recursive: true });
const fix = (p) => p.split(String.fromCharCode(92)).join('/');
const WORLDS = ['nature', 'espace', 'cuisine', 'sport', 'ocean', 'dinosaures', 'pirates', 'robots'];
const groups = {};
const browser = await chromium.launch();
for (const [vp, w, h] of [['m360', 360, 740], ['t768', 768, 1024], ['d1280', 1280, 800]]) {
  const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const snap = async (group, name) => {
    const f = `${OUT}/${vp}-${group}-${name}.png`;
    await page.screenshot({ path: f });
    (groups[`${vp}-${group}`] ??= []).push([f, name]);
  };
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await snap('core', 'home');
  await parentLogin(page, BASE);
  const kidLinks = ['/parent', '/parent/account', '/parent/subscription'];
  for (const u of kidLinks) { await page.goto(BASE + u, { waitUntil: 'networkidle' }); await page.waitForTimeout(500); await snap('parent', u.replace(/\W+/g, '_')); }
  const cid0 = await page.$$eval('a[href*="/parent/children/"]', (a) => a.map((x) => x.getAttribute('href')).find((h) => /children\/[^/]+$/.test(h) && !/new/.test(h)));
  if (cid0) for (const sub of ['', '/report', '/settings']) { await page.goto(BASE + cid0 + sub, { waitUntil: 'networkidle' }); await page.waitForTimeout(500); await snap('parent', 'child' + sub.replace(/\W+/g, '_')); }
  await kidEnter(page, BASE);
  const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
  for (const u of ['/play/home', '/play/worlds', '/play/challenges', '/play/collection', '/play/me']) { await page.goto(BASE + u, { waitUntil: 'networkidle' }); await page.waitForTimeout(700); await snap('core', u.split('/').pop()); }
  for (const world of WORLDS.slice(0, 2)) { await page.goto(`${BASE}/play/journey/${world}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(700); await snap('core', 'world-' + world); }
  for (const world of WORLDS) {
    try {
      const node = await page.evaluate(async ([c, wd]) => (await (await fetch(`/api/v1/children/${c}/journey?world=${wd}`, { headers: { 'x-nx-mode': 'child' } })).json()).nodes[0], [childId, world]);
      const s = await page.evaluate(async ([c, k, wd]) => (await (await fetch(`/api/v1/children/${c}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ world: wd, kind: 'chapter', skill_id: k }) })).json()), [childId, node.skill_id, world]);
      await page.goto(`${BASE}/play/session/${s.id}`, { waitUntil: 'domcontentloaded' });
      const keypad = page.getByRole('button', { name: /^7$/ }); const idle = page.locator('main button[data-state=idle]').first();
      await Promise.race([keypad.waitFor({ timeout: 15000 }), idle.waitFor({ timeout: 15000 })]);
      await page.waitForTimeout(900); await snap('question', world);
      if (await keypad.count()) { await keypad.click(); await page.getByRole('button', { name: /vérifier|suivant/i }).first().click(); } else await idle.click();
      await page.getByRole('button', { name: /^continuer$/i }).waitFor({ timeout: 8000 }); await page.waitForTimeout(900); await snap('feedback', world);
      await page.evaluate((id) => fetch(`/api/v1/sessions/${id}/finish`, { method: 'POST', headers: { 'x-nx-mode': 'child' } }), s.id);
    } catch (e) { console.log(`skip ${vp} ${world}: ${String(e.message).slice(0, 80)}`); }
  }
  await page.goto(`${BASE}/play/feed`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
  for (let i = 0; i < 14; i++) { await snap('feed', String(i).padStart(2, '0')); await page.mouse.wheel(0, h * 0.9); await page.waitForTimeout(1300); }
  await ctx.close();
}
await browser.close();
const b2 = await chromium.launch();
for (const [g, items] of Object.entries(groups)) {
  const cw = g.startsWith('m360') ? 240 : g.startsWith('t768') ? 330 : 460;
  const html = `<body style="margin:0;background:#222;color:#fff;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:6px;padding:6px">${items.map(([f, n]) => `<figure style="margin:0;width:${cw}px"><img style="width:100%" src="file:///${fix(f)}"><figcaption>${n}</figcaption></figure>`).join('')}</body>`;
  writeFileSync(`${OUT}/sheet-${g}.html`, html);
  const p = await b2.newPage({ viewport: { width: 1500, height: 900 } });
  await p.goto(`file:///${fix(`${OUT}/sheet-${g}.html`)}`); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/sheet-${g}.png`, fullPage: true });
}
await b2.close();
console.log('review sheets:', Object.keys(groups).join(' '));
