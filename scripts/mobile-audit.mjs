// Phone layout audit, one line per finding, no screenshots unless SHOTS=dir is set.
// Usage: node scripts/mobile-audit.mjs [baseUrl]   (WIDTH=360 HEIGHT=740 to change the viewport)
import { chromium } from 'playwright';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const W = Number(process.env.WIDTH ?? 360);
const H = Number(process.env.HEIGHT ?? 740);
const ZOE = '11111111-1111-4111-8111-111111111111';
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
const api = (m, p, b) => ctx.request.fetch(`${BASE}/api/v1${p}`, { method: m, headers: { 'content-type': 'application/json' }, data: b });
await api('POST', '/auth/register', { email: `m${Date.now()}@example.com`, password: 'correct-horse-battery', locale: 'fr-CA' });
await api('POST', '/auth/consent', { child_id: ZOE, accepted: true });
await api('POST', `/children/${ZOE}/token`, { pin: '1234' });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem(`nx:onboarding:${'11111111-1111-4111-8111-111111111111'}`, 'done'));
let bad = 0;
const say = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) bad++;
};

const measure = () =>
  page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = { overflowX: document.documentElement.scrollWidth - vw, wide: [], small: [], tiny: [], covered: 0 };
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 2 && cs.position !== 'fixed' && !el.closest('[aria-hidden="true"], svg, [data-allow-overflow]')) out.wide.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} ${Math.round(r.right)}`);
      const interactive = el.matches('button, a[href], [role="button"], input, select, [role="switch"], [role="radio"]');
      const hit = el.matches('[role="switch"]') ? el.parentElement.getBoundingClientRect() : r; // switches pad their hit area
      if (interactive && (hit.width < 44 || hit.height < 44) && !el.closest('[aria-hidden="true"]')) out.small.push(`${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      const fs = parseFloat(cs.fontSize);
      if (fs < 14 && el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) out.tiny.push(`${el.textContent.trim().slice(0, 24)} ${fs}px`);
    }
    return out;
  });

const routes = ['/', '/play/home', '/play/feed', '/play/worlds', '/play/journey/nature', '/play/collection', '/play/challenges', '/play/me', '/parent/login'];
for (const route of routes) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(900);
  const m = await measure();
  say(m.overflowX <= 1, `${route}: no sideways scroll${m.overflowX > 1 ? ` (+${m.overflowX}px: ${m.wide.slice(0, 2).join(' | ')})` : ''}`);
  say(m.small.length === 0, `${route}: touch targets >= 44px${m.small.length ? ` (${m.small.length}: ${[...new Set(m.small)].slice(0, 4).join(' | ')})` : ''}`);
  say(m.tiny.length === 0, `${route}: text >= 14px${m.tiny.length ? ` (${m.tiny.length}: ${[...new Set(m.tiny)].slice(0, 3).join(' | ')})` : ''}`);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${route.replace(/\W+/g, '_') || 'root'}.png` });
}

// A chapter on a phone: question fits without the page growing sideways, choices reachable
await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' }).catch(() => {});
await page.getByRole('button', { name: /plus tard/i }).click({ timeout: 4000 }).catch(() => {});
await page.getByRole('button', { name: /jouer|continuer|reprendre/i }).first().click().catch(() => {});
await page.waitForURL('**/play/session/**', { timeout: 60000 }).catch(() => {});
await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /^D\s/.test(b.innerText)), null, { timeout: 40000 }).catch(() => {});
await page.waitForTimeout(900); // toasts and choices scale in; measure at full size
const m = await measure();
say(m.overflowX <= 1, `story: no sideways scroll${m.overflowX > 1 ? ` (+${m.overflowX}px)` : ''}`);
say(m.small.length === 0, `story: touch targets >= 44px${m.small.length ? ` (${[...new Set(m.small)].slice(0, 4).join(' | ')})` : ''}`);
const reach = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].filter((x) => /^[ABCD]\s/.test(x.innerText));
  return b.map((x) => Math.round(x.getBoundingClientRect().bottom));
});
say(reach.length === 4, `story: four choices found (${reach.join(',')} of ${H}px high screen)`);
const scrollNeeded = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
console.log(`info story page is ${scrollNeeded}px taller than the screen`);
if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/story.png` });

await browser.close();
console.log(bad ? `${bad} FAILED` : 'all mobile checks pass');
process.exit(bad ? 1 : 0);
