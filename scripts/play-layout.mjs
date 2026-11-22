// Play-screen layout suite (T005, FR-006, FR-030 to FR-033): for each screen profile and each default world, the question stays
// visible and reachable, nothing scrolls sideways, text does not jump, the owl shows one bubble, the keypad does not move the page,
// a resize in the middle of a question keeps all of it. One line per check.
// Usage: node scripts/play-layout.mjs [baseUrl]   (needs app + Go API with the seeded bank; LAYOUT_ALL=1 for every profile, LAYOUT_SHOTS=dir for screenshots)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { parentLogin, kidEnter } from './lib/kid.mjs';
import { ALL, QUICK } from './lib/viewports.mjs';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const PROFILES = process.env.LAYOUT_ALL ? ALL : QUICK;
const SHOTS = process.env.LAYOUT_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const WORLDS = ['echecs', 'medecine', 'espace'];
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 360, height: 740 } });
// short coach delay so the owl speaks again and again, like the owner saw; no real voice
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('nx:prefs:v1', JSON.stringify({ state: { hintDelaySec: 1, hints: true, voice: false, music: false }, version: 0 }));
  } catch {
    // storage can be blocked; the default delay then applies
  }
  window.__cls = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; (window.__src ??= []).push(e.value.toFixed(3) + ' ' + e.sources.map((x) => x.node?.nodeName + '.' + String(x.node?.className ?? '').slice(0, 40)).join(' | ')); }
  }).observe({ type: 'layout-shift', buffered: true });
});
const page = await ctx.newPage();
let fails = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    fails++;
    console.log(`FAIL ${name}: ${e.message.split('\n')[0].slice(0, 400)}`);
  }
}
const T = { timeout: 20000 };

await parentLogin(page, BASE);
await kidEnter(page, BASE, 'Noé', '4321');
const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;

async function start(world) {
  const nodes = await page.evaluate(async ([c, w]) => (await (await fetch(`/api/v1/children/${c}/journey?world=${w}`, { headers: { 'x-nx-mode': 'child' } })).json()).nodes ?? [], [childId, world]);
  const node = nodes.find((n) => n.state !== 'locked');
  if (!node) throw new Error(`no open quest in ${world}`);
  const s = await page.evaluate(
    async ([c, w, k]) => {
      const r = await fetch(`/api/v1/children/${c}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ world: w, kind: 'chapter', skill_id: k }) });
      return { status: r.status, json: await r.json() };
    },
    [childId, world, node.skill_id],
  );
  if (s.status >= 300) throw new Error(`start ${world}: ${s.status}`);
  await page.goto(`${BASE}/play/session/${s.json.id}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-question]').first().waitFor(T);
  // layout shift is judged from the moment the question is on screen
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__cls = 0; window.__src = []; });
  return s.json.id;
}
const finish = (id) => page.evaluate((i) => fetch(`/api/v1/sessions/${i}/finish`, { method: 'POST', headers: { 'x-nx-mode': 'child' } }), id).catch(() => {});

