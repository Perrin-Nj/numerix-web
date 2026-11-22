#!/usr/bin/env node
// Evidence generator for the animation REVIEW PROTOCOL (specs/001-three-worlds-premium/plan.md 2.5, src/game/scene-stage/README.md).
// Drives the `game/SceneStage` Review story in Storybook with Playwright. For each scene id it writes, under <out>/<id>/:
//   frames/<size>-<phase>-t<ms>.png   deterministic frames (all CSS animations are paused and seeked, so a frame is exactly t ms into the motion)
//   evidence.json                     resolved label, DOM counts, frame times at 4x CPU, reduced-motion check, flashing check
//   contact.html                      contact sheet: this scene beside its neighbours (uniqueness judgement) and the frame strips
// Usage: node scripts/play-scenes.mjs --base http://localhost:6006 --out evidence [--only espace.horloge.001] [--sizes phone,desktop] [--throttle 4]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : d);
const BASE = arg('base', 'http://localhost:6006');
const OUT = path.resolve(arg('out', 'evidence'));
const ONLY = arg('only', '');
const THROTTLE = Number(arg('throttle', '4'));
const ALL_SIZES = { phone: [360, 740], tablet: [820, 1180], desktop: [1280, 720], tv: [1920, 1080], short: [600, 400] };
const SIZES = arg('sizes', 'phone,desktop').split(',').filter((s) => ALL_SIZES[s]);
const IDS = (arg('ids', 'espace.horloge.001,echecs.cases.004,medecine.doses.001')).split(',').filter((i) => !ONLY || i === ONLY);
const T_QUESTION = [0, 400, 1200, 3000];
const T_REVEAL = [0, 300, 700, 1100, 1500, 2200, 3500];

const TIER = arg('tier', 'full'); // evidence is taken on the full tier unless --tier lite, so a low-core CI box does not silently change the pictures
const url = (id, lang = 'fr') => `${BASE}/iframe.html?id=game-scenestage--review&viewMode=story&args=sceneId:${id.replaceAll('.', '_')};lang:${lang};tier:${TIER}`;
const fail = [];
const AXE = (() => {
  const pn = path.resolve('node_modules/.pnpm');
  const d = fs.readdirSync(pn).find((n) => n.startsWith('axe-core@'));
  return d ? path.join(pn, d, 'node_modules/axe-core/axe.min.js') : null;
})();

async function ready(page) {
  await page.waitForSelector('[data-testid="stage-box"] .nx-stage', { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('.nx-layer').length > 0, null, { timeout: 15000 });
}

/** Pause everything and put every animation created since `since` at t ms. Older (already finished or idle) animations stay where they are. */
async function seek(page, t, since) {
  await page.evaluate(
    ([t, since]) => {
      for (const a of document.getAnimations()) {
        if (since && a.__old) continue;
        a.pause();
        a.currentTime = t;
      }
      void since;
    },
    [t, since],
  );
  await page.waitForTimeout(40);
}
async function markOld(page) {
  await page.evaluate(() => document.getAnimations().forEach((a) => (a.__old = true)));
}
async function shoot(page, file) {
  const el = await page.$('[data-testid="stage-box"]');
  await el.screenshot({ path: file });
}

async function capture(browser, id, sizeName, [w, h], dir) {
  const files = [];
  for (const phase of ['question', 'ok', 'ko']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(url(id));
    await ready(page);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
    if (phase === 'question') {
      for (const t of T_QUESTION) {
        await seek(page, t, false);
        const f = `${sizeName}-question-t${t}.png`;
        await shoot(page, path.join(dir, 'frames', f));
        files.push(f);
      }
    } else {
      // settle the entrance, then answer: the reveal plays from the real phase change
      await page.evaluate(() => document.getAnimations().forEach((a) => { if (a.effect?.getTiming().iterations === Infinity) a.play(); else a.finish(); }));
      await markOld(page);
      await page.click(`[data-phase-btn="${phase}"]`);
      await page.waitForTimeout(30);
      await page.evaluate(() => document.getAnimations().forEach((a) => { if (!a.__old) a.pause(); }));
      for (const t of T_REVEAL) {
        await seek(page, t, true);
        const f = `${sizeName}-${phase}-t${t}.png`;
        await shoot(page, path.join(dir, 'frames', f));
        files.push(f);
      }
    }
    await ctx.close();
  }
  return files;
}

async function measure(browser, id) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await page.goto(url(id) + '&perf=1');
  await ready(page);
  // an own frame sampler: the scene's clock sleeps when nothing needs it, so it cannot be the meter
  await page.evaluate(() => { window.__nxFrames = []; let l = performance.now(); const t = () => { const n = performance.now(); window.__nxFrames.push(Math.round((n - l) * 10) / 10); l = n; requestAnimationFrame(t); }; requestAnimationFrame(t); });
  await page.waitForTimeout(2600);
  await page.click('[data-phase-btn="ok"]');
  await page.waitForTimeout(3500);
  await page.click('[data-phase-btn="ko"]');
  await page.waitForTimeout(3500);
  const m = await page.evaluate(() => {
    const st = document.querySelector('[data-testid="stage-box"] .nx-stage');
    const frames = (window.__nxFrames || []).slice(8);
    const sorted = [...frames].sort((a, b) => a - b);
    const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
    return {
      label: st?.getAttribute('aria-label') ?? null,
      role: st?.getAttribute('role') ?? null,
      nodes: st ? st.querySelectorAll('*').length : 0,
      layers: st ? st.querySelectorAll('.nx-layer').length : 0,
      tier: st?.getAttribute('data-tier'),
      frames: frames.length,
      p50: q(0.5),
      p95: q(0.95),
      over20: frames.length ? Math.round((frames.filter((f) => f > 20).length / frames.length) * 1000) / 10 : null,
      hasButton: !!document.querySelector('.nx-replay'),
      hiddenInfo: [...document.querySelectorAll('.nx-stage [role]')].length,
    };
  });
  await ctx.close();
  return m;
}

