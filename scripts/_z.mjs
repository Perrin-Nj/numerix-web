import { chromium } from 'playwright';
import { parentLogin, kidEnter } from './lib/kid.mjs';
const BASE = 'http://localhost:3250';
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'fr-CA', viewport: { width: 390, height: 844 } });
const s = await ctx.newPage();
await parentLogin(s, BASE); await kidEnter(s, BASE);
const id = (await (await s.request.get(`${BASE}/api/session`)).json()).childId;
await s.evaluate((c) => localStorage.setItem(`nx:onboarding:${c}`, 'done'), id);
const home = new Map();
for (const path of ['/play/collection', '/play/home']) {
  const p = await ctx.newPage();
  const rows = new Map();
  p.on('response', async (r) => {
    if (r.request().resourceType() !== 'script' || rows.has(r.url())) return;
    try {
      const t = await r.text();
      const sig = ['motion-dom|AnimatePresence', 'createLucideIcon', 'data-radix', 'QueryClient', 'IntlMessageFormat', 'driver-popover', 'confetti', 'useForm\\b', 'ReactDOM', 'createClient', 'speechSynthesis', 'AudioContext', 'virtualizer|Virtualizer', 'IntersectionObserver'].filter((x) => new RegExp(x).test(t));
      rows.set(r.url(), [t.length, r.url().split('/').pop().slice(0, 22), sig.join(' ')]);
    } catch {}
  });
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  home.set(path, rows);
  await p.close();
}
const base = home.get('/play/collection');
const h = home.get('/play/home');
console.log('home-only chunks:');
for (const [u, r] of h) if (!base.has(u)) console.log(...r);
console.log('shared:');
for (const [u, r] of [...base].sort((a, c) => c[1][0] - a[1][0]).slice(0, 14)) console.log(...r);
await b.close();