// Everything the layout promises, measured in the page
async function measure() {
  return page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const q = document.querySelector('[data-question]');
    let covered = null;
    let rect = null;
    let rest = null;
    if (q) {
      const r0 = q.getBoundingClientRect();
      rest = r0.top >= 0 && r0.bottom <= vh;
      q.scrollIntoView({ block: 'nearest' });
      const rr = q.getBoundingClientRect();
      rect = { top: rr.top, bottom: rr.bottom, left: rr.left, right: rr.right };
      const hit = document.elementFromPoint(Math.min(vw - 1, Math.max(0, rr.left + 4)), Math.min(vh - 1, Math.max(0, rr.top + rr.height / 2)));
      covered = !(hit && (q.contains(hit) || hit.contains(q)));
    }
    return { vw, vh, scrollW: document.documentElement.scrollWidth, q: rect, rest, covered, bubbles: document.querySelectorAll('[data-bubble]').length, cls: window.__cls, src: window.__src ?? [] };
  });
}
function assertMeasure(m, where) {
  if (m.scrollW > m.vw + 1) throw new Error(`${where}: sideways scroll (${m.scrollW} > ${m.vw})`);
  if (!m.q) throw new Error(`${where}: question missing`);
  if (m.q.right > m.vw + 1 || m.q.left < -1) throw new Error(`${where}: question outside the width`);
  if (m.covered) throw new Error(`${where}: question covered or clipped after one scroll`);
  if (m.bubbles > 1) throw new Error(`${where}: ${m.bubbles} owl bubbles at once`);
}
const questionTop = () => page.evaluate(() => { const q = document.querySelector('[data-question]'); return q ? Math.round(q.getBoundingClientRect().top) : null; });
const keys = () => page.locator('[role=group][aria-label="Clavier numérique"] button:not([disabled])').filter({ hasText: /^[1-9]$/ });
async function pressKeypad() {
  const key = keys();
  if (!(await key.count())) return false;
  const before = { top: await questionTop(), sy: await page.evaluate(() => scrollY) };
  // a real finger taps what is on screen and never scrolls first: click the visible part of each key with the mouse
  for (const i of [0, 1, 2]) {
    const b = await key.nth(i).boundingBox();
    const y = Math.min(b.y + b.height / 2, page.viewportSize().height - 2);
    if (b.y > page.viewportSize().height) {
      // too short for the keypad (under 360 px tall): the child scrolls, and the question must stay on screen while they do
      await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height / 2);
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => { const q = document.querySelector('[data-question]').getBoundingClientRect(); return q.top >= 0 && q.bottom <= innerHeight; });
      if (!r) throw new Error('question left the screen when the child scrolled to the keypad');
      return true;
    }
    await page.mouse.click(b.x + b.width / 2, y);
  }
  await page.waitForTimeout(300);
  const after = { top: await questionTop(), sy: await page.evaluate(() => scrollY) };
  // what the child sees: the question must not move on screen while keys are pressed
  if (Math.abs(after.top - before.top) > 1) throw new Error(`keypad moved the page (question top ${before.top} -> ${after.top}, scrollY ${before.sy} -> ${after.sy})`);
  return true;
}

