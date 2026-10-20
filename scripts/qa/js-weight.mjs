// First-load JavaScript per route, as the browser receives it (decoded KB and wire KB), plus LCP and CLS.
// Usage: node scripts/qa/js-weight.mjs [baseUrl]   (needs the demo account; set JS_BUDGET_KB to fail above a decoded size)
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from '../lib/kid.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const BUDGET = Number(process.env.JS_BUDGET_KB ?? 0);
const browser = await chromium.launch();

async function measure(ctx, path) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const js = new Map();
  // the service worker takes over mid-load and replays scripts: count each URL once (the first request wins)
  const byUrl = new Map();
  cdp.on('Network.responseReceived', (e) => {
    if (e.type !== 'Script' || byUrl.has(e.response.url)) return;
    const j = { dec: 0, wire: 0 };
    byUrl.set(e.response.url, j);
    js.set(e.requestId, j);
  });
  cdp.on('Network.dataReceived', (e) => { const j = js.get(e.requestId); if (j) j.dec += e.dataLength; });
  cdp.on('Network.loadingFinished', (e) => { const j = js.get(e.requestId); if (j) j.wire = e.encodedDataLength; });
  await page.addInitScript(() => {
    window.__m = { lcp: 0, cls: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => window.__m);
  await page.close();
  const all = [...byUrl.values()];
  return { path, dec: all.reduce((a, j) => a + j.dec, 0) / 1024, wire: all.reduce((a, j) => a + j.wire, 0) / 1024, lcp: m.lcp, cls: m.cls };
}

const rows = [];
let ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 390, height: 844 } });
rows.push(await measure(ctx, '/'));
await ctx.close();
ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 390, height: 844 } });
const setup = await ctx.newPage();
await parentLogin(setup, BASE);
const kids = await setup.evaluate(async () => (await fetch('/api/v1/children')).json());
const cid = (Array.isArray(kids) ? kids : kids.items ?? kids.children ?? [])[0]?.id;
for (const p of ['/parent', '/parent/account', '/parent/subscription', ...(cid ? [`/parent/children/${cid}`] : [])]) rows.push(await measure(ctx, p));
await kidEnter(setup, BASE);
const id = (await (await setup.request.get(`${BASE}/api/session`)).json()).childId;
await setup.evaluate((c) => localStorage.setItem(`nx:onboarding:${c}`, 'done'), id);
for (const p of ['/play/home', '/play/worlds', '/play/feed', '/play/collection', '/play/me', '/play/challenges']) rows.push(await measure(ctx, p));
await browser.close();

let over = 0;
for (const r of rows) {
  const bad = BUDGET && r.dec > BUDGET;
  if (bad) over++;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${r.path.padEnd(34)} js ${r.dec.toFixed(0).padStart(5)} KB (wire ${r.wire.toFixed(0).padStart(4)})  LCP ${r.lcp.toFixed(0).padStart(5)} ms  CLS ${r.cls.toFixed(3)}`);
}
process.exit(over ? 1 : 0);
