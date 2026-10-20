import { chromium } from 'playwright';
import { parentLogin } from './lib/kid.mjs';
const BASE = 'http://localhost:3250';
const b = await chromium.launch();
for (const [w, h] of [[390, 844], [1280, 720]]) {
  const ctx = await b.newContext({ locale: 'fr-CA', viewport: { width: w, height: h } });
  const s = await ctx.newPage();
  await parentLogin(s, BASE);
  const kids = await s.evaluate(async () => (await fetch('/api/v1/children')).json());
  const cid = (Array.isArray(kids) ? kids : kids.items ?? kids.children ?? [])[0]?.id;
  for (const path of [`/parent/children/${cid}`, '/parent/account', '/parent']) {
    const p = await ctx.newPage();
    await p.addInitScript(() => {
      window.__s = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__s.push({ v: +e.value.toFixed(3), t: Math.round(e.startTime), n: e.sources.map((x) => (x.node?.nodeName ?? '?') + '.' + (x.node?.className?.toString().slice(0, 50) ?? '') + ' ' + JSON.stringify(x.previousRect) + '>' + JSON.stringify(x.currentRect)).join(' || ') }); }).observe({ type: 'layout-shift', buffered: true });
    });
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1500);
    console.log(w, path.slice(0, 22), JSON.stringify(await p.evaluate(() => window.__s), null, 0).slice(0, 1500));
    await p.close();
  }
  await ctx.close();
}
await b.close();
