// Browser checks for the consequence scenes, against a running Storybook.
// Usage: node scripts/check-consequence-ui.mjs [storybookUrl] [shotsDir]   (default http://localhost:6220)
// Checks at 360 and 1280 wide: no console error, all 96 scenes render, pieces stay on stage, axe, tap-to-skip, motion path ends on the
// reduced-motion picture, reduced motion starts no animation.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = (process.argv[2] ?? 'http://localhost:6220').replace(/\/$/, '');
const SHOTS = process.argv[3];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const AXE = readFileSync(resolve(import.meta.dirname, 'qa/node_modules/axe-core/axe.min.js'), 'utf8');
const url = (id, locale = 'fr-CA') => `${BASE}/iframe.html?id=game-consequencescene--${id}&viewMode=story&globals=locale:${locale}`;
let fails = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    fails++;
    console.log(`FAIL ${name}: ${String(e.message).split('\n')[0].slice(0, 400)}`);
  }
}

const browser = await chromium.launch();
async function open(width, id, { reduced = false, locale } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 740 : 800 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__sceneAnims = 0;
    const a = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.closest?.('[data-scene]')) window.__sceneAnims++;
      return a.apply(this, args);
    };
  });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url(id, locale), { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-scene]', { timeout: 20000 });
  return { ctx, page, errors };
}
const finals = (page) => page.$$eval('[data-scene]', (stages) => stages.map((s) => [s.dataset.scene, [...s.children].map((c) => c.style.transform).join('|')]));

for (const width of [360, 1280]) {
  await check(`${width}px library: 96 scenes, no console error, every piece on stage, axe`, async () => {
    const { ctx, page, errors } = await open(width, 'library');
    await page.waitForTimeout(500);
    const n = await page.$$eval('[data-scene]', (e) => e.length);
    if (n !== 96) throw new Error(`${n} scenes`);
    const off = await page.$$eval('[data-scene]', (stages) =>
      stages.flatMap((s) => {
        const r = s.getBoundingClientRect();
        return [...s.children]
          .filter((c) => c.querySelector('img'))
          .filter((c) => {
            const b = c.getBoundingClientRect();
            return b.right < r.left - 2 || b.left > r.right + 2 || b.top > r.bottom + 2 || b.width < 4;
          })
          .map(() => s.dataset.scene);
      }),
    );
    if (off.length) throw new Error(`pieces off stage: ${[...new Set(off)].slice(0, 5)}`);
    await page.addScriptTag({ content: AXE });
    const v = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => `${x.id} x${x.nodes.length}`)));
    if (v.length) throw new Error(`axe ${v.join(', ')}`);
    if (errors.length) throw new Error(`console: ${errors[0]}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/library-${width}.png`, fullPage: true });
    await ctx.close();
  });

  await check(`${width}px motion: animates, then rests on the reduced-motion picture; tap skips`, async () => {
    for (const id of ['tower-wrong', 'bridge-wrong', 'scale-wrong', 'jug-wrong', 'shelf-wrong', 'collide-wrong', 'tower-right', 'jug-right']) {
      const m = await open(width, id);
      const r = await open(width, id, { reduced: true });
      const running = await m.page.evaluate(() => window.__sceneAnims);
      const still = await r.page.evaluate(() => window.__sceneAnims);
      if (!running) throw new Error(`${id}: nothing animates`);
      if (still) throw new Error(`${id}: reduced motion still animates`);
      if (SHOTS && width === 1280) {
        for (const ms of [250, 700, 1400]) {
          await m.page.waitForTimeout(ms === 250 ? 250 : ms === 700 ? 450 : 700);
          await m.page.screenshot({ path: `${SHOTS}/${id}-${ms}.png` });
        }
      }
      await m.page.click('button[aria-label]'); // tap to skip jumps to the end
      await m.page.waitForFunction(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('[data-scene]')).every((a) => a.playState !== 'running'), null, { timeout: 8000 });
      const [a] = await finals(m.page);
      const [b] = await finals(r.page);
      if (a[1] !== b[1]) throw new Error(`${id}: end picture differs from reduced motion`);
      if (SHOTS && width === 1280) await r.page.screenshot({ path: `${SHOTS}/${id}-final.png` });
      if (m.errors.length || r.errors.length) throw new Error(`${id} console: ${(m.errors[0] ?? r.errors[0]).slice(0, 200)}`);
      await m.ctx.close();
      await r.ctx.close();
    }
  });
}

await check('en-CA caption renders and fr-CA caption differs', async () => {
  const en = await open(360, 'tower-wrong', { locale: 'en-CA' });
  const fr = await open(360, 'tower-wrong', { locale: 'fr-CA' });
  const a = await en.page.textContent('[data-caption]');
  const b = await fr.page.textContent('[data-caption]');
  if (!a || !b || a === b) throw new Error(`${a} / ${b}`);
  await en.ctx.close();
  await fr.ctx.close();
});

await browser.close();
console.log(fails ? `${fails} FAILED` : 'all consequence UI checks pass');
process.exit(fails ? 1 : 0);
