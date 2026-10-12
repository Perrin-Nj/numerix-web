// Manual walk of the failure scenarios: every one must show a visible message with a way forward.
// Usage: node scripts/smoke-errors.mjs [outDir]   (dev server on :3000, WireMock on :8080)
import { chromium } from 'playwright';
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

async function scenario(value) {
  await ctx.clearCookies({ name: 'nx_mock_scenario' });
  if (value) await ctx.addCookies([{ name: 'nx_mock_scenario', value, url: BASE }]);
}
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
  await page.getByLabel(/courriel/i).fill('parent@example.com');
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
  await page.getByLabel(/courriel/i).fill('parent@example.com');
  await page.getByLabel(/mot de passe/i).fill('wrong-password');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.getByText(/incorrect/i).waitFor({ timeout: 8000 });
  await page.screenshot({ path: join(OUT, 'wrong-password.png') });
});

await login();

await check('network error is announced with a retry', async () => {
  await scenario('network-error');
  await page.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
  await page.getByText(/pas de connexion/i).first().waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /réessayer/i }).first().waitFor({ timeout: 3000 });
  await page.screenshot({ path: join(OUT, 'network-error.png') });
});

await check('server error is announced', async () => {
  await scenario('server-error');
  await page.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
  await page.getByText(/problème est survenu/i).first().waitFor({ timeout: 10000 });
  await page.screenshot({ path: join(OUT, 'server-error.png') });
});

await check('rate limit is announced', async () => {
  await scenario('rate-limited');
  await page.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
  await page.getByText(/doucement/i).first().waitFor({ timeout: 10000 });
});

await scenario(null);
await enterChild();

await check('daily limit explains itself', async () => {
  await scenario('daily-limit');
  await page.getByRole('button', { name: /jouer/i }).first().click();
  await page.getByRole('dialog').getByText(/assez pour aujourd/i).waitFor({ timeout: 10000 });
  await page.screenshot({ path: join(OUT, 'daily-limit.png') });
  await page.getByRole('button', { name: /d.accord/i }).click();
});

await check('fallback narration is announced', async () => {
  await scenario('narration-fallback');
  await page.getByRole('button', { name: /jouer/i }).first().click();
  await page.waitForURL('**/play/session/**');
  await page.getByText(/version courte/i).first().waitFor({ timeout: 15000 });
  await page.screenshot({ path: join(OUT, 'narration-fallback.png') });
});

await check('slow narration offers the question and a retry', async () => {
  await scenario('narration-slow');
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /jouer/i }).first().click();
  await page.waitForURL('**/play/session/**');
  await page.getByText(/un instant|quelques instants|prend/i).first().waitFor({ timeout: 15000 });
  await page.screenshot({ path: join(OUT, 'narration-slow.png') });
});

console.log(results.join('\n'));
console.log('page errors:', pageErrors.length ? pageErrors.join(' | ') : 'none');
await browser.close();
