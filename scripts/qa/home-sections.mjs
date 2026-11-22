// T059: the child home shows Defis, Decouvrir and Defi du jour only when the admin turned them on
// (feed.home_sections, default off). The child nav bar keeps its entries either way.
// Usage: node scripts/qa/home-sections.mjs [appUrl] [apiUrl]   (seeded stack, see scripts/test.sh)
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from '../lib/kid.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3300').replace(/\/$/, '');
const API = (process.argv[3] ?? 'http://localhost:8300').replace(/\/$/, '');
const ADMIN = process.env.ADMIN_API_TOKEN ?? 'dev-admin-token';
let fails = 0;
const ok = (n, c, x = '') => {
  console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${c ? '' : ' ' + x}`);
  if (!c) fails++;
};
async function admin(method, path, body) {
  const r = await fetch(`${API}/admin/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${ADMIN}`, 'content-type': 'application/json', 'x-admin-actor': 'qa-home' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(j).slice(0, 120)}`);
  return j;
}
async function setSections(home_sections) {
  const cur = await admin('GET', '/appconfig/feed');
  await admin('PUT', '/appconfig/feed', { value: { ...cur.value, home_sections }, expected_version: cur.version });
  return cur.value;
}
async function restore(value) {
  const cur = await admin('GET', '/appconfig/feed');
  await admin('PUT', '/appconfig/feed', { value, expected_version: cur.version });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await parentLogin(page, BASE);
await kidEnter(page, BASE);
const old = await setSections({ challenges: false, discover: false, daily_quest: false });
// the first-visit tour and the welcome gift hide the page from the accessibility tree until dismissed
async function clearOverlays(p) {
  await p.getByRole('button', { name: /passer la visite/i }).first().click({ timeout: 6000 }).catch(() => {});
  await p.getByRole('button', { name: /plus tard/i }).first().click({ timeout: 3000 }).catch(() => {});
}
// what the home shows now: tiles inside <main> only (the nav bar sits outside it)
async function seen() {
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  await clearOverlays(page);
  await page.getByRole('button', { name: /mondes/i }).first().waitFor({ timeout: 15000 });
  const main = page.locator('main');
  return {
    challenges: await main.getByRole('button', { name: /défis/i }).count(),
    discover: await main.getByRole("button", { name: /^découvrir(?! ce monde)/i }).count(),
    quest: await main.getByText(/défi du jour/i).count(),
    worlds: await main.getByRole('button', { name: /mondes/i }).count(),
  };
}
try {
  // the cache of the public config is 60 s in the app: reload after each change with a fresh context page
  let s = await seen();
  ok('default off: no Defis tile', s.challenges === 0, JSON.stringify(s));
  ok('default off: no Decouvrir tile', s.discover === 0, JSON.stringify(s));
  ok('default off: no Defi du jour card or tile', s.quest === 0, JSON.stringify(s));
  ok('default off: Mondes tile still there', s.worlds > 0);
  ok('nav bar keeps its Decouvrir entry', (await page.getByRole('link', { name: /découvrir/i }).count()) > 0);
  for (const [key, field] of [['challenges', 'challenges'], ['discover', 'discover'], ['daily_quest', 'quest']]) {
    await setSections({ challenges: false, discover: false, daily_quest: false, [key]: true });
    // a new page object avoids the 60 s query cache of the old one
    const p2 = await ctx.newPage();
    await p2.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
    await clearOverlays(p2);
    const main = p2.locator('main');
    await main.getByRole('button', { name: /mondes/i }).first().waitFor({ timeout: 15000 });
    const now = {
      challenges: await main.getByRole('button', { name: /défis/i }).count(),
      discover: await main.getByRole("button", { name: /^découvrir(?! ce monde)/i }).count(),
      quest: await main.getByText(/défi du jour/i).count(),
    };
    ok(`${key} on: its block shows`, now[field] > 0, JSON.stringify(now));
    ok(`${key} on: the other blocks stay off`, Object.entries(now).every(([k, v]) => k === field || v === 0), JSON.stringify(now));
    await p2.close();
  }
} finally {
  await restore(old).catch((e) => console.log('restore failed', e.message));
  await browser.close();
}
console.log(fails ? `${fails} FAILED` : 'all home section checks pass');
process.exit(fails ? 1 : 0);
