// Regression for "every collection card shows the same photo": 12 cards in one list, against a running Storybook.
// Usage: node scripts/check-card-collection.mjs [storybookUrl] [shotsDir]   (default http://localhost:6220)
// fr-CA and en-CA at 360 and 1280: 12 distinct photos, 12 distinct layout signatures, every photo loads, no console error, no sideways scroll, axe.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = (process.argv[2] ?? 'http://localhost:6220').replace(/\/$/, '');
const SHOTS = process.argv[3];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const AXE = readFileSync(resolve(import.meta.dirname, 'qa/node_modules/axe-core/axe.min.js'), 'utf8');
let fails = 0;
const browser = await chromium.launch();
for (const locale of ['fr-CA', 'en-CA'])
  for (const width of [360, 1280]) {
    const name = `${locale} ${width}px: 12 cards, 12 photos, 12 layouts, axe, no console error`;
    try {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${BASE}/iframe.html?id=game-storycard--collection&viewMode=story&globals=locale:${locale}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-photo]', { timeout: 30000 });
      // lazy images: scroll every card into view so each photo loads
      await page.evaluate(() => document.querySelectorAll('[data-photo]').forEach((i) => i.scrollIntoView()));
      await page.waitForFunction(() => [...document.querySelectorAll('[data-photo]')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 });
      const { photos, layouts, sticky, over } = await page.evaluate(() => ({
        photos: [...document.querySelectorAll('[data-photo]')].map((i) => i.getAttribute('src')),
        layouts: [...document.querySelectorAll('[data-layout]')].map((e) => e.getAttribute('data-layout')),
        sticky: [...new Set([...document.querySelectorAll('[data-layout] button span')].map((s) => s.textContent).filter((t) => /^(Histoire|Story)$/i.test(t ?? '')))],
        over: document.documentElement.scrollWidth > window.innerWidth + 1,
      }));
      if (photos.length !== 12) throw new Error(`${photos.length} photos rendered`);
      if (new Set(photos).size !== 12) throw new Error(`only ${new Set(photos).size} distinct photos`);
      if (layouts.length !== 12 || new Set(layouts).size !== 12) throw new Error(`only ${new Set(layouts).size}/${layouts.length} distinct layouts`);
      if (sticky.length !== 1 || sticky[0].toLowerCase() !== (locale === 'fr-CA' ? 'histoire' : 'story')) throw new Error(`sticker text ${JSON.stringify(sticky)}`);
      if (over) throw new Error('page scrolls sideways');
      await page.addScriptTag({ content: AXE });
      const v = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => `${x.id} x${x.nodes.length}`)));
      if (v.length) throw new Error(`axe ${v.join(', ')}`);
      if (errors.length) throw new Error(`console: ${errors[0]}`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/collection-${locale}-${width}.png`, fullPage: true });
      await ctx.close();
      console.log(`ok   ${name}`);
    } catch (e) {
      fails++;
      console.log(`FAIL ${name}: ${String(e.message).split('\n')[0].slice(0, 400)}`);
    }
  }
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all card collection checks pass');
process.exit(fails ? 1 : 0);
