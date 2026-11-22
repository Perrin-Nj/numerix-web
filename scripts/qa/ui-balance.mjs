// UI balance check (FR-032, FR-041, FR-042): at every width from 320 to 3840, on every parent, child and public screen,
// (a) nothing scrolls sideways, (b) the content block sits centred in the page, (c) inside a panel, cards and chip groups use the
// panel width instead of hugging one side with a void on the other.
// Usage: node scripts/qa/ui-balance.mjs [baseUrl]
// Env: UIB_PASSWORD, UIB_EMAIL (parent), UIB_KID, UIB_PIN (child, default Noé 4321 from seed-dev), UIB_SHOTS=dir (jpeg per screen and width),
//      UIB_QUICK=1 (fewer widths), UIB_FULL=1 (dark and en-CA too), UIB_ADMIN=url + UIB_ADMIN_PASSWORD (admin app), UIB_MAX_VOID (share, default 0.3)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { EMAIL, PASSWORD, kidEnter } from '../lib/kid.mjs';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const SHOTS = process.env.UIB_SHOTS;
const MAX_VOID = Number(process.env.UIB_MAX_VOID ?? 0.3);
const SIZES = [[320, 640], [360, 740], [390, 844], [844, 390], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440], [3840, 2160]];
const QUICK = [[320, 640], [390, 844], [768, 1024], [1280, 720], [1920, 1080], [3840, 2160]];
const sizes = process.env.UIB_QUICK ? QUICK : SIZES;
const combos = process.env.UIB_FULL ? [['fr-CA', 'light'], ['en-CA', 'dark']] : [['fr-CA', 'light']];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const T = { timeout: 20000 };

// In the page: returns problems for the current screen. shortcut: the card selectors are the shared primitives (SwitchRow label,
// ChoiceChips group, Panel section); a new card type must carry data-card to be measured.
function measure(maxVoid) {
  const out = [];
  const vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push(`horizontal scroll ${document.documentElement.scrollWidth}>${vw}`);
  const main = document.querySelector('main') ?? document.body;
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null; };
  // page level: the blocks of main must be centred (left margin close to right margin) at any width
  const blocks = [...main.querySelectorAll(':scope > *, :scope > * > *')].map(vis).filter((r) => r && r.width >= Math.min(200, vw * 0.5));
  if (blocks.length) {
    const l = Math.min(...blocks.map((r) => r.left));
    const r = Math.max(...blocks.map((b) => b.right));
    const off = Math.abs(l - (vw - r));
    if (off > Math.max(24, vw * 0.04)) out.push(`content off-centre: left ${Math.round(l)} right ${Math.round(vw - r)}`);
  }
  // panel level: cards in a panel must span most of the panel's inner width, and share one width per column
  for (const sec of main.querySelectorAll('section, [data-panel]')) {
    const sr = vis(sec);
    if (!sr || sr.width < 480) continue;
    const cards = [...sec.querySelectorAll('label, [role=group], [data-card]')].filter((c) => !c.closest('[role=dialog]') && !c.querySelector('label, [role=group]')).map(vis).filter((r) => r && r.width >= 120);
    if (!cards.length) continue;
    const l = Math.min(...cards.map((r) => r.left));
    const r = Math.max(...cards.map((c) => c.right));
    const inner = sr.width - 40;
    const unused = 1 - (r - l) / inner;
    if (unused > maxVoid) out.push(`cards use ${Math.round((1 - unused) * 100)}% of panel "${(sec.getAttribute('aria-label') ?? sec.querySelector('h2')?.textContent ?? '').slice(0, 30)}"`);
    const lo = l - sr.left;
    const ro = sr.right - r;
    if (Math.abs(lo - ro) > Math.max(24, sr.width * 0.08)) out.push(`cards off-centre in panel "${(sec.querySelector('h2')?.textContent ?? '').slice(0, 30)}": ${Math.round(lo)} vs ${Math.round(ro)}`);
  }
  return out;
}

// wait until the page height stops changing, so late data (settings, plans) is in before measuring
async function settle(page) {
  let last = -1;
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(250);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    if (h === last && i > 1) return;
    last = h;
  }
}