for (const [i, p] of PROFILES.entries()) {
  const world = WORLDS[i % WORLDS.length];
  let sid;
  await check(`${p.name} ${world}: question visible, no sideways scroll, one owl bubble, no jump`, async () => {
    await page.setViewportSize({ width: p.width, height: p.height });
    sid = await start(world);
    // wait for the narration, the coach hint and a requested hint: the owl must still show one bubble
    await page.getByRole('button', { name: /indice/i }).first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(3500);
    const t0 = await questionTop();
    await page.waitForTimeout(1500);
    const t1 = await questionTop();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${p.name}-${world}.png` });
    const m = await measure();
    assertMeasure(m, p.name);
    if (Math.abs(t1 - t0) > 1) throw new Error(`question moved ${t0} -> ${t1} while still`);
    if (p.height >= 360 && !m.rest) throw new Error(`${p.name}: question not fully on screen at rest`);
    if (m.cls > 0.02) throw new Error(`layout shift ${m.cls.toFixed(3)} from ${m.src.slice(0, 3).join(' ;; ')}`);
  });
  await check(`${p.name}: input reachable, keypad does not move the page`, async () => {
    const hasKeypad = await pressKeypad();
    const target = hasKeypad ? page.locator('[role=group][aria-label="Clavier numérique"] button').first() : page.locator('main button[data-state=idle]').first();
    if (!(await target.count())) return; // another input kind: covered by the measure above
    await target.scrollIntoViewIfNeeded({ timeout: 3000 });
    const b = await target.boundingBox();
    if (!b || b.y < 0 || b.y + b.height > p.height + 1) throw new Error(`input not reachable (y ${b?.y}, height ${b?.height}, viewport ${p.height})`);
  });
  if (sid) await finish(sid);
}

await check('resize in the middle of a question keeps it visible (1280x720, 600x400, 360x740, 1024x400, back)', async () => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const sid = await start('echecs');
  await page.waitForTimeout(1500);
  for (const [w, h] of [[600, 400], [360, 740], [1024, 400], [320, 568], [1280, 720]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    assertMeasure(await measure(), `${w}x${h}`);
  }
  await finish(sid);
});
await check('owl sends several messages: the question never leaves the screen (320x568)', async () => {
  await page.setViewportSize({ width: 320, height: 568 });
  const sid = await start('medecine');
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: /indice/i }).first().click({ timeout: 800 }).catch(() => {});
    await page.waitForTimeout(1500);
    assertMeasure(await measure(), `message ${i + 1}`);
  }
  await finish(sid);
});
await check('zoom 200 percent of a phone width (320x284 css) has no sideways scroll', async () => {
  await page.setViewportSize({ width: 320, height: 284 });
  const sid = await start('espace');
  assertMeasure(await measure(), '320x284');
  await finish(sid);
});

// Parent side (T056, T057): switch rows and child cards at 320 and 1280
for (const [w, h] of [[320, 640], [1280, 800]]) {
  await check(`${w}: child card is flat with a small radius, Delete profile is on the card and asks for the name`, async () => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
    const card = page.locator('[data-child-card]').first();
    await card.waitFor(T);
    if ((await page.evaluate(() => document.documentElement.scrollWidth)) > w + 1) throw new Error('sideways scroll on the parent home');
    const radius = await card.evaluate((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius));
    if (radius > 12) throw new Error(`card radius ${radius}px is too round`);
    const del = card.getByRole('button', { name: /supprimer le profil/i });
    const b = await del.boundingBox();
    if (!b || b.height < 44) throw new Error('Delete profile missing or under 44 px');
    await del.click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor(T);
    const confirm = dialog.getByRole('button', { name: /supprimer pour de bon/i });
    if (await confirm.isEnabled()) throw new Error('confirm enabled before the name is typed');
    await dialog.getByRole('textbox').fill('faux nom');
    if (await confirm.isEnabled()) throw new Error('confirm enabled with a wrong name');
    await page.keyboard.press('Escape');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/parent-home-${w}.png` });
  });
  await check(`${w}: switch rows are whole-row targets with the switch beside the label`, async () => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${BASE}/parent/children/${childId}/settings`, { waitUntil: 'networkidle' });
    const rows = page.locator('label:has([role=switch])');
    await rows.first().waitFor(T);
    if ((await page.evaluate(() => document.documentElement.scrollWidth)) > w + 1) throw new Error('sideways scroll on the settings');
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const r = await rows.nth(i).evaluate((l) => {
        const sw = l.querySelector('[role=switch]').getBoundingClientRect();
        const text = l.querySelector('span[id$=-label]').getBoundingClientRect();
        const row = l.getBoundingClientRect();
        return { h: row.height, w: row.width, cell: l.parentElement.getBoundingClientRect().width, gap: text.left - sw.right };
      });
      if (r.h < 48 - 1) throw new Error(`row ${i} is ${r.h}px tall`);
      // no width cap: the row fills its grid cell, never wider than it
      if (r.w > r.cell + 1) throw new Error(`row ${i} is ${r.w}px wide in a ${r.cell}px cell`);
      if (r.gap > 40) throw new Error(`row ${i}: switch is ${Math.round(r.gap)}px away from its label`);
    }
    // a tap on the label text (not on the switch) toggles it
    const sw = rows.last().getByRole('switch');
    const before = await sw.getAttribute('aria-checked');
    await rows.last().locator('span[id$=-label]').click();
    if ((await sw.getAttribute('aria-checked')) === before) throw new Error('tapping the label did not toggle');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/settings-${w}.png`, fullPage: true });
  });
}

await browser.close();
console.log(fails ? `${fails} FAILED` : 'all layout checks pass');
process.exit(fails ? 1 : 0);