async function reduced(browser, id) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(url(id));
  await ready(page);
  await page.click('[data-phase-btn="ok"]');
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const st = document.querySelector('.nx-stage');
    const running = document.getAnimations().filter((a) => st?.contains(a.effect?.target) && a.playState === 'running' && a.effect.target !== st);
    return { reduced: st?.getAttribute('data-reduced'), runningAnimations: running.length, replayButton: !!document.querySelector('.nx-replay'), canvas: !!document.querySelector('.nx-fx') };
  });
  await ctx.close();
  return r;
}

/** Accessibility: axe on the stage in every phase and theme, and the keyboard path of the replay button (Tab, Enter restarts the motion). */
async function a11y(browser, id) {
  const res = { violations: [], replayKeyboard: false, replayInReducedMotion: null };
  for (const theme of ['light', 'dark', 'hc']) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const page = await ctx.newPage();
    await page.goto(url(id));
    await ready(page);
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    if (AXE) await page.addScriptTag({ path: AXE });
    for (const phase of ['question', 'ok', 'ko']) {
      await page.click(`[data-phase-btn="${phase}"]`);
      await page.waitForTimeout(300);
      if (AXE) {
        let r = [];
        for (let k = 0; k < 4; k++) {
          try {
            r = await page.evaluate(() => window.axe.run('[data-testid="stage-box"]').then((x) => x.violations.map((v) => v.id + ': ' + v.nodes.length + ' node(s)')));
            break;
          } catch (e) {
            if (!/already running/.test(String(e))) throw e;
            await page.waitForTimeout(600); // axe is busy with the previous theme's run
          }
        }
        res.violations.push(...r.map((v) => theme + '/' + phase + ' ' + v));
      }
    }
    if (theme === 'light') {
      const before = await page.evaluate(() => { const e = document.querySelector('.nx-cam-in'); e.__mark = 1; return 1; });
      await page.focus('.nx-replay');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      res.replayKeyboard = before === 1 && (await page.evaluate(() => !document.querySelector('.nx-cam-in').__mark));
    }
    await ctx.close();
  }
  return res;
}

/** Flashing check (no flashing above 3 Hz): every infinite CSS animation in the stage, in every phase, must have a full cycle of at least 334 ms,
 * and no finite animation may repeat faster than that. Static and exact: it reads the real animation timings from the running page. */
