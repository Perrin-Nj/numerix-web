import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
const rows = new Map();
p.on('response', async (r) => {
  if (r.request().resourceType() !== 'script' || rows.has(r.url())) return;
  try {
    const t = await r.text();
    const sig = ['motion-dom|MotionValue|AnimatePresence', 'createLucideIcon', 'data-radix|@radix', 'QueryClient', 'intl-messageformat|IntlMessageFormat', 'driver.js|driver-popover', 'canvas-confetti|confetti', 'react-hook-form|useForm\\b', 'ReactDOM|react-dom', 'zod|ZodError', 'openapi-fetch|createClient', 'speechSynthesis', 'AudioContext'].filter((s) => new RegExp(s).test(t));
    rows.set(r.url(), [t.length, r.url().split('/').pop().slice(0, 24), sig.join(' ')]);
  } catch {}
});
await p.goto(process.argv[2] ?? 'http://localhost:3250/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
const v = [...rows.values()].sort((a, c) => c[0] - a[0]);
console.log(v.length, v.reduce((a, r) => a + r[0], 0));
for (const r of v.slice(0, 16)) console.log(...r);
await b.close();
