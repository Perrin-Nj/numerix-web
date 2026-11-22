// Navigation audit (R3): every route opened directly, refreshed and reached through the navigation, fr-CA and en-CA,
// logged out, as a grown-up and as a kid. Fails on any 404 / not-found screen / console error / failed same-origin request.
// Usage: node scripts/qa/nav-audit.mjs [baseUrl]   (needs the demo account of scripts/seed-dev.mjs)
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from '../lib/kid.mjs';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const browser = await chromium.launch();
let fails = 0;
let checks = 0;
const fail = (name, why) => { fails++; console.log(`FAIL ${name}: ${why}`); };
// Requests that legitimately answer 4xx when nobody is signed in
const EXPECTED = /\/api\/(v1\/auth\/device|session)|\/_next\/image|\.map$|favicon/;

function watch(page, bag) {
  page.on('console', (m) => { if (m.type() === 'error') bag.push(`console: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => bag.push(`pageerror: ${e.message.slice(0, 160)}`));
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && u.startsWith(BASE) && !EXPECTED.test(u) && r.request().resourceType() !== 'document') bag.push(`${r.status()} ${u.replace(BASE, '')}`);
  });
}

/** Runs one navigation and asserts the result is a real screen. */
async function visit(page, bag, name, act, { expectUrl } = {}) {
  checks++;
  bag.length = 0;
  try {
    const res = await act();
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
    const status = res && typeof res.status === 'function' ? res.status() : 200;
    const path = new URL(page.url()).pathname;
    if (status >= 400) return fail(name, `HTTP ${status}`);
    if (await page.locator('[data-error-kind="notfound"],[data-error-code="not_found"]').count()) return fail(name, `not-found screen at ${path}`);
    if (expectUrl && !expectUrl.test(path)) return fail(name, `landed on ${path}`);
    if (!(await page.locator('main, [role=main]').count())) return fail(name, 'no <main>');
    if (bag.length) return fail(name, bag.slice(0, 3).join(' | '));
    console.log(`ok   ${name}`);
  } catch (e) {
    fail(name, e.message.replace(/\s+/g, ' ').slice(0, 450));
  }
}

const hrefsOf = (page) => page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0]).filter((h) => h && h !== '/' && !/^\/(api|_next|assets|feed-media)/.test(h)))]);
const at = (p) => new RegExp(`^${p}$`);

for (const locale of process.env.NAV_FLOW_ONLY ? [] : ['fr-CA', 'en-CA']) {
  const tag = locale;
  const ctx = await browser.newContext({ locale, viewport: { width: 420, height: 880 } });
  await ctx.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: BASE }]);
  const page = await ctx.newPage();
  const bag = [];
  watch(page, bag);
  const go = (path) => () => page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });

  // 1. Logged out: public routes render, private ones send you to a door, unknown ones show the friendly 404
  for (const p of ['/', '/credits', '/offline', '/parent/login', '/parent/register', '/play']) await visit(page, bag, `${tag} out: open ${p}`, go(p));
  for (const [p, to] of [['/play/home', at('/play')], ['/play/feed', at('/play')], ['/parent', at('/parent/login')], ['/parent/account', at('/parent/login')], ['/parent/subscription', at('/parent/login')]]) {
    await visit(page, bag, `${tag} out: ${p} redirects to the door`, go(p), { expectUrl: to });
  }
  checks++;
  const r404 = await page.goto(`${BASE}/nope/never`, { waitUntil: 'domcontentloaded' });
  const homeBtn = page.locator('[data-error-kind="notfound"]').getByRole('button').first();
  const hasHome = await homeBtn.waitFor({ timeout: 8000 }).then(() => true, () => false);
  if (r404.status() === 404 && hasHome) console.log(`ok   ${tag} out: unknown URL shows a friendly 404 with a way home`);
  else fail(`${tag} out: 404 page`, `status ${r404.status()}, button ${hasHome}`);

  // 2. Grown-up
  await parentLogin(page, BASE);
  const kids = await page.evaluate(async () => (await fetch('/api/v1/children')).json());
  const cid = (Array.isArray(kids) ? kids : kids.items ?? kids.children ?? [])[0]?.id;
  const parentRoutes = ['/parent', '/parent/account', '/parent/subscription', '/parent/children/new', ...(cid ? [`/parent/children/${cid}`, `/parent/children/${cid}/settings`, `/parent/children/${cid}/report`, `/parent/children/${cid}/consent`] : [])];
  for (const p of parentRoutes) {
    await visit(page, bag, `${tag} parent: open ${p}`, go(p), { expectUrl: at(p) });
    await visit(page, bag, `${tag} parent: refresh ${p}`, () => page.reload({ waitUntil: 'domcontentloaded' }), { expectUrl: at(p) });
  }
  // every link found on the grown-up screens, followed by a click
  for (const p of ['/parent', '/parent/account', ...(cid ? [`/parent/children/${cid}`] : [])]) {
    await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle' });
    for (const h of await hrefsOf(page)) {
      await visit(page, bag, `${tag} parent: link ${h} from ${p}`, async () => {
        await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle' });
        await page.locator(`a[href="${h}"]`).first().click();
        await page.waitForURL((u) => u.pathname === h.split('?')[0], { timeout: 15000 });
      });
    }
  }
  await visit(page, bag, `${tag} parent: back button`, async () => {
    await page.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
    await page.goto(`${BASE}/parent/account`, { waitUntil: 'networkidle' });
    await page.goBack({ waitUntil: 'domcontentloaded' });
  }, { expectUrl: at('/parent') });

  // 3. Kid
  await kidEnter(page, BASE);
  // The first-visit tour would cover the tabs: mark it done for this kid
  const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
  await page.evaluate((id) => localStorage.setItem(`nx:onboarding:${id}`, 'done'), childId);
  // The welcome gift is a modal until it is claimed: claim it once so it never covers the tabs
  await page.evaluate((c) => fetch(`/api/v1/children/${c}/gift/claim`, { method: 'POST', headers: { 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() } }), childId);
  const kidRoutes = ['/play/home', '/play/worlds', '/play/feed', '/play/collection', '/play/me', '/play/challenges', '/play/quest', '/credits', "/play/journey/echecs"];
  for (const p of kidRoutes) {
    await visit(page, bag, `${tag} kid: open ${p}`, go(p), { expectUrl: at(p) });
    await visit(page, bag, `${tag} kid: refresh ${p}`, () => page.reload({ waitUntil: 'domcontentloaded' }), { expectUrl: at(p) });
  }
  // Guessed or old URLs for the Discover tab (the owner's "Feeds Not Found"): they all land on the real screen
  for (const p of ['/feed', '/feeds', '/discover', '/play/feeds', '/fr-CA/feed', '/en-CA/feeds', '/en/play/feed', '/fr/play/home']) {
    await visit(page, bag, `${tag} kid: old URL ${p} lands on a real screen`, go(p), { expectUrl: /^\/play\/(feed|home)$/ });
  }
  // bottom navigation: every tab, from every tab
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  const tabs = [...new Set(await page.locator('nav a[href^="/play/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href'))))];
  if (tabs.length < 5) fail(`${tag} kid: bottom nav`, `only ${tabs.length} tabs`);
  for (const from of tabs) {
    for (const to of tabs) {
      if (from === to) continue;
      await visit(page, bag, `${tag} kid: tab ${from} to ${to}`, async () => {
        await page.goto(`${BASE}${from}`, { waitUntil: 'domcontentloaded' });
        await page.locator(`nav a[href="${to}"]`).first().click();
        await page.waitForURL(`**${to}`, { timeout: 15000 });
      }, { expectUrl: at(to) });
    }
  }
  await visit(page, bag, `${tag} kid: back and forward`, async () => {
    await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
    await page.locator('nav a[href="/play/feed"]').first().click();
    await page.waitForURL('**/play/feed');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/play/home');
    await page.goForward({ waitUntil: 'domcontentloaded' });
  }, { expectUrl: at('/play/feed') });
  // language switch, then the Discover tab in the other language
  const other = locale === 'fr-CA' ? 'en-CA' : 'fr-CA';
  await visit(page, bag, `${tag} kid: switch language to ${other}, open Discover`, async () => {
    await page.goto(`${BASE}/play/me`, { waitUntil: 'networkidle' });
    await page.evaluate((v) => { document.cookie = `NEXT_LOCALE=${v}; path=/; max-age=31536000; samesite=lax`; }, other);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('nav a[href="/play/feed"]').first().click();
    await page.waitForURL('**/play/feed');
  }, { expectUrl: at('/play/feed') });
  await ctx.close();
}

// 4. World flow (T048): world -> journey -> chapter -> question -> (retry) -> reveal -> continue, per world and grade, at several sizes.
// fr-CA only (same screens); grade kids Nav1 to Nav4 are created through the API when missing.
const ALL_KIDS = [[1, 'Nav1', '1111'], [2, 'Nav2', '2222'], [3, 'Nav3', '3333'], [4, 'Nav4', '4444']];
const GRADE_KIDS = ALL_KIDS.filter(([g]) => !process.env.NAV_GRADES || process.env.NAV_GRADES.split(',').includes(String(g)));
const FLOW_WORLDS = process.env.NAV_WORLDS ? process.env.NAV_WORLDS.split(',') : ['echecs', 'medecine', 'espace'];
const SIZES = { phone: [390, 800], tablet: [820, 1180], desktop: [1366, 768], tv: [1920, 1080], short: [900, 420] };
const stat = { retried: 0, reviewed: 0 };

async function answerOnce(page) {
  const kind = await page.evaluate(() => {
    const q = (x) => document.querySelector(x);
    if (q('[role=group][aria-label="Clavier numérique"]')) return q('[role=group][aria-label="Clavier numérique"] button:not([disabled])') ? 'keypad' : null;
    if (q('ol[aria-label="Ton ordre"]')) return q('[role=group][aria-label="Cartes à placer"] button') ? 'order' : null;
    if (q('ul[aria-label="Cartes de gauche"]')) return q('ul[aria-label="Cartes de gauche"] button:not([disabled])') ? 'match' : null;
    if (q('[role=slider]')) return 'estimate';
    return document.querySelector('main button[data-state=idle]') ? 'choice' : null;
  });
  if (!kind) return false;
  const click = (name) => page.getByRole('button', { name }).first().click({ timeout: 4000 });
  if (kind === 'keypad') {
    await click(/^4$/);
    await click(/vérifier|suivant/i);
  } else if (kind === 'estimate') {
    await click(/vérifier|suivant/i);
  } else if (kind === 'order') {
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
  } else await page.locator('main button[data-state=idle]').last().click(); // the last card is rarely the right one: exercises the retry
  return true;
}

async function worldFlow(browser, { grade, name, pin, worlds, size, questions }) {
  const tag = `flow g${grade} ${size}`;
  const [width, height] = SIZES[size];
  const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width, height } });
  await ctx.addCookies([{ name: 'NEXT_LOCALE', value: 'fr-CA', url: BASE }]);
  const page = await ctx.newPage();
  const bag = [];
  watch(page, bag);
  await parentLogin(page, BASE);
  await kidEnter(page, BASE, name, pin);
  const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
  await page.evaluate((id) => localStorage.setItem(`nx:onboarding:${id}`, 'done'), childId);
  await page.evaluate((c) => fetch(`/api/v1/children/${c}/gift/claim`, { method: 'POST', headers: { 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() } }), childId);
  for (const world of worlds) {
    await visit(page, bag, `${tag} ${world}: world card opens its journey, nav bar intact`, async () => {
      await page.goto(`${BASE}/play/worlds`, { waitUntil: 'networkidle' });
      await page.locator(`[data-world="${world}"]`).click({ timeout: 15000 });
      await page.waitForURL(`**/play/journey/${world}`, { timeout: 15000 });
      await page.locator('ol button[data-state]').first().waitFor({ timeout: 15000 });
      if (width < 1024 && (await page.locator('nav a[href^="/play/"]').count()) < 5) throw new Error('bottom nav changed');
    });
    await visit(page, bag, `${tag} ${world}: journey back button returns to the worlds`, async () => {
      await page.getByRole('button', { name: /retour|back/i }).first().click({ timeout: 8000 });
      await page.waitForURL('**/play/worlds', { timeout: 15000 });
      await page.locator(`[data-world="${world}"]`).click();
      await page.waitForURL(`**/play/journey/${world}`, { timeout: 15000 });
      await page.locator('ol button[data-state]').first().waitFor({ timeout: 15000 });
    });
    await visit(page, bag, `${tag} ${world}: ${questions} questions with retry, reveal, continue, previous answer, leave`, async () => {
      await page.getByRole('button', { name: /^(jouer|play)$/i }).first().click({ timeout: 8000 }); // "Jouer" picks the next quest, locked ones stay closed
      await page.waitForURL('**/play/session/*', { timeout: 20000 });
      for (let q = 0; q < questions; q++) {
        if (/\/done/.test(page.url())) return;
        // A reward moment (new power, streak, card) sits between two questions: it has its own Continue and no input.
        for (let i = 0; i < 4 && (await page.locator('#reward-title').count()); i++) {
          await page.getByRole('button', { name: /^(continuer|terminer|suite)$/i }).first().click({ timeout: 6000 });
          await page.waitForTimeout(400);
        }
        const prev = page.getByRole('button', { name: /revoir la réponse précédente/i });
        await page.locator('main button[data-state=idle], [role=group][aria-label="Clavier numérique"], [role=group][aria-label="Cartes à placer"], ul[aria-label="Cartes de gauche"], [role=slider]').first().waitFor({ timeout: 20000 }).catch(async () => {
          throw new Error(`question ${q + 1}: no input on screen at ${page.url().replace(BASE, '')}: ${(await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 220)}`);
        });
        if (q === 0) {
          if (await prev.count()) throw new Error('previous-answer button on question 1');
        } else {
          await prev.first().waitFor({ timeout: 15000 });
          await prev.first().click();
          await page.getByRole('dialog').waitFor({ timeout: 5000 });
          await page.keyboard.press('Escape');
          await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 5000 });
          stat.reviewed++;
        }
        const deadline = Date.now() + 30000;
        let answered = false;
        let retried = false;
        while (Date.now() < deadline) {
          if (await page.locator('[data-error-code]').count()) throw new Error('error screen during play');
          const cont = page.getByRole('button', { name: /^(continuer|terminer|suite)$/i });
          if (answered && (await cont.count()) && (await cont.first().isEnabled())) {
            await cont.first().click();
            break;
          }
          if (await page.locator('[data-retry-moment]').count()) {
            if (!retried) {
              retried = true;
              stat.retried++;
            }
            await page.waitForTimeout(300);
            await answerOnce(page); // second try: the first card stays disabled, so this is a different one
            continue;
          }
          if (!answered && (await answerOnce(page))) answered = true;
          else await page.waitForTimeout(250);
        }
        if (!answered) throw new Error(`question ${q + 1}: nothing to answer (dead end?)`);
      }
      // A short chapter ends on the done screen: rewards, then a way back. Otherwise leave through the X.
      await page.waitForTimeout(800);
      if (/\/done/.test(page.url())) {
        const back = page.getByRole('button', { name: /retour à mon chemin/i });
        for (let i = 0; i < 8 && !(await back.count()); i++) {
          await page.getByRole('button', { name: /^continuer$/i }).first().click({ timeout: 6000 }).catch(() => {});
          await page.waitForTimeout(400);
        }
        await back.first().click({ timeout: 8000 });
        await page.waitForURL('**/play/home', { timeout: 15000 });
        return;
      }
      await page.getByRole('button', { name: /quitter la partie/i }).first().click();
      await page.getByRole('dialog').getByRole('button', { name: /quitter la partie/i }).click();
      await page.waitForURL('**/play/home', { timeout: 15000 });
    });
  }
  await ctx.close();
}

{
  const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 420, height: 880 } });
  const page = await ctx.newPage();
  const bag = [];
  watch(page, bag);
  await parentLogin(page, BASE);
  const existing = await page.evaluate(async () => {
    const r = await (await fetch('/api/v1/children')).json();
    return (r.items ?? r).map((c) => c.display_name);
  });
  for (const [grade, name, pin] of ALL_KIDS) {
    if (existing.includes(name)) continue;
    await page.evaluate(async ([g, n, p]) => {
      const res = await fetch('/api/v1/children', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ display_name: n, grade: g, avatar_id: 'fox', pin: p }) });
      const c = await res.json();
      await fetch('/api/v1/auth/consent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ child_id: c.id, version: '2026-10', accepted: true }) });
    }, [grade, name, pin]);
  }
  await kidEnter(page, BASE, ALL_KIDS[1][1], ALL_KIDS[1][2]);
  // Inactive worlds are never reachable: not on the map, and typing the address sends the child back to the map
  await visit(page, bag, 'flow: inactive worlds are not on the map', async () => {
    await page.goto(`${BASE}/play/worlds`, { waitUntil: 'networkidle' });
    for (const w of ['histoires', 'english', 'francais']) if (await page.locator(`[data-world="${w}"]`).count()) throw new Error(`${w} is listed`);
  });
  for (const w of ['histoires', 'english', 'francais']) {
    await visit(page, bag, `flow: typing /play/journey/${w} is not a dead end`, async () => {
      await page.goto(`${BASE}/play/journey/${w}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => location.pathname === '/play/worlds' || document.querySelector('main button, main a'), null, { timeout: 15000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      bag.length = 0; // the API refuses a closed world (422) and its picture is absent: that is the expected way out
    });
  }
  // Error screens always offer a way back
  await visit(page, bag, 'flow: an unknown chapter shows an error with a way back', async () => {
    await page.goto(`${BASE}/play/session/does-not-exist`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /retour|back/i }).first().waitFor({ timeout: 15000 });
    bag.length = 0; // the 404 of that session is the point of the check
    await page.getByRole('button', { name: /retour|back/i }).first().click();
    await page.waitForURL('**/play/home', { timeout: 15000 });
  });
  await ctx.close();
}
for (const [grade, name, pin] of GRADE_KIDS) await worldFlow(browser, { grade, name, pin, worlds: FLOW_WORLDS, size: 'phone', questions: 3 });
for (const size of process.env.NAV_PHONE_ONLY ? [] : ['tablet', 'desktop', 'tv', 'short']) await worldFlow(browser, { grade: 2, name: 'Nav2', pin: '2222', worlds: ['espace'], size, questions: 2 });
console.log(`flow: ${stat.retried} retry moments and ${stat.reviewed} previous-answer dialogs exercised`);

await browser.close();
console.log(fails ? `${fails} FAILED of ${checks}` : `all ${checks} navigation checks pass`);
process.exit(fails ? 1 : 0);
