// T060: a child sees only the worlds enabled for them; a parent can switch on only worlds an admin marked ready;
// the inactive worlds (histoires, english, francais) are never visible. No locked wall.
// Usage: node scripts/qa/worlds-visibility.mjs [appUrl] [apiUrl]   (seeded stack, see scripts/test.sh)
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
    headers: { authorization: `Bearer ${ADMIN}`, 'content-type': 'application/json', 'x-admin-actor': 'qa-worlds' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(j).slice(0, 120)}`);
  return j;
}
const INACTIVE = /histoires africaines|african stories|^english$|^français$|^french$/i;

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 1000, height: 900 } });
const page = await ctx.newPage();
await parentLogin(page, BASE);
await kidEnter(page, BASE);
const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
const oldPlatform = await admin('GET', '/appconfig/platform');
try {
  // ── child ──
  await page.goto(`${BASE}/play/worlds`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 });
  const settings = await page.evaluate(async (c) => (await fetch(`/api/v1/children/${c}/settings`, { headers: { 'x-nx-mode': 'child' } })).json(), childId);
  const cards = await page.locator('main ul > li').count();
  ok('child worlds page shows exactly the enabled worlds', cards === settings.enabled_worlds.length, `${cards} cards, enabled ${settings.enabled_worlds.length}`);
  ok('no disabled-worlds wall or lock text', (await page.getByText(/mondes désactivés|ce monde dort/i).count()) === 0);
  ok('inactive worlds never appear', (await page.locator('main').getByText(INACTIVE).count()) === 0);

  // ── parent ──
  await page.goto(`${BASE}/parent/login`, { waitUntil: 'domcontentloaded' });
  await parentLogin(page, BASE).catch(() => {});
  await page.goto(`${BASE}/parent/children/${childId}/settings`, { waitUntil: 'networkidle' });
  const sw = page.getByRole('switch');
  await sw.first().waitFor({ timeout: 15000 });
  const worldNames = async () => (await page.locator('section, div').filter({ has: page.getByText(/mondes/i) }).last().getByRole('switch').allInnerTexts()).length;
  const names = async () => page.getByRole('switch').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || e.closest('label')?.textContent || ''));
  const all = await names();
  ok('parent sees no inactive world toggle', !all.some((n) => INACTIVE.test(n.trim())), all.join('|'));
  const before = (await page.getByRole('switch').count());
  void worldNames;
  // an admin marks one more published world ready: its toggle appears
  const cfg = oldPlatform;
  await admin('PUT', '/appconfig/platform', { value: { ...cfg.value, ready_worlds: [...new Set([...(cfg.value.ready_worlds ?? ['echecs', 'medecine', 'espace']), 'ocean'])] }, expected_version: cfg.version });
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/parent/children/${childId}/settings`, { waitUntil: 'networkidle' });
  await p2.getByRole('switch').first().waitFor({ timeout: 15000 });
  ok('ready flag adds a toggle', (await p2.getByRole('switch').count()) === before + 1, `${before} -> ${await p2.getByRole('switch').count()}`);
  await p2.close();
} finally {
  const cur = await admin('GET', '/appconfig/platform');
  await admin('PUT', '/appconfig/platform', { value: oldPlatform.value, expected_version: cur.version }).catch((e) => console.log('restore failed', e.message));
  await browser.close();
}
console.log(fails ? `${fails} FAILED` : 'all world visibility checks pass');
process.exit(fails ? 1 : 0);
