// Manual walk of the failure scenarios: every one must show a visible message with a way forward.
// Usage: node scripts/smoke-errors.mjs [outDir]   (dev server on :3000, Go API on :8081)
import { chromium } from 'playwright';
import { scenario } from './lib/scenario.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? 'smoke-error-shots';
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 420, height: 880 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
let results = [];

const setScenario = (value) => scenario(ctx, value);
async function check(name, fn) {
  try {
    await fn();
    results.push(`ok   ${name}`);
  } catch (e) {
    results.push(`FAIL ${name}: ${e.message.split('\n')[0]}`);
    await page.screenshot({ path: join(OUT, `FAIL-${name.replace(/\W+/g, '-')}.png`) }).catch(() => {});
  }
}
async function login() {
  await page.goto(`${BASE}/parent/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/courriel/i).fill('demo@numerix.dev');
  await page.getByLabel(/mot de passe/i).fill('correct-horse-battery');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.waitForURL('**/parent');
}
async function enterChild() {
  await page.goto(`${BASE}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Zoé/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  for (const d of ['1', '2', '3', '4']) await dialog.getByRole('button', { name: new RegExp(`^${d}$`) }).first().click();
  await page.waitForURL('**/play/home');
  const close = page.getByRole('button', { name: /passer|ignorer/i });
  await close.first().waitFor({ timeout: 8000 }).catch(() => {});
  if (await close.count()) await close.first().click();
}

await check('wrong password shows an inline message', async () => {
  await page.goto(`${BASE}/parent/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/courriel/i).fill('demo@numerix.dev');
  await page.getByLabel(/mot de passe/i).fill('wrong-password');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.getByText(/incorrect/i).waitFor({ timeout: 8000 });
  await page.screenshot({ path: join(OUT, 'wrong-password.png') });
});

await login();

await check('backend down is announced as our problem, with a retry', async () => {
  await setScenario('network-error');
  await page.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
  await page.getByText(/le problème vient de nous/i).first().waitFor({ timeout: 10000 });
  await page.getByText(/ce n.est pas ta connexion/i).first().waitFor({ timeout: 3000 });
  await page.getByRole('button', { name: /réessayer/i }).first().waitFor({ timeout: 3000 });
  await page.screenshot({ path: join(OUT, 'network-error.png') });
});

await check('server error is announced', async () => {
  await setScenario('server-error');
  await page.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
  await page.getByText(/problème est survenu/i).first().waitFor({ timeout: 10000 });
  await page.screenshot({ path: join(OUT, 'server-error.png') });
});

await check('rate limit is announced', async () => {
  await setScenario('rate-limited');
  await page.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
  await page.getByText(/doucement/i).first().waitFor({ timeout: 10000 });
});

await setScenario(null);
await enterChild();

await check('daily limit explains itself', async () => {
  await setScenario('daily-limit');
  await page.getByRole('button', { name: /jouer/i }).first().click();
  await page.getByRole('dialog').getByText(/assez pour aujourd/i).waitFor({ timeout: 10000 });
  await page.screenshot({ path: join(OUT, 'daily-limit.png') });
  await page.getByRole('button', { name: /d.accord/i }).click();
});

// Which side is down? Three situations on a fresh login form, each must name its own cause.
async function loginAttempt(setup) {
  const c = await browser.newContext({ locale: 'fr-CA', viewport: { width: 420, height: 880 } });
  const p = await c.newPage();
  await p.goto(`${BASE}/parent/login`, { waitUntil: 'networkidle' });
  await setup(c, p);
  await p.getByLabel(/courriel/i).fill('demo@numerix.dev');
  await p.getByLabel(/mot de passe/i).fill('correct-horse-battery');
  await p.getByRole('button', { name: /se connecter/i }).click();
  return { c, p };
}
await check('device offline: says it is the connection', async () => {
  const { c, p } = await loginAttempt(async (ctx2) => ctx2.setOffline(true));
  await p.getByText(/ton appareil est hors ligne/i).waitFor({ timeout: 10000 });
  await p.screenshot({ path: join(OUT, 'cause-device-offline.png') });
  await c.close();
});
await check('app unreachable while online: says it cannot tell', async () => {
  const { c, p } = await loginAttempt(async (_c, page2) => {
    await page2.route('**/api/**', (route) => route.abort('connectionfailed'));
  });
  await p.getByText(/on n.arrive pas à joindre numerix/i).waitFor({ timeout: 10000 });
  await p.screenshot({ path: join(OUT, 'cause-app-unreachable.png') });
  await c.close();
});
await check('backend down: says it is on us and not the connection', async () => {
  const { c, p } = await loginAttempt(async (ctx2) => scenario(ctx2, 'network-error'));
  await p.getByText(/le problème vient de nous/i).first().waitFor({ timeout: 10000 });
  await p.getByText(/ce n.est pas ta connexion/i).first().waitFor({ timeout: 3000 });
  await p.screenshot({ path: join(OUT, 'cause-backend-down.png') });
  await c.close();
});

console.log(results.join('\n'));
console.log('page errors:', pageErrors.length ? pageErrors.join(' | ') : 'none');
await browser.close();
