// QA sweep: every route x 3 viewports. Console/page errors, failed requests, axe (pinned axe-core), perf (LCP, CLS, JS/img bytes),
// visual police (emoji, flat vectors, heavy button borders, broken/low-res images, gradient-only screens), screenshots + contact sheets.
// Usage: node scripts/qa/sweep.mjs [baseUrl]   Output: scripts/qa/out/{shots,sweep.json,contact-*.png}
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parentLogin, kidEnter } from '../lib/kid.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3130').replace(/\/$/, '');
const OUT = resolve(import.meta.dirname, 'out');
const AXE = resolve(import.meta.dirname, 'node_modules/axe-core/axe.min.js');
const VPS = { m360: [360, 740], t768: [768, 1024], d1280: [1280, 800] };
const BUDGET = { lcp: 2500, cls: 0.1, js: 600_000, img: 1_500_000 };
mkdirSync(`${OUT}/shots`, { recursive: true });

const police = () => {
  const out = [];
  const vw = innerWidth, vh = innerHeight;
  const desc = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').slice(0, 2).join('.') : ''}`;
  // emoji as content/icon
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const emo = /\p{Extended_Pictographic}/u;
  for (let n; (n = w.nextNode()); ) if (emo.test(n.nodeValue) && !/SCRIPT|STYLE/.test(n.parentElement.tagName)) out.push(['emoji', 'P1', `${desc(n.parentElement)} "${n.nodeValue.trim().slice(0, 30)}"`]);
  // flat vector art: inline svg >= 80px not a lucide icon, svg/dicebear images
  for (const s of document.querySelectorAll('svg')) {
    const r = s.getBoundingClientRect();
    if (r.width >= 80 && r.height >= 80 && !/lucide/.test(s.getAttribute('class') ?? '') && !s.closest('[data-mascot],.driver-overlay')) out.push(['flat-vector-svg', 'P1', `${Math.round(r.width)}x${Math.round(r.height)} ${desc(s)} ${s.closest('[aria-label],[data-testid]')?.getAttribute('aria-label') ?? ''}`]);
  }
  for (const i of document.querySelectorAll('img')) {
    const r = i.getBoundingClientRect();
    const src = i.currentSrc || i.src;
    if (!src) continue;
    if (i.complete && i.naturalWidth === 0) out.push(['broken-image', 'P0', src.slice(0, 100)]);
    else if (/\.svg(\?|$)|dicebear|data:image\/svg/.test(src)) out.push(['svg-image-art', 'P1', `${Math.round(r.width)}px ${src.slice(0, 90)}`]);
    else if (r.width > 60 && i.naturalWidth < r.width * 0.75) out.push(['low-res-image', 'P2', `${i.naturalWidth}px shown at ${Math.round(r.width)} ${src.slice(0, 80)}`]);
    if (!i.hasAttribute('alt')) out.push(['img-no-alt', 'P2', src.slice(0, 80)]);
  }
  // heavy borders on buttons/links styled as buttons
  for (const b of document.querySelectorAll('button,a[role=button],[class*=btn],[class*=button]')) {
    const cs = getComputedStyle(b), r = b.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) continue;
    const bw = Math.max(...['Top', 'Right', 'Bottom', 'Left'].map((s) => parseFloat(cs['border' + s + 'Width']) * (cs['border' + s + 'Style'] !== 'none')));
    if (bw >= 2) out.push(['heavy-button-border', 'P1', `${bw}px ${desc(b)} "${(b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 24)}"`]);
  }
  // gradient-only hero: big gradient background with no media in the viewport
  const media = [...document.querySelectorAll('img,video,canvas')].some((m) => { const r = m.getBoundingClientRect(); return r.width * r.height > vw * vh * 0.15; });
  let grad = false;
  for (const e of document.querySelectorAll('body *')) {
    if (!/gradient/.test(getComputedStyle(e).backgroundImage)) continue;
    const r = e.getBoundingClientRect();
    if (r.width * r.height > vw * vh * 0.4) grad = true;
  }
  if (grad && !media) out.push(['gradient-only-screen', 'P2', 'large gradient, no photo/video >15% of viewport']);
  return out;
};

