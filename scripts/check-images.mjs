// Fails on any image that does not load: a 4xx or 5xx answer for an image request, or an <img> that finished with no pixels.
// Visits the kid routes (home, worlds, a journey, discover feed, cards, me, credits) and a chapter question.
// Usage: node scripts/check-images.mjs [baseUrl]   (needs the app, the API and the demo account)
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from './lib/kid.mjs';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
import { readFileSync, existsSync } from 'node:fs';
const bad = [];
// every bundled object photo a world can count must exist in public/objects (a missing slug is a 404 in a chapter)
const src = readFileSync(new URL('../src/game/scene-picture/ScenePicture.tsx', import.meta.url), 'utf8');
for (const slug of new Set([...src.matchAll(/\['([a-z-]+)', '([a-z-]+)'\]/g)].flatMap((m) => [m[1], m[2]]))) {
  if (!existsSync(new URL(`../public/objects/${slug}-256.webp`, import.meta.url))) bad.push(`public/objects/${slug}-256.webp is missing`);
}
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();
page.on('response', (r) => {
  const t = r.request().resourceType();
  if (r.status() >= 400 && (t === 'image' || t === 'media' || /\.(webp|png|jpe?g|mp4|vtt)(\?|$)/.test(r.url()))) bad.push(`${r.status()} ${r.url().replace(BASE, '')}`);
});
await parentLogin(page, BASE);
await kidEnter(page, BASE, 'Noé', '4321');
for (const route of ['/play/home', '/play/worlds', '/play/journey/nature', '/play/journey/ocean', '/play/feed', '/play/collection', '/play/me', '/credits']) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  if (route === '/play/feed') for (let i = 0; i < 25; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(150); }
  await page.waitForTimeout(500);
  const empty = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.currentSrc && i.naturalWidth === 0).map((i) => i.currentSrc));
  for (const e of empty) bad.push(`no pixels ${e.replace(location?.origin ?? '', '')}`);
}
await browser.close();
const uniq = [...new Set(bad)];
if (uniq.length) {
  console.log(`FAIL ${uniq.length} broken image(s): ${uniq.slice(0, 8).join(' | ')}`);
  process.exit(1);
}
console.log('ok   every image on the kid routes loads');
