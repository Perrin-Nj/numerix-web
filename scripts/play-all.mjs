// Plays the quests of every world against the seeded API, answers by input kind, and takes a 360 px screenshot of
// the first question of each kind per world. Prints the kinds met per world and anything that could not be played.
// Workers play different worlds at the same time, each as its own child (created on first use).
// Usage: node scripts/play-all.mjs [baseUrl] [outDir]
// Env: WORLDS=a,b  ONLY_FIRST=1 (one quest per world)  QUESTS=n (quests per world, default all)  WORKERS=4  DEBUG_PLAY=1
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { parentLogin, kidEnter } from './lib/kid.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const OUT = process.argv[3] ?? '';
const WORKERS = Number(process.env.WORKERS ?? 4);
if (OUT) mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const bad = [];
const unknown = [];
const met = {};
const visuals = new Set(); // first aria-label word of every graph picture already photographed

const newContext = async (label) => {
  const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 360, height: 740 } });
  // A fake speech engine, so the "no voice" notice never covers the screen
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
  page.on('pageerror', (e) => errors.push(`${label} ${page.url().replace(BASE, '')} ${e.message.slice(0, 160)}`));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${label} ${page.url().replace(BASE, '')} ${m.text().slice(0, 160)}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && /\/api\/v1|\/assets\//.test(r.url()) && !/auth\/device|children\/[^/]+\/token/.test(r.url())) bad.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, '').slice(0, 90)}`);
  });
  return page;
};
const apiOn = (page) => (path, init) =>
  page.evaluate(
    async ([p, i]) => {
      const r = await fetch(`/api/v1${p}`, { ...i, headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID(), ...(i?.headers ?? {}) } });
      return { status: r.status, json: await r.json().catch(() => null) };
    },
    [path, init],
  );

// One parent session creates the extra children and lists the worlds
const boss = await newContext('boss');
await parentLogin(boss, BASE);
const bossApi = apiOn(boss);
const parent = { 'x-nx-mode': 'parent' };
const names = Array.from({ length: WORKERS }, (_, i) => `Kid${i + 1}`);
const have = (await bossApi('/children', { headers: parent })).json.items.map((c) => c.display_name);
for (const n of names) {
  if (have.includes(n)) continue;
  const c = await bossApi('/children', { method: 'POST', headers: parent, body: JSON.stringify({ display_name: n, grade: 4, avatar_id: 'owl', pin: '1111' }) });
  await bossApi('/auth/consent', { method: 'POST', headers: parent, body: JSON.stringify({ child_id: c.json.id, version: '2026-10', accepted: true }) });
}
const allWorlds = (await bossApi('/worlds', { headers: parent })).json.items.map((w) => w.id).filter((id) => !process.env.WORLDS || process.env.WORLDS.split(',').includes(id));

