// LCP of /play/home and /play/worlds and the image bytes each screen downloads, on a throttled phone (4x CPU, 4G).
// Usage: node scripts/play-perf.mjs [baseUrl]   (needs the demo account; run against a production build)
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from './lib/kid.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await parentLogin(page, BASE);
await kidEnter(page, BASE, 'Zoé', '1234');
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });

for (const path of ['/play/home', '/play/worlds', '/play/journey/cuisine']) {
  let bytes = 0;
  let count = 0;
  const onResp = async (r) => {
    if (/\/assets\//.test(r.url())) {
      count++;
      bytes += Number((await r.allHeaders())['content-length'] ?? 0);
    }
  };
  page.on('response', onResp);
  await page.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const lcp = await page.evaluate(() => window.__lcp);
  page.off('response', onResp);
  console.log(`${path.padEnd(24)} LCP ${lcp} ms, ${count} asset images, ${(bytes / 1024).toFixed(0)} KB`);
}
await browser.close();
