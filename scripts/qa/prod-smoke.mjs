// Fast QA of a live deployment, end to end, with a throw-away account that is DELETED at the end (even if a check fails).
// Usage: node scripts/qa/prod-smoke.mjs https://app.numerix.pro
import { chromium } from 'playwright';

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const jar = new Map();
const EMAIL = `qa-${Date.now()}@example.com`;
const PASSWORD = 'correct-horse-battery-qa';
let fails = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ` ${extra}`}`);
  if (!cond) fails++;
};
async function api(method, path, { body, mode = 'parent', headers = {} } = {}) {
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    redirect: 'manual',
    headers: { 'content-type': 'application/json', 'x-nx-mode': mode, 'accept-language': 'fr-CA', ...(cookie ? { cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const [pair] = sc.split(';');
    const i = pair.indexOf('=');
    if (/max-age=0/i.test(sc) || pair.slice(i + 1) === '') jar.delete(pair.slice(0, i));
    else jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* empty */
  }
  return { status: res.status, text, json };
}
const anyAnswer = (q) => (q.choices?.length ? q.choices[0] : q.kind === 'truefalse' ? true : q.items?.length ? q.items.map((i) => i.id) : q.kind === 'match' ? [] : 0);
const WORLDS = ['echecs', 'medecine', 'espace'];

try {
  // 1. account, child, consent, kid session
  let r = await api('POST', '/auth/register', { body: { email: EMAIL, password: PASSWORD, locale: 'fr-CA' } });
  ok('register throw-away parent', r.status === 201, r.text.slice(0, 100));
  r = await api('POST', '/children', { body: { display_name: 'QA', grade: 3, avatar_id: 'owl', pin: '4321' } });
  const kid = r.json;
  ok('create child', r.status === 201 && kid?.id, r.text.slice(0, 100));
  await api('POST', '/auth/consent', { body: { child_id: kid.id, version: '2026-10', accepted: true } });
  r = await api('POST', `/children/${kid.id}/token`, { body: { pin: '4321' } });
  ok('child signed in', r.status === 200 && jar.has('nx_child'));

  // 2. worlds: only the three focus worlds are on, a disabled one is refused
  r = await api('GET', `/children/${kid.id}/settings`);
  ok('new child has chess, medicine, space only', JSON.stringify([...(r.json?.enabled_worlds ?? [])].sort()) === JSON.stringify(['echecs', 'espace', 'medecine']), r.text.slice(0, 120));
  r = await api('POST', `/children/${kid.id}/sessions`, { mode: 'child', body: { world: 'nature', kind: 'chapter' }, headers: { 'idempotency-key': crypto.randomUUID() } });
  ok('a disabled world is refused', r.status === 422, `${r.status}`);
  r = await api('GET', '/worlds', { mode: 'child' });
  ok('world list answers', r.status === 200 && (r.json?.items?.length ?? 0) >= 3);

  // 3. journey: five written quests per world, all open
  for (const w of WORLDS) {
    r = await api('GET', `/children/${kid.id}/journey?world=${w}`, { mode: 'child' });
    const nodes = r.json?.nodes ?? [];
    ok(`${w}: journey has 5 quests, all open`, nodes.length === 5 && nodes.every((n) => n.state !== 'locked'), JSON.stringify(nodes.map((n) => n.state)));
  }

  // 4. a chapter in each world: 5 questions, each with a diagram, a specific reaction, an explanation
  for (const w of WORLDS) {
    r = await api('POST', `/children/${kid.id}/sessions`, { mode: 'child', body: { world: w, kind: 'chapter' }, headers: { 'idempotency-key': crypto.randomUUID() } });
    ok(`${w}: chapter starts with 5 questions`, r.status === 201 && r.json?.chapter_length === 5, `${r.status} ${r.text.slice(0, 80)}`);
    if (r.status !== 201) continue;
    const sid = r.json.id;
    const seen = new Set();
    let last;
    for (let i = 0; i < 5; i++) {
      const b = await api('POST', `/sessions/${sid}/beats`, { mode: 'child', headers: { 'idempotency-key': crypto.randomUUID() } });
      const q = b.json?.question;
      ok(`${w} q${i + 1}: diagram`, Boolean(q?.visual?.kind), JSON.stringify(q).slice(0, 80));
      const key = `${q?.prompt}|${JSON.stringify(q?.visual)}`; // two clock questions may share a prompt, never the same picture too
      ok(`${w} q${i + 1}: not a repeat, not generated`, !seen.has(key) && !/(avec reste|with remainder)/.test(q?.math_text ?? ''), q?.math_text);
      seen.add(key);
      last = await api('POST', `/sessions/${sid}/beats/${b.json.id}/answer`, { mode: 'child', body: { answer: anyAnswer(q) }, headers: { 'idempotency-key': crypto.randomUUID() } });
      ok(`${w} q${i + 1}: graded, explanation sent`, last.status === 200 && typeof last.json?.explain === 'string' && last.json.explain.length > 3, `${last.status}`);
      const den = await api('GET', `/sessions/${sid}/beats/${b.json.id}/narration?phase=denouement`, { mode: 'child' });
      const said = [...den.text.matchAll(/"delta":"([^"]*)"/g)].map((m) => m[1]).join('') || den.text;
      ok(`${w} q${i + 1}: reaction is about the question`, said.length > 15 && !/imprévu|Bravo, tu as trouvé|adventure goes on|Well done, you found it/.test(said), said.slice(0, 80));
    }
    ok(`${w}: chapter completes after 5`, last?.json?.session?.status === 'completed');
  }

  // 5. screens in a real browser: no console errors, worlds tab order, a question picture fits the stage
  const browser = await chromium.launch();
  const host = new URL(BASE).hostname;
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-CA' });
  await ctx.addCookies([...jar].map(([name, value]) => ({ name, value, domain: host, path: '/', secure: BASE.startsWith('https'), httpOnly: true, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
  page.on('console', (m) => m.type() === 'error' && !/favicon|service worker|ServiceWorker/i.test(m.text()) && errors.push(m.text().slice(0, 120)));
  const mark = () => errors.splice(0).map((e) => e);
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  const homeErrors = mark();
  const skip = page.getByRole('button', { name: /passer la visite|skip the tour/i });
  if (await skip.count()) await skip.first().click().catch(() => {});
  const text = await page.locator('main').innerText();
  ok('home: worlds block comes before the menu tiles', text.indexOf('Choisis un monde') > -1 && text.indexOf('Choisis un monde') < text.indexOf('Défis'), text.slice(0, 80));
  await page.goto(`${BASE}/play/worlds`, { waitUntil: 'networkidle' });
  const worldsErrors = mark();
  ok('worlds tab: button for disabled worlds', (await page.getByRole('button', { name: /mondes désactivés/i }).count()) === 1);
  const s = (await api('POST', `/children/${kid.id}/sessions`, { mode: 'child', body: { world: 'echecs', kind: 'chapter' }, headers: { 'idempotency-key': crypto.randomUUID() } })).json;
  await page.goto(`${BASE}/play/session/${s.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const box = await page.locator('main [role=img]').first().boundingBox();
  const stage = await page.locator('main [data-stage]').first().boundingBox();
  ok('question picture is inside its stage', Boolean(box && stage && box.y >= stage.y - 2 && box.y + box.height <= stage.y + stage.height + 2), JSON.stringify({ box, stage }));
  const sessionErrors = mark();
  ok('home: no browser errors', homeErrors.length === 0, homeErrors.slice(0, 2).join(' | '));
  ok('worlds tab: no browser errors', worldsErrors.length === 0, worldsErrors.slice(0, 2).join(' | '));
  ok('question screen: no browser errors', sessionErrors.length === 0, sessionErrors.slice(0, 2).join(' | '));
  await browser.close();
} finally {
  // 6. delete the throw-away account, then prove it is gone
  const del = await api('DELETE', '/account', { body: { password: PASSWORD } });
  ok('throw-away account deleted', del.status === 204, `${del.status} ${del.text.slice(0, 100)}`);
  jar.clear();
  const login = await api('POST', '/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  ok('deleted account can no longer sign in', login.status === 401 || login.status === 403 || login.status === 404, `${login.status}`);
}
console.log(fails ? `${fails} FAILED` : 'prod smoke: all checks pass');
process.exit(fails ? 1 : 0);
