// Screenshots of the kid play screens at 360, 768 and 1280 px, for design review.
// Usage: node scripts/play-tour.mjs [baseUrl] [outDir]   (needs the app, a seeded Go API and the demo account)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { parentLogin, kidEnter } from './lib/kid.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const OUT = process.argv[3] ?? 'shots';
mkdirSync(OUT, { recursive: true });
const SIZES = [[360, 740], [768, 1024], [1280, 800]];
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 360, height: 740 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text().slice(0, 200)));

await parentLogin(page, BASE);
await kidEnter(page, BASE);

async function shoot(name, full = false) {
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: full });
  }
  await page.setViewportSize({ width: 360, height: 740 });
}

await page.goto(`${BASE}/play/worlds`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await shoot('worlds');
for (const world of (process.env.WORLDS ?? 'cuisine,ocean').split(',')) {
  await page.goto(`${BASE}/play/journey/${world}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shoot(`journey-${world}`);
}
await page.goto(`${BASE}/credits`, { waitUntil: 'networkidle' });
await shoot('credits');
console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
