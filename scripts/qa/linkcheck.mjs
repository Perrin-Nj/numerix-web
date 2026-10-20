// Regression QA-A-010: every bottom-nav tab and every internal link on every route opens (no 404, no error screen), at 360 and 1280, fr and en.
// Usage: node scripts/qa/linkcheck.mjs [baseUrl]
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from '../lib/kid.mjs';
const BASE = (process.argv[2] ?? 'http://localhost:13140').replace(/\/$/, '');
let fails = 0, checked = 0;
const ok = (n, c, x = '') => { checked++; if (!c) { fails++; console.log(`FAIL ${n} ${x}`); } };
const browser = await chromium.launch();
const bad = /introuvable|not found|404|cet élément n.existe plus|this page (doesn|does not)/i;
const clear = async (page) => { await page.evaluate(async () => { const cid = (await (await fetch('/api/session')).json()).childId; await fetch('/api/v1/children/' + cid + '/gift/claim', { method: 'POST', headers: { 'x-nx-mode': 'child' } }); }).catch(() => {}); await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: /passer la visite|skip the tour/i }).first().click({ timeout: 3500 }).catch(() => {}); await page.waitForTimeout(500); };
let state = null;
for (const loc of ['fr-CA', 'en-CA']) for (const [vp, w, h] of [['m360', 360, 740], ['d1280', 1280, 800]]) {
  const ctx = await browser.newContext({ locale: loc, viewport: { width: w, height: h }, ...(state ? { storageState: state } : {}) });
  await ctx.addCookies([{ name: 'NEXT_LOCALE', value: loc, url: BASE }]);
  const page = await ctx.newPage();
  const tag = `${loc} ${vp}`;
  if (!state) { await parentLogin(page, BASE); state = await ctx.storageState(); } await kidEnter(page, BASE);
  const seen = new Set(); const queue = ['/play/home', '/play/worlds', '/play/feed', '/play/challenges', '/play/collection', '/play/me', '/play/quest', '/parent', '/parent/account', '/parent/subscription', '/credits'];
  // 1. the bottom nav, by clicking each tab as a child does
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  const tabs = await page.$$eval('nav a[href], nav button', (els) => els.map((e) => (e.getAttribute('href') ?? e.textContent ?? '').trim()).filter(Boolean));
  for (const t of [...new Set(tabs)].filter((t) => t.startsWith('/'))) {
    await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
    await clear(page);
    await page.evaluate((h) => document.querySelector(`nav a[href="${h}"]`)?.click(), t); // DOM click: the first-run tour overlay would swallow a pointer click
    await page.waitForURL((u) => u.pathname.startsWith(t.split("?")[0]), { timeout: 8000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    const st = await page.evaluate(() => document.body.innerText.slice(0, 400));
    ok(`${tag} nav tab ${t} opens`, page.url().includes(t.split('?')[0]) && !bad.test(st), `url=${page.url().replace(BASE, '')} text="${st.slice(0, 60).replace(/\s+/g, ' ')}"`);
  }
  // 2. every internal link found on every route (one hop)
  while (queue.length) {
    const r = queue.shift(); if (seen.has(r)) continue; seen.add(r);
    const resp = await page.goto(BASE + r, { waitUntil: 'networkidle' }).catch(() => null);
    ok(`${tag} ${r} status`, resp && resp.status() < 400, `status=${resp?.status()}`);
    const st = await page.evaluate(() => document.body.innerText.slice(0, 600));
    ok(`${tag} ${r} no not-found text`, !bad.test(st), st.slice(0, 80).replace(/\s+/g, ' '));
    const links = await page.$$eval('a[href^="/"]', (a) => [...new Set(a.map((x) => x.getAttribute('href').split('#')[0]))]);
    for (const l of links) if (!seen.has(l) && !queue.includes(l) && !/^\/(api|_next)/.test(l) && seen.size + queue.length < 90) queue.push(l);
  }
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} FAILED of ${checked}` : `all pass (${checked} checks)`);
process.exit(fails ? 1 : 0);
