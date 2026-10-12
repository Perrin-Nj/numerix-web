// Error screens: one line per check, no screenshots. A screen must never stay idle.
// Usage: node scripts/ui-error-checks.mjs [baseUrl]   (app on :3000 with the mock backend)
import { chromium } from 'playwright';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 420, height: 880 } });
const page = await ctx.newPage();
let fails = 0;
const T = { timeout: 12000 };

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    fails++;
    console.log(`FAIL ${name}: ${e.message.split('\n')[0].slice(0, 400)}`);
  }
}
async function scenario(value) {
  await ctx.clearCookies({ name: 'nx_mock_scenario' });
  if (value) await ctx.addCookies([{ name: 'nx_mock_scenario', value, url: BASE }]);
}

await check('404 page offers Home and Back', async () => {
  await page.goto(`${BASE}/does-not-exist`, { waitUntil: 'domcontentloaded' });
  const screen = page.locator('[data-error-kind="notfound"]');
  await screen.getByRole('button', { name: /retour à l.accueil/i }).waitFor(T);
  await screen.getByRole('button', { name: /^retour$/i }).waitFor(T);
});

await check('grown-up logs in', async () => {
  await page.goto(`${BASE}/parent/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/courriel/i).fill('parent@example.com');
  await page.getByLabel(/mot de passe/i).fill('correct-horse-battery');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.waitForURL('**/parent', T);
});

await check('forced API failure shows the error screen with Retry', async () => {
  await scenario('server-error');
  await page.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' });
  const screen = page.locator('[data-error-kind]').first();
  await screen.getByRole('button', { name: /réessayer/i }).waitFor(T);
  await screen.getByRole('button', { name: /^retour$/i }).waitFor(T);
  await screen.getByRole('button', { name: /accueil/i }).waitFor(T);
});

await check('offline shows the offline variant', async () => {
  await ctx.setOffline(true);
  await page.locator('[data-error-kind]').first().getByRole('button', { name: /réessayer/i }).click();
  await page.locator('[data-error-kind="offline"]').waitFor(T);
  await ctx.setOffline(false);
});

await check('a never-answering endpoint shows the timeout panel within 10 s', async () => {
  await scenario(null);
  await page.route('**/api/v1/children*', (route) => setTimeout(() => route.abort().catch(() => {}), 20000));
  await page.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' });
  const start = Date.now(); // page is up; the clock measures only the wait
  await page.locator('[role="status"][data-error-kind="timeout"]').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /réessayer/i }).first().waitFor({ timeout: 2000 });
  if (Date.now() - start > 10000) throw new Error('too slow');
  await page.unroute('**/api/v1/children*');
});

await browser.close();
console.log(fails ? `${fails} FAILED` : 'all error checks pass');
process.exit(fails ? 1 : 0);