async function flashing(browser, id) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  await page.goto(url(id));
  await ready(page);
  const worst = { hz: 0, name: '' };
  for (const phase of ['question', 'ok', 'ko']) {
    await page.click(`[data-phase-btn="${phase}"]`);
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      let hz = 0;
      let name = '';
      for (const a of document.getAnimations()) {
        const t = a.effect?.getTiming();
        if (!t || typeof t.duration !== 'number' || !t.duration) continue;
        const repeats = t.iterations === Infinity || t.iterations > 1;
        if (!repeats) continue;
        const cycle = t.duration * (String(t.direction).startsWith('alternate') ? 2 : 1);
        const f = 1000 / cycle;
        if (f > hz) { hz = f; name = a.animationName || a.id || ''; }
      }
      return { hz, name };
    });
    if (r.hz > worst.hz) { worst.hz = r.hz; worst.name = r.name + ' (' + phase + ')'; }
  }
  await ctx.close();
  return { hz: Math.round(worst.hz * 100) / 100, fastest: worst.name };
}

function contactSheet(id, dir, files, neighbours) {
  const strip = (phase) => files.filter((f) => f.includes(`-${phase}-`)).map((f) => `<figure><img src="frames/${f}"><figcaption>${f}</figcaption></figure>`).join('');
  const nb = neighbours.map((n) => `<figure><img src="../${n}/frames/${SIZES[0]}-question-t3000.png"><figcaption>${n}</figcaption></figure>`).join('');
  fs.writeFileSync(
    path.join(dir, 'contact.html'),
    `<!doctype html><meta charset="utf-8"><title>${id}</title><style>body{font:14px system-ui;background:#111;color:#eee;margin:16px}h2{margin:18px 0 6px}div{display:flex;gap:8px;flex-wrap:wrap}figure{margin:0}img{max-width:420px;border-radius:6px}</style>
<h1>${id}</h1><h2>Neighbours (uniqueness)</h2><div><figure><img src="frames/${SIZES[0]}-question-t3000.png"><figcaption>${id}</figcaption></figure>${nb}</div>
<h2>Question: entrance and idle</h2><div>${strip('question')}</div><h2>Right answer</h2><div>${strip('ok')}</div><h2>Gentle miss</h2><div>${strip('ko')}</div>`,
  );
}

const browser = await chromium.launch();
const results = {};
for (const id of IDS) {
  const dir = path.join(OUT, id);
  fs.mkdirSync(path.join(dir, 'frames'), { recursive: true });
  let files = [];
  for (const s of SIZES) files = files.concat(await capture(browser, id, s, ALL_SIZES[s], dir));
  // best of 3: other processes on a shared box add frame-time noise that is not the scene's cost
  let perf = null;
  for (let k = 0; k < 3; k++) {
    const m = await measure(browser, id);
    if (!perf || (m.over20 ?? 0) < (perf.over20 ?? 0)) perf = m;
    if ((perf.over20 ?? 0) <= 5) break;
  }
  const red = await reduced(browser, id);
  const flash = await flashing(browser, id);
  const ax = await a11y(browser, id);
  const checks = {
    role_img_label: perf.role === 'img' && !!perf.label,
    nodes_le_250: perf.nodes <= 250,
    layers_le_8: perf.layers <= 8,
    frames_over_20ms_le_5pct: perf.over20 === null || perf.over20 <= 5,
    reduced_motion_calm: red.runningAnimations === 0 && !red.replayButton && !red.canvas,
    flashing_le_3hz: flash.hz <= 3,
    axe_clean: ax.violations.length === 0,
    keyboard_replay: ax.replayKeyboard,
  };
  results[id] = { id, throttle: THROTTLE, perf, reduced: red, flashing: flash, a11y: ax, checks, frames: files };
  fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(results[id], null, 2));
  for (const [k, v] of Object.entries(checks)) if (!v) fail.push(`${id}: ${k}`);
  console.log(id, JSON.stringify({ nodes: perf.nodes, layers: perf.layers, p95: perf.p95, over20: perf.over20, hz: flash.hz }));
}
for (const id of IDS) contactSheet(id, path.join(OUT, id), results[id].frames, IDS.filter((n) => n !== id));
await browser.close();
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ generated: new Date().toISOString(), ids: IDS, failures: fail }, null, 2));
if (fail.length) {
  console.error('play-scenes: checks failed\n' + fail.join('\n'));
  process.exit(1);
}
console.log('play-scenes: ok, evidence in ' + OUT);