const perfInit = () => {
  window.__lcp = 0; window.__cls = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
};

const results = [];
const browser = await chromium.launch();
for (const [vp, [width, height]] of Object.entries(VPS)) {
  const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width, height }, deviceScaleFactor: 1 });
  await ctx.addInitScript(perfInit);
  const page = await ctx.newPage();
  let cur = { errors: [], failed: [], js: 0, img: 0 };
  page.on('pageerror', (e) => cur.errors.push(`pageerror ${e.message.slice(0, 160)}`));
  page.on('console', (m) => m.type() === 'error' && !(cur.own404 && m.location().url === cur.own404) && cur.errors.push(`console ${m.text().slice(0, 120)} @ ${m.location().url.replace(BASE, '')}`));
  page.on('requestfailed', (r) => !/aborted/i.test(r.failure()?.errorText ?? '') && cur.failed.push(`FAILED ${r.url().slice(0, 90)} ${r.failure()?.errorText}`));
  page.on('response', async (r) => {
    const u = r.url(), ct = r.headers()['content-type'] ?? '';
    if (r.status() >= 400 && !(cur.own404 && u === cur.own404)) cur.failed.push(`${r.status()} ${r.request().method()} ${u.replace(BASE, '').slice(0, 90)}`);
    const len = Number(r.headers()['content-length'] ?? 0) || (await r.body().then((b) => b.length, () => 0));
    if (/javascript/.test(ct)) cur.js += len;
    else if (/^(image|video)/.test(ct) || /\.(png|jpe?g|webp|avif|gif|mp4|webm)(\?|$)/.test(u)) cur.img += len;
  });
  const visit = async (name, url, act) => {
    cur = { errors: [], failed: [], js: 0, img: 0, own404: name === '404' ? BASE + url : null }; // the 404 page's own HTTP 404 is expected, any other 404 is a defect
    const t0 = Date.now();
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => cur.errors.push(`nav ${e.message.slice(0, 80)}`));
    if (act) await act().catch(() => {});
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls, h: document.documentElement.scrollWidth - innerWidth })).catch(() => ({}));
    await page.addScriptTag({ path: AXE }).catch(() => {});
    const ax = await page.evaluate(() => window.axe?.run(document, { resultTypes: ['violations'] }).then((r) => r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes[0]?.target?.join(' ').slice(0, 60) })))).catch(() => null);
    const pol = await page.evaluate(police).catch(() => []);
    const shot = `shots/${vp}/${name}.png`;
    mkdirSync(`${OUT}/shots/${vp}`, { recursive: true });
    await page.screenshot({ path: `${OUT}/${shot}`, fullPage: false }).catch(() => {});
    const issues = [];
    if (m.h > 1) issues.push(['horizontal-scroll', 'P1', `${m.h}px`]);
    if (m.lcp > BUDGET.lcp) issues.push(['lcp', 'P2', `${Math.round(m.lcp)}ms`]);
    if (m.cls > BUDGET.cls) issues.push(['cls', 'P2', m.cls.toFixed(3)]);
    if (cur.js > BUDGET.js) issues.push(['js-bytes', 'P2', String(cur.js)]);
    if (cur.img > BUDGET.img) issues.push(['image-bytes', 'P2', String(cur.img)]);
    for (const v of ax ?? []) if (v.impact === 'critical' || v.impact === 'serious') issues.push(['axe-' + v.id, 'P1', `${v.impact} x${v.n} ${v.ex}`]); else issues.push(['axe-' + v.id, 'P2', `${v.impact} x${v.n} ${v.ex}`]);
    for (const e of [...new Set(cur.errors)]) issues.push(['console-error', 'P1', e]);
    for (const e of [...new Set(cur.failed)]) issues.push(['request-failed', /^(5|FAILED)/.test(e) ? 'P0' : 'P1', e]);
    for (const p of pol) issues.push(p);
    results.push({ vp, name, url, shot, ms: Date.now() - t0, lcp: Math.round(m.lcp ?? 0), cls: +(m.cls ?? 0).toFixed(3), js: cur.js, img: cur.img, issues });
    console.log(`${issues.some((i) => i[1] === 'P0' || i[1] === 'P1') ? 'FAIL' : 'ok  '} ${vp} ${name} issues=${issues.length} lcp=${Math.round(m.lcp ?? 0)} js=${(cur.js / 1024) | 0}K img=${(cur.img / 1024) | 0}K`);
  };

  // public
  for (const [n, u] of [['home', '/'], ['credits', '/credits'], ['offline', '/offline'], ['404', '/does-not-exist'], ['parent-login', '/parent/login'], ['parent-register', '/parent/register']]) await visit(n, u);
  // parent
  await parentLogin(page, BASE);
  await visit('parent', '/parent');
  const kids = await page.$$eval('a[href*="/parent/children/"]', (a) => [...new Set(a.map((x) => x.getAttribute('href')))]).catch(() => []);
  const childHref = kids.find((h) => /\/children\/[^/]+$/.test(h) && !/new/.test(h));
  const cid = childHref?.split('/').pop();
  for (const [n, u] of [['parent-child-new', '/parent/children/new'], ['parent-account', '/parent/account'], ['parent-subscription', '/parent/subscription'], ...(cid ? [['parent-child', `/parent/children/${cid}`], ['parent-consent', `/parent/children/${cid}/consent`], ['parent-report', `/parent/children/${cid}/report`], ['parent-settings', `/parent/children/${cid}/settings`]] : [])]) await visit(n, u);
  // kid
  await kidEnter(page, BASE);
  for (const [n, u] of [['play-home', '/play/home'], ['play-worlds', '/play/worlds'], ['play-feed', '/play/feed'], ['play-challenges', '/play/challenges'], ['play-collection', '/play/collection'], ['play-me', '/play/me'], ['play-quest', '/play/quest']]) await visit(n, u);
  await page.goto(`${BASE}/play/worlds`, { waitUntil: 'networkidle' });
  const worlds = await page.$$eval('a[href*="/play/journey/"]', (a) => [...new Set(a.map((x) => x.getAttribute('href')))]);
  for (const h of worlds.slice(0, 6)) await visit('journey-' + h.split('/').pop(), h);
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/sweep.json`, JSON.stringify(results, null, 1));

// contact sheets
const b2 = await chromium.launch();
for (const vp of Object.keys(VPS)) {
  const rs = results.filter((r) => r.vp === vp);
  const html = `<body style="margin:0;background:#222;font:12px sans-serif;color:#fff;display:flex;flex-wrap:wrap;gap:6px;padding:6px">${rs
    .map((r) => `<figure style="margin:0;width:${vp === 'm360' ? 180 : vp === 't768' ? 260 : 420}px"><img style="width:100%" src="file:///${OUT.replace(/\\/g, '/')}/${r.shot}"><figcaption>${r.name} (${r.issues.length})</figcaption></figure>`)
    .join('')}</body>`;
  writeFileSync(`${OUT}/contact-${vp}.html`, html);
  const p = await b2.newPage({ viewport: { width: 1800, height: 900 } });
  await p.goto(`file:///${OUT.replace(/\\/g, '/')}/contact-${vp}.html`);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/contact-${vp}.png`, fullPage: true });
}
await b2.close();
const all = results.flatMap((r) => r.issues.map((i) => ({ vp: r.vp, route: r.name, shot: r.shot, kind: i[0], sev: i[1], detail: i[2] })));
console.log(`sweep: ${results.length} pages, P0=${all.filter((i) => i.sev === 'P0').length} P1=${all.filter((i) => i.sev === 'P1').length} P2=${all.filter((i) => i.sev === 'P2').length}`);
process.exit(all.some((i) => i.sev === 'P0' || i.sev === 'P1') ? 1 : 0);