async function worker(idx) {
  const page = await newContext(names[idx]);
  await parentLogin(page, BASE);
  await kidEnter(page, BASE, names[idx], '1111');
  const api = apiOn(page);
  // The API limits how fast a child may start chapters: wait and try again instead of failing the run
  const kid = async (p, i) => {
    for (let n = 0; n < 15; n++) {
      const r = await api(p, { ...i, headers: { 'x-nx-mode': 'child' } });
      if (r.status !== 429) return r;
      await page.waitForTimeout(4000);
    }
    return api(p, { ...i, headers: { 'x-nx-mode': 'child' } });
  };
  const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;

  // The kind of input waiting for an answer; null while the question loads or the outcome is on screen
  const detect = () =>
    page.evaluate(() => {
      const q = (x) => document.querySelector(x);
      if (q('[role=group][aria-label="Clavier numérique"]')) return q('[role=group][aria-label="Clavier numérique"] button:not([disabled])') ? 'keypad' : null;
      if (q('ol[aria-label="Ton ordre"]')) return q('[role=group][aria-label="Cartes à placer"] button') ? 'order' : null;
      if (q('ul[aria-label="Cartes de gauche"]')) return q('ul[aria-label="Cartes de gauche"] button:not([disabled])') ? 'match' : null;
      if (q('input[type=range]')) return q('input[type=range]:not([disabled])') ? 'estimate' : null;
      const idle = [...document.querySelectorAll('main button[data-state=idle]')];
      if (!idle.length) return null;
      return idle.length === 2 && idle.every((b) => /^(Vrai|Faux)$/.test(b.innerText.trim())) ? 'truefalse' : 'choice';
    });
  const verify = () => page.getByRole('button', { name: /^vérifier$/i }).first().click({ timeout: 3000 });
  async function answer(kind) {
    const click = (name) => page.getByRole('button', { name }).first().click({ timeout: 4000 });
    if (kind === 'keypad') {
      await click(/^1$/);
      await click(/^2$/);
      await page.getByRole('button', { name: /vérifier|suivant/i }).first().click({ timeout: 4000 });
      // a remainder question has a second field
      if ((await detect()) === 'keypad' && (await page.locator('[role=group][aria-label="Clavier numérique"] button[aria-live]').count()) > 1) {
        await click(/^3$/).catch(() => {});
        await verify().catch(() => {});
      }
    } else if (kind === 'truefalse') await click(/^Vrai/);
    else if (kind === 'order') {
      const group = page.getByRole('group', { name: 'Cartes à placer' });
      while (await group.getByRole('button').count()) await group.getByRole('button').first().click();
      await verify();
    } else if (kind === 'match') {
      const n = await page.locator('ul[aria-label="Cartes de gauche"] button').count();
      for (let i = 0; i < n; i++) {
        await page.locator('ul[aria-label="Cartes de gauche"] button').nth(i).click();
        await page.locator('ul[aria-label="Cartes de droite"] button').nth(i).click();
      }
      await verify();
    } else if (kind === 'estimate') {
      await page.locator('input[type=range]').focus();
      await page.keyboard.press('ArrowRight');
      await verify();
    } else await page.locator('main button[data-state=idle]').first().click();
  }

  for (let w = idx; w < allWorlds.length; w += WORKERS) {
    const world = allWorlds[w];
    met[world] = new Set();
    const j = await kid(`/children/${childId}/journey?world=${world}`);
    let nodes = (j.json?.nodes ?? []).filter((n) => n.state !== 'locked'); // an explicit skill_id on a locked chapter is 422 (QA-BE-004)
    if (process.env.SKILL) nodes = nodes.filter((n) => n.skill_id === process.env.SKILL);
    if (process.env.ONLY_FIRST) nodes = nodes.slice(0, 1);
    else if (process.env.QUESTS) nodes = nodes.slice(0, Number(process.env.QUESTS));
    if (!nodes.length) {
      console.log(`${world}: no playable quest (journey ${j.status})`);
      continue;
    }
    for (const node of nodes) {
      const s = await kid(`/children/${childId}/sessions`, { method: 'POST', body: JSON.stringify({ world, kind: 'chapter', skill_id: node.skill_id }) });
      if (s.status !== 201 && s.status !== 200) {
        unknown.push(`${world}/${node.quest?.id ?? node.skill_id}: start ${s.status} ${s.json?.code ?? ''}`);
        continue;
      }
      await page.goto(`${BASE}/play/session/${s.json.id}`, { waitUntil: 'domcontentloaded' });
      for (let step = 0; step < 40; step++) {
        await page.waitForTimeout(150);
        if (/\/done/.test(page.url())) break;
        const cont = page.getByRole('button', { name: /^(continuer|terminer|suite)$/i });
        if ((await cont.count()) && (await cont.first().isEnabled())) {
          await cont.first().click().catch(() => {});
          continue;
        }
        const kind = await detect();
        if (process.env.DEBUG_PLAY) console.log('  step', idx, step, world, node.quest?.id, kind);
        if (!kind) {
          if (await page.getByRole('heading', { name: /oups|accroc|problème/i }).count()) {
            unknown.push(`${world}/${node.quest?.id}: error screen`);
            break;
          }
          continue;
        }
        // graphs and tables: one picture per visual kind (bars, clock, grid...), with the world in the name
        const fig = await page.locator('figure[role=img]').first().getAttribute('aria-label', { timeout: 300 }).catch(() => null);
        if (fig) {
          const vk = /barre|bar chart|Fruits|pluie/i.test(fig) ? 'bars' : /horloge|clock/i.test(fig) ? 'clock' : /droite|number line/i.test(fig) ? 'numberline' : /grille|grid/i.test(fig) ? 'grid' : /cercle|circle/i.test(fig) ? 'fraction' : /dés|dice/i.test(fig) ? 'dice' : 'pictograph';
          met[world].add(`visual:${vk}`);
          if (OUT && !visuals.has(vk + world)) {
            visuals.add(vk + world);
            await page.screenshot({ path: `${OUT}/vis-${vk}-${world}.png` });
          }
        }
        if (!met[world].has(kind)) {
          met[world].add(kind);
          if (OUT) await page.screenshot({ path: `${OUT}/play-${world}-${kind}.png` });
        }
        try {
          await answer(kind);
        } catch (e) {
          if (OUT) await page.screenshot({ path: `${OUT}/fail-${world}-${node.quest?.id ?? 'gen'}-${kind}.png` });
          unknown.push(`${world}/${node.quest?.id}: ${kind} answer failed ${e.message.split('\n')[0].slice(0, 100)}`);
          break;
        }
        // a tap on the stage skips the consequence animation
        await page.locator('[data-stage]').first().click({ timeout: 800, force: true }).catch(() => {});
      }
      // leave an unfinished chapter cleanly so the next start is allowed
      if (!/\/done/.test(page.url())) await kid(`/sessions/${s.json.id}/finish`, { method: 'POST' });
    }
    console.log(`${world}: ${[...met[world]].sort().join(', ')}`);
  }
}

await Promise.all(names.map((_, i) => worker(i)));
const all = new Set(Object.values(met).flatMap((s) => [...s]));
console.log('kinds seen overall:', [...all].sort().join(', '));
if (unknown.length) console.log('PROBLEMS:\n' + unknown.join('\n'));
const net = [...new Set(bad)];
if (net.length) console.log('HTTP errors:\n' + net.slice(0, 15).join('\n'));
console.log(errors.length ? `console errors:\n${[...new Set(errors)].slice(0, 15).join('\n')}` : 'no console errors');
await browser.close();
process.exit(unknown.length || errors.length ? 1 : 0);
