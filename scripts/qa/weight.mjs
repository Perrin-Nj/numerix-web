// Real wire weight (compressed, encodedDataLength) per route on a cold cache, with a mid-range phone profile. Usage: node scripts/qa/weight.mjs [base]
import { chromium } from 'playwright';
const BASE = (process.argv[2] ?? 'http://localhost:13140').replace(/\/$/, '');
const b = await chromium.launch();
for (const route of ['/', '/play', '/parent/login', '/credits']) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, locale: 'fr-CA' });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const types = {}; const kinds = new Map();
  cdp.on('Network.responseReceived', (e) => kinds.set(e.requestId, e.type));
  cdp.on('Network.loadingFinished', (e) => { const t = kinds.get(e.requestId) ?? 'Other'; types[t] = (types[t] ?? 0) + e.encodedDataLength; });
  const t0 = Date.now();
  await p.goto(BASE + route, { waitUntil: 'networkidle' });
  const total = Object.values(types).reduce((a, c) => a + c, 0);
  console.log(`${route.padEnd(14)} wire ${(total / 1024) | 0} KB in ${Date.now() - t0} ms (localhost)  ` + Object.entries(types).map(([k, v]) => `${k} ${(v / 1024) | 0}K`).join(' '));
  await ctx.close();
}
await b.close();
