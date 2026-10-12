// Browser checks that print one line each (no screenshots, no images): the kid and grown-up journeys on screen.
// Usage: node scripts/ui-checks.mjs [baseUrl]
import { chromium } from 'playwright';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 420, height: 880 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
let fails = 0;
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().replace(BASE, '').slice(0, 80)}`);
});

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    fails++;
    console.log(`FAIL ${name}: ${e.message.split('\n')[0].slice(0, 140)}`);
  }
}
const T = { timeout: 15000 };

await check('first screen has both doors', async () => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /je suis un enfant/i }).waitFor(T);
  await page.getByRole('button', { name: /je suis un adulte/i }).waitFor(T);
});
await check('kid door without an adult explains what to do', async () => {
  await page.getByRole('button', { name: /je suis un enfant/i }).click();
  await page.getByText(/un adulte doit d.abord se connecter/i).first().waitFor(T);
});
await check('grown-up registers', async () => {
  await page.goto(`${BASE}/parent/register`, { waitUntil: 'networkidle' });
  await page.getByLabel(/courriel/i).fill(`ui${Date.now()}@example.com`);
  await page.getByLabel(/mot de passe/i).fill('correct-horse-battery');
  await page.getByRole('button', { name: /créer mon compte/i }).click();
  await page.waitForURL('**/parent/children/new', T);
});
let childName = `Kid${Date.now() % 1000}`;
await check('create a child with a PIN', async () => {
  await page.getByLabel(/prénom ou surnom/i).fill(childName);
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: /3e année/i }).click();
  await page.getByRole('switch', { name: /protéger le profil/i }).click();
  for (const d of ['4', '3', '2', '1']) await page.getByRole('button', { name: new RegExp(`^${d}$`) }).first().click();
  await page.getByRole('button', { name: /créer le profil/i }).click();
  await page.waitForURL('**/consent', T);
});
await check('give consent', async () => {
  await page.getByRole('switch', { name: /j.ai lu/i }).click();
  await page.getByRole('button', { name: /donner l.autorisation/i }).click();
  await page.waitForURL('**/parent', T);
});
await check('new child is visible with PIN and permission status', async () => {
  await page.getByText(childName).first().waitFor(T);
  await page.getByText(/code à 4 chiffres requis/i).first().waitFor(T);
  await page.getByText(/autorisation donnée/i).nth(1).waitFor(T);
});
await check('kid door lists the profiles and the new PIN works', async () => {
  await page.goto(`${BASE}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: new RegExp(childName) }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor(T);
  for (const d of ['1', '1', '1', '1']) await dialog.getByRole('button', { name: new RegExp(`^${d}$`) }).first().click();
  await page.getByText(/ne correspond pas/i).first().waitFor(T);
  for (const d of ['4', '3', '2', '1']) await dialog.getByRole('button', { name: new RegExp(`^${d}$`) }).first().click();
  await page.waitForURL('**/play/home', T);
});
await check('close the tour', async () => {
  const close = page.getByRole('button', { name: /passer la visite/i });
  await close.first().waitFor(T);
  await close.first().click();
});
await check('discover feed: cards, AI label, endless loading, like', async () => {
  await page.getByRole('link', { name: /découvrir/i }).click();
  await page.waitForURL('**/play/feed', T);
  await page.getByText(/généré par ia/i).first().waitFor(T);
  const count = () => page.getByText(/généré par ia/i).count();
  const first = await count();
  await page.mouse.move(210, 400);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1200);
  const later = await count();
  if (later <= first) throw new Error(`feed did not grow (${first} -> ${later})`);
  await page.getByRole('button', { name: /j.aime/i }).first().click();
  await page.getByRole('button', { name: /^aimé/i }).first().waitFor({ timeout: 5000 });
});
await check('a chapter can be started and answered', async () => {
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /jouer/i }).first().click();
  await page.waitForURL('**/play/session/**', T);
  await page.getByText('7 × 8').first().waitFor({ timeout: 25000 });
  await page.getByRole('button', { name: /56/ }).first().click();
  await page.getByRole('button', { name: /continuer/i }).waitFor({ timeout: 25000 });
});

console.log(errors.length ? `console errors: ${[...new Set(errors)].join(' | ')}` : 'console errors: none');
console.log(fails ? `${fails} FAILED` : 'all ui checks pass');
await browser.close();
process.exit(fails ? 1 : 0);
