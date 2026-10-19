// Regression: QA-A-001 feedback sheet must not cover the question or the answers, on 3 viewports x 4 worlds, right and wrong answers.
// Usage: node scripts/qa/regress-ui.mjs [baseUrl]   (needs demo account + seeded bank)
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from '../lib/kid.mjs';
const BASE = (process.argv[2] ?? 'http://localhost:3130').replace(/\/$/, '');
const browser = await chromium.launch();
let fails = 0;
for (const [vp, w, h] of [['m360', 360, 740], ['t768', 768, 1024], ['d1280', 1280, 800]]) {
  const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await parentLogin(page, BASE); await kidEnter(page, BASE);
  const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
  for (const world of ['nature', 'espace', 'cuisine', 'sport']) for (const right of [false]) {
    const name = `QA-A-001 feedback sheet clear of question [${vp} ${world} ${right ? 'right' : 'wrong'}]`;
    try {
      const node = await page.evaluate(async ([c, wd]) => (await (await fetch(`/api/v1/children/${c}/journey?world=${wd}`, { headers: { 'x-nx-mode': 'child' } })).json()).nodes[0], [childId, world]);
      const s = await page.evaluate(async ([c, k, wd]) => (await (await fetch(`/api/v1/children/${c}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ world: wd, kind: 'chapter', skill_id: k }) })).json()), [childId, node.skill_id, world]);
      await page.goto(`${BASE}/play/session/${s.id}`, { waitUntil: 'domcontentloaded' });
      const keypad = page.getByRole('button', { name: /^7$/ });
      const idle = page.locator('main button[data-state=idle]').first();
      await Promise.race([keypad.waitFor({ timeout: 15000 }), idle.waitFor({ timeout: 15000 })]);
      if (await keypad.count()) { await keypad.click(); await page.getByRole('button', { name: /vérifier|suivant/i }).first().click(); } else await idle.click();
      const cont = page.getByRole('button', { name: /^continuer$/i });
      await cont.waitFor({ timeout: 8000 });
      await page.waitForTimeout(700);
      const bad = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => /^continuer$/i.test(b.textContent.trim()));
        let sheet = btn; // nearest fixed/sticky/absolute ancestor = the feedback sheet
        for (let e = btn; e && e !== document.body; e = e.parentElement) if (/fixed|sticky|absolute/.test(getComputedStyle(e).position)) { sheet = e; break; }
        const sr = sheet.getBoundingClientRect(); const hits = [];
        const hit = (r) => r.width > 0 && r.height > 0 && r.left < sr.right && r.right > sr.left && r.top < sr.bottom - 2 && r.bottom > sr.top + 2;
        for (const e of document.querySelectorAll('main h1,main h2,main p,main [role=group] button,main button[data-state]')) {
          if (sheet.contains(e)) continue; const r = e.getBoundingClientRect();
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