let fails = 0;
let checks = 0;
async function visit(page, name, path, ctxTag) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', ...T }).catch(() => {});
  await settle(page);
  for (const [w, h] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await settle(page);
    const problems = await page.evaluate(measure, MAX_VOID);
    checks++;
    const tag = `${name} ${w}x${h}${ctxTag}`;
    if (problems.length) { fails++; console.log(`FAIL ${tag}: ${problems.join('; ')}`); } else console.log(`ok   ${tag}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${w}x${h}${ctxTag}.jpg`, type: 'jpeg', quality: 60, fullPage: true }).catch(() => {});
  }
}

const browser = await chromium.launch();
async function ctxFor([locale, scheme]) {
  const ctx = await browser.newContext({ locale, colorScheme: scheme, viewport: { width: 390, height: 844 } });
  await ctx.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: BASE }]);
  await ctx.addInitScript(() => { try { localStorage.setItem('nx:tour:v1', 'done'); } catch { /* storage blocked */ } });
  return ctx;
}

for (const combo of combos) {
  const tag = combos.length > 1 ? `-${combo[0]}-${combo[1]}` : '';
  const ctx = await ctxFor(combo);
  const page = await ctx.newPage();
  // public screens
  for (const [n, p] of [['welcome', '/'], ['login', '/parent/login'], ['register', '/parent/register'], ['credits', '/credits']]) await visit(page, n, p, tag);
  // parent
  await page.goto(`${BASE}/parent/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/courriel|e-mail|email/i).first().fill(process.env.UIB_EMAIL ?? EMAIL);
  await page.getByLabel(/mot de passe|password/i).first().fill(process.env.UIB_PASSWORD ?? PASSWORD);
  await page.getByRole('button', { name: /se connecter|log in|sign in/i }).first().click();
  await page.waitForURL('**/parent', T);
  await visit(page, 'parent-home', '/parent', tag);
  const href = await page.locator('a[href^="/parent/children/"]').first().getAttribute('href');
  const cid = href?.match(/children\/([^/?#]+)/)?.[1];
  const parentRoutes = [['parent-account', '/parent/account'], ['parent-subscription', '/parent/subscription'], ['parent-child-new', '/parent/children/new']];
  if (cid) parentRoutes.push(['child-overview', `/parent/children/${cid}`], ['child-settings', `/parent/children/${cid}/settings`], ['child-consent', `/parent/children/${cid}/consent`], ['child-report', `/parent/children/${cid}/report`]);
  for (const [n, p] of parentRoutes) await visit(page, n, p, tag);
  // child
  await visit(page, 'profile-picker', '/play', tag);
  await page.setViewportSize({ width: 390, height: 844 });
  await kidEnter(page, BASE, new RegExp(process.env.UIB_KID ?? 'Noé').source, process.env.UIB_PIN ?? '4321');
  for (const [n, p] of [['kid-home', '/play/home'], ['kid-worlds', '/play/worlds'], ['kid-journey', '/play/journey/echecs'], ['kid-me', '/play/me'], ['kid-challenges', '/play/challenges'], ['kid-collection', '/play/collection'], ['kid-quest', '/play/quest']]) await visit(page, n, p, tag);
  await ctx.close();
}

if (process.env.UIB_ADMIN) {
  const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const A = process.env.UIB_ADMIN.replace(/\/$/, '');
  await page.goto(`${A}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=password]').fill(process.env.UIB_ADMIN_PASSWORD ?? '');
  await page.locator('form button[type=submit], form button').first().click();
  await page.waitForURL((u) => !/login/.test(u.pathname), T);
  const saved = BASE;
  for (const p of ['', 'children', 'parents', 'questions', 'config', 'music', 'voice-settings', 'plans', 'notifications', 'audit', 'maintenance', 'media', 'scenes', 'feed']) {
    await page.goto(`${A}/${p}`, { waitUntil: 'networkidle' }).catch(() => {});
    for (const [w, h] of sizes) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(200);
      const problems = await page.evaluate(measure, MAX_VOID);
      checks++;
      const nm = `admin-${p || 'home'}`;
      if (problems.length) { fails++; console.log(`FAIL ${nm} ${w}x${h}: ${problems.join('; ')}`); }
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${nm}-${w}x${h}.jpg`, type: 'jpeg', quality: 60, fullPage: true }).catch(() => {});
    }
  }
  void saved;
  await ctx.close();
}
await browser.close();
console.log(`${checks - fails}/${checks} ui-balance checks passed`);
process.exit(fails ? 1 : 0);
