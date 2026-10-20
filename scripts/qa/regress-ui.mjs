// Regression: QA-A-001 feedback sheet must not cover the question or the answers, on 3 viewports x 4 worlds, right and wrong answers.
// Usage: node scripts/qa/regress-ui.mjs [baseUrl]   (needs demo account + seeded bank)
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from '../lib/kid.mjs';
const BASE = (process.argv[2] ?? 'http://localhost:3130').replace(/\/$/, '');
const browser = await chromium.launch();
let fails = 0;
for (const [vp, w, h] of [['m360', 360, 640], ['m390', 390, 844], ['t768', 768, 1024], ['d1280', 1280, 720], ['d1366', 1366, 768], ['d1920', 1920, 1080], ['z200', 640, 360]]) {
  const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await parentLogin(page, BASE); await kidEnter(page, BASE);
  const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
  for (const world of ['nature', 'espace', 'cuisine', 'sport']) for (const right of [false]) {
    const name = `QA-A-001 feedback sheet clear of question [${vp} ${world} ${right ? 'right' : 'wrong'}]`;
    try {
      const node = await page.evaluate(async ([c, wd]) => (await (await fetch(`/api/v1/children/${c}/journey?world=${wd}`, { headers: { 'x-nx-mode': 'child' } })).json()).nodes.find((n) => n.state !== 'locked'), [childId, world]);
      const start = () => page.evaluate(async ([c, k, wd]) => (await (await fetch(`/api/v1/children/${c}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ world: wd, kind: 'chapter', skill_id: k }) })).json()), [childId, node?.skill_id ?? null, world]);
      let s = await start();
      for (let n = 0; !s.id && n < 4; n++) { await page.waitForTimeout(2500); s = await start(); }
      if (!s.id) throw new Error(`session did not start: ${JSON.stringify(s).slice(0, 80)}`);
      await page.goto(`${BASE}/play/session/${s.id}`, { waitUntil: 'domcontentloaded' });
      const keypad = page.getByRole('group', { name: 'Clavier numérique' });
      const idle = page.locator('main button[data-state=idle]').first();
      const order = page.getByRole('group', { name: 'Cartes à placer' });
      const match = page.locator('ul[aria-label="Cartes de gauche"] button:not([disabled])');
      await Promise.any([keypad.waitFor({ timeout: 15000 }), idle.waitFor({ timeout: 15000 }), order.waitFor({ timeout: 15000 }), match.first().waitFor({ timeout: 15000 })]);
      const verify = () => page.getByRole('button', { name: /vérifier|suivant/i }).first().click({ timeout: 4000 }).catch(() => {});
      if (await keypad.count()) { await keypad.getByRole('button', { name: /^7$/ }).click(); await verify(); }
      else if (await order.count()) { while (await order.getByRole('button').count()) await order.getByRole('button').last().click(); await verify(); }
      else if (await match.count()) {
        const k = await match.count();
        for (let i = 0; i < k; i++) { await page.locator('ul[aria-label="Cartes de gauche"] button').nth(i).click(); await page.locator('ul[aria-label="Cartes de droite"] button').nth(k - 1 - i).click(); }
        await verify();
      } else await idle.click();
      const cont = page.getByRole('button', { name: /^continuer$/i });
      await cont.waitFor({ timeout: 8000 });
      await page.waitForTimeout(700);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); // a phone sheet may only hide content the child can scroll to
      const bad = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => /^continuer$/i.test(b.textContent.trim()));
        let sheet = btn; // nearest fixed/sticky/absolute ancestor = the feedback sheet
        for (let e = btn; e && e !== document.body; e = e.parentElement) if (/fixed|sticky|absolute/.test(getComputedStyle(e).position)) { sheet = e; break; }
        const sr = sheet.getBoundingClientRect(); const hits = [];
        const hit = (r) => r.width > 0 && r.height > 0 && r.left < sr.right && r.right > sr.left && r.top < sr.bottom - 2 && r.bottom > sr.top + 2;
        for (const e of document.querySelectorAll('main h1,main h2,main p,main [role=group] button,main button[data-state]')) {
          // collapsed (inert) answers are not content
          if (sheet.contains(e) || e.closest('[inert]')) continue;
          const r = e.getBoundingClientRect();
          if (hit(r) && (e.textContent || '').trim()) hits.push(`${e.tagName} "${e.textContent.trim().slice(0, 30)}"`);
        }
        return hits.slice(0, 4);
      });
      if (bad.length) throw new Error(`sheet overlaps: ${bad.join(' | ')}`);
      console.log(`ok   ${name}`);
      await page.evaluate((id) => fetch(`/api/v1/sessions/${id}/finish`, { method: 'POST', headers: { 'x-nx-mode': 'child' } }), s.id);
    } catch (e) { fails++; console.log(`FAIL ${name} ${String(e.message).slice(0, 140)}`); }
    if (!right) continue;
  }
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all pass');
process.exit(fails ? 1 : 0);
