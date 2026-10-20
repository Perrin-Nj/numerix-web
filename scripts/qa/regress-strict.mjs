// Regression QA-A-008: UNSCROLLED, the feedback sheet must not cover or clip the question and the caption, 20 worlds x 5 viewports.
// Usage: node scripts/qa/regress-strict.mjs [baseUrl]   (needs demo account + seeded bank)
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from '../lib/kid.mjs';
const BASE = (process.argv[2] ?? 'http://localhost:3130').replace(/\/$/, '');
const browser = await chromium.launch();
let fails = 0;
const only = (v) => (v ? v.split(',') : null); // QA_VP=m360 QA_WORLDS=ocean,sport narrows a local run
const WORLDS = only(process.env.QA_WORLDS) ?? ['animaux', 'arts', 'construction', 'cuisine', 'dinosaures', 'echecs', 'espace', 'hiver', 'jeux', 'marche', 'medecine', 'meteo', 'musique', 'nature', 'ocean', 'pirates', 'robots', 'science', 'sport', 'transport'];
for (const [vp, w, h] of [['m360', 360, 740], ['m390', 390, 844], ['t768', 768, 1024], ['d1280', 1280, 720], ['d1366', 1366, 768]].filter(([v]) => !process.env.QA_VP || process.env.QA_VP.split(',').includes(v))) {
  const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await parentLogin(page, BASE); await kidEnter(page, BASE);
  const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
  for (const world of WORLDS) for (const right of [false]) {
    const name = `QA-A-001b unscrolled phone: sheet clear of question [${vp} ${world} ${right ? 'right' : 'wrong'}]`;
    try {
      const node = await page.evaluate(async ([c, wd]) => (await (await fetch(`/api/v1/children/${c}/journey?world=${wd}`, { headers: { 'x-nx-mode': 'child' } })).json()).nodes[0], [childId, world]);
      const start = () => page.evaluate(async ([c, k, wd]) => (await (await fetch(`/api/v1/children/${c}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ world: wd, kind: 'chapter', skill_id: k }) })).json()), [childId, node.skill_id, world]);
      let s = await start();
      for (let n = 0; !s.id && n < 4; n++) { await page.waitForTimeout(2500); s = await start(); }
      if (!s.id) throw new Error(`session did not start: ${JSON.stringify(s).slice(0, 80)}`);
      await page.goto(`${BASE}/play/session/${s.id}`, { waitUntil: 'domcontentloaded' });
      const keypad = page.getByRole('group', { name: 'Clavier numérique' });
      const idle = page.locator('main button[data-state=idle]').first();
      const order = page.getByRole('group', { name: 'Cartes à placer' });
      const match = page.locator('ul[aria-label="Cartes de gauche"] button:not([disabled])');
      const ready = () => Promise.any([keypad.waitFor({ timeout: 15000 }), idle.waitFor({ timeout: 15000 }), order.waitFor({ timeout: 15000 }), match.first().waitFor({ timeout: 15000 })]);
      await ready().catch(async () => { await page.reload({ waitUntil: 'domcontentloaded' }); await ready(); }); // one retry: a slow first compile is not a layout defect
      // QA-P2 voice toast: the notice must never sit on the answers (headless Chromium has no voice, so it shows here)
      const toast = await page.evaluate(() => {
        const answers = [...document.querySelectorAll('main [role=group] button, main button[data-state]')].filter((b) => !b.closest('[inert]')).map((b) => b.getBoundingClientRect());
        return [...document.querySelectorAll('[aria-live] li')].some((li) => { const t = li.getBoundingClientRect(); return answers.some((r) => r.width && t.left < r.right && t.right > r.left && t.top < r.bottom && t.bottom > r.top); });
      });
      if (toast) throw new Error('toast covers the answers');
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
      const bad = await page.evaluate(() => {
        const sheet = document.querySelector('[data-outcome-sheet]');
        const sr = sheet.getBoundingClientRect(); const hits = [];
        const clipped = (e, r) => { // cut off by a scrolling or hidden ancestor, or past the screen edge, without any scrolling
          for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
            if (!/auto|scroll|hidden|clip/.test(getComputedStyle(a).overflowY)) continue;
            const ar = a.getBoundingClientRect(); if (r.bottom > ar.bottom + 1 || r.top < ar.top - 1) return true;
          }
          return r.bottom > innerHeight + 1;
        };
        // question, caption (story text), answers; the sheet's own content and inert answers are excluded
        for (const e of document.querySelectorAll('main h1,main h2,main p,main [role=group] button,main button[data-state],[data-question]')) {
          if (sheet.contains(e) || e.closest('[inert]') || e.closest('[aria-hidden=true]')) continue;
          const r = e.getBoundingClientRect(); const txt = (e.textContent || '').trim();
          if (!txt || r.width === 0 || r.height === 0) continue;
          const covered = r.left < sr.right && r.right > sr.left && r.top < sr.bottom - 2 && r.bottom > sr.top + 2;
          if (covered || clipped(e, r)) hits.push(`${e.tagName} "${txt.slice(0, 30)}"`);
        }
        const btn = [...sheet.querySelectorAll('button')].find((x) => /^continuer$/i.test(x.textContent.trim()));
        if (btn && btn.getBoundingClientRect().bottom > innerHeight + 1) hits.push('Continuer below the screen');
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
