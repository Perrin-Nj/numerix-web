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
    fail(name, e.message.split('\n')[0].slice(0, 200));
  }
}

const hrefsOf = (page) => page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0]).filter((h) => h && h !== '/' && !/^\/(api|_next|assets|feed-media)/.test(h)))]);
const at = (p) => new RegExp(`^${p}$`);

for (const locale of ['fr-CA', 'en-CA']) {
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
  const worlds = await page.evaluate(async () => { const w = await (await fetch('/api/v1/worlds', { headers: { 'x-nx-mode': 'child' } })).json(); return (w.items ?? w.worlds ?? w).map((x) => x.id); });
  const kidRoutes = ['/play/home', '/play/worlds', '/play/feed', '/play/collection', '/play/me', '/play/challenges', '/play/quest', '/credits', ...(worlds[0] ? [`/play/journey/${worlds[0]}`] : [])];
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
await browser.close();
console.log(fails ? `${fails} FAILED of ${checks}` : `all ${checks} navigation checks pass`);
process.exit(fails ? 1 : 0);
