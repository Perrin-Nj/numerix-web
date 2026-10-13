// Manual smoke walk of the real app against the mock backend (not a unit test).
// Usage: node scripts/smoke.mjs [outDir] [locale]   (dev server on :3000, WireMock on :8080)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? 'smoke-shots';
const LOCALE = process.argv[3] ?? 'fr-CA';
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: LOCALE, viewport: { width: 420, height: 880 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) problems.push(`[console.${m.type()}] ${m.text().slice(0, 300)}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message.slice(0, 300)}`));
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('/_next/')) problems.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`);
});

let step = 0;
async function shot(name) {
  step += 1;
  await page.screenshot({ path: join(OUT, `${String(step).padStart(2, '0')}-${name}.png`) });
}
async function run(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message.split('\n')[0]}`);
    await shot(`FAIL-${name.replace(/\W+/g, '-')}`).catch(() => {});
    throw e;
  }
}

try {
  await run('welcome', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByRole('button').first().waitFor();
    await shot('welcome');
  });
  await run('register-or-login', async () => {
    await page.goto(`${BASE}/parent/login`, { waitUntil: 'networkidle' });
    await page.getByLabel(/courriel|email/i).fill('parent@example.com');
    await page.getByLabel(/mot de passe|password/i).fill('correct-horse-battery');
    await shot('login-filled');
    await page.getByRole('button', { name: /se connecter|log in/i }).click();
    await page.waitForURL('**/parent', { timeout: 15000 });
    await page.getByText(/Zoé/).first().waitFor();
    await shot('parent-home');
  });
  await run('parent-overview', async () => {
    await page.getByRole('link', { name: /suivi|progress/i }).first().click();
    await page.waitForURL(/\/parent\/children\/[^/]+$/);
    await page.getByRole('heading', { name: /sa progression|their growth/i }).waitFor();
    await shot('parent-overview');
    await page.goBack();
  });
  await run('pick-profile-with-pin', async () => {
    await page.goto(`${BASE}/play`, { waitUntil: 'networkidle' });
    await shot('picker');
    await page.getByRole('button', { name: /Zoé/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await page.waitForTimeout(700);
    await shot('pin-dialog');
    for (const d of ['1', '2', '3', '4']) {
      const key = dialog.getByRole('button', { name: new RegExp(`^${d}$`) });
      if (await key.count()) await key.first().click();
    }
    await page.waitForURL('**/play/home', { timeout: 15000 });
    await page.getByRole('heading', { name: /Échecs|Chess|monde|world/i }).first().waitFor({ timeout: 15000 }).catch(() => {});
    await shot('home-feed');
  });
  await run('start-chapter', async () => {
    // the guided tour opens once data loads; close it like a child would
    const close = page.getByRole('button', { name: /passer|skip|ignorer/i });
    await close.first().waitFor({ timeout: 8000 }).catch(() => {});
    await shot('tour');
    if (await close.count()) await close.first().click();
    await page.waitForTimeout(500);
    await shot('home-after-tour');
    await page.getByRole('button', { name: /jouer|play/i }).first().click();
    await page.waitForURL('**/play/session/**', { timeout: 15000 });
    await shot('story-loading');
  });
  for (let beat = 0; beat < 3; beat++) {
    await run(`beat-${beat}-question`, async () => {
      await page.getByRole('group').waitFor({ timeout: 20000 });
      await shot(`beat-${beat}-question`);
    });
    await run(`beat-${beat}-answer`, async () => {
      const choices = page.getByRole('group').getByRole('button');
      // beat 0: typical error (54), beat 1: correct (6), beat 2: random (first choice [49,4])
      const idx = [0, 1, 0][beat];
      await choices.nth(idx).click();
      await page.getByRole('button', { name: /continuer|continue/i }).waitFor({ timeout: 20000 });
      await shot(`beat-${beat}-outcome`);
      await page.getByRole('button', { name: /continuer|continue/i }).click();
    });
  }
  await run('chapter-complete', async () => {
    await page.waitForURL('**/done', { timeout: 15000 });
    await page.waitForTimeout(1500);
    await shot('chapter-complete');
  });
  await run('collection-and-me', async () => {
    await page.goto(`${BASE}/play/collection`, { waitUntil: 'networkidle' });
    await shot('collection');
    await page.goto(`${BASE}/play/me`, { waitUntil: 'networkidle' });
    await shot('me');
    await page.goto(`${BASE}/play/worlds`, { waitUntil: 'networkidle' });
    await shot('worlds');
    await page.goto(`${BASE}/play/journey/echecs`, { waitUntil: 'networkidle' });
    await shot('journey');
  });
} catch {
  /* failure already logged */
}

console.log('\nproblems seen:', problems.length ? '\n' + [...new Set(problems)].join('\n') : 'none');
await browser.close();
