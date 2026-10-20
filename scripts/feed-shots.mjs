// Screenshots of the Discover feed at 360, 768 and 1280 px for self review: node scripts/feed-shots.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { parentLogin, kidEnter } from './lib/kid.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const OUT = process.argv[3] ?? 'scripts/qa/out/feed';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [w, h] of [[360, 740], [768, 1000], [1280, 800]]) {
  const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await parentLogin(page, BASE);
  await kidEnter(page, BASE, 'Noé', '4321');
  await page.goto(`${BASE}/play/feed`, { waitUntil: 'networkidle' });
  await page.locator('article[data-media]').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/feed-${w}-1.png` });
  for (const kind of ['video', 'animation']) {
    for (let i = 0; i < 60; i++) {
      const loc = page.locator(`article[data-media="${kind}"]`);
      if (await loc.count()) { await loc.first().scrollIntoViewIfNeeded(); break; }
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/feed-${w}-${kind}.png` });
  }
  await ctx.close();
}
await browser.close();
console.log('shots in', OUT);
