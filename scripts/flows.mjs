// Fast end-to-end flows over HTTP (no browser): drives the app's own proxy like the UI does, with a cookie jar.
// Prints one line per check. Usage: node scripts/flows.mjs [baseUrl]    (default http://localhost:3000)
import { solve, wrong } from './lib/solver.mjs';
const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const jar = new Map();
const FLOW_EMAIL = `flows${Date.now()}@example.com`;
let fails = 0;

async function call(method, path, { body, mode = 'parent', headers = {} } = {}) {
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect: 'manual',
    headers: { 'content-type': 'application/json', 'x-nx-mode': mode, 'accept-language': 'fr-CA', ...(cookie ? { cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const [pair] = sc.split(';');
    const i = pair.indexOf('=');
    const name = pair.slice(0, i);
    const value = pair.slice(i + 1);
    if (/max-age=0/i.test(sc) || value === '') jar.delete(name);
    else jar.set(name, value);
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html or empty */
  }
  return { status: res.status, text, json, headers: res.headers };
}
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ` ${extra}`}`);
  if (!cond) fails++;
};
const api = (method, path, opts) => call(method, `/api/v1${path}`, opts);

// ── Doors on the first screen
let r = await call('GET', '/', { headers: { accept: 'text/html' } });
ok('welcome has the kid door', r.status === 200 && r.text.includes('Je suis un enfant'));
ok('welcome has the grown-up door', r.text.includes('Je suis un adulte'));
r = await call('GET', '/play', { headers: { accept: 'text/html' } });
ok('/play opens for a kid with no adult logged in', r.status === 200);
r = await call('GET', '/parent', { headers: { accept: 'text/html' } });
ok('/parent asks an anonymous visitor to log in', r.status === 307 || r.status === 302 || r.status === 308);

// ── Parent: account, child with PIN, consent
r = await api('POST', '/auth/register', { body: { email: FLOW_EMAIL, password: 'correct-horse-battery', locale: 'fr-CA' } });
ok('register', r.status === 201 && jar.has('nx_parent') && !r.text.includes('access_token'), r.text.slice(0, 80));
// Known device: the backend's nx_device cookie survives the proxy, and alone it reopens the app without signing in
const device = jar.get('nx_device');
ok('device cookie is kept after register', Boolean(device));
jar.clear();
jar.set('nx_device', device ?? '');
r = await api('POST', '/auth/device');
ok('known device reopens without signing in, token hidden', r.status === 200 && jar.has('nx_parent') && !r.text.includes('access_token'), r.text.slice(0, 80));
ok('device cookie is rotated', Boolean(jar.get('nx_device')) && jar.get('nx_device') !== device);
r = await api('GET', '/children');
ok('a new account starts without children', r.status === 200 && r.json.items.length === 0);
const before = r.json.items.length;
r = await api('POST', '/children', { body: { display_name: 'Nora', grade: 3, avatar_id: 'owl', pin: '4321' } });
ok('create child', r.status === 201 && r.json.display_name === 'Nora' && r.json.has_pin === true);
const nora = r.json;
r = await api('GET', '/children');
ok('new child appears on the parent list', r.json.items.length === before + 1 && r.json.items.some((c) => c.id === nora.id));
ok('new child starts without consent', r.json.items.find((c) => c.id === nora.id).consent_given === false);

r = await api('POST', `/children/${nora.id}/token`, { body: { pin: '4321' } });
ok('token refused without consent', r.status === 403 && r.json?.code === 'consent_missing' && !jar.has('nx_child'), r.text.slice(0, 80));
r = await api('POST', '/auth/consent', { body: { child_id: nora.id, version: '2026-10', accepted: true } });
ok('parent gives consent', r.status === 204, r.text.slice(0, 80));
r = await api('POST', `/children/${nora.id}/token`, { body: { pin: '1234' } });
ok('wrong PIN refused', r.status === 403 && r.json.code === 'invalid_pin');
r = await api('POST', `/children/${nora.id}/token`, { body: { pin: '4321' } });
ok('own PIN accepted, child cookie set, token hidden', r.status === 200 && jar.has('nx_child') && !r.text.includes('access_token'));

// Two chapters in two worlds: each is its own story, every answer is solved from the question itself
const scenes = [];
for (const [world, skill] of [['nature', 'ARI-OPE-A06a'], ['espace', 'ARI-OPE-A07a']]) {
  r = await api('POST', `/children/${nora.id}/sessions`, { mode: 'child', body: { world, kind: 'chapter', skill_id: skill }, headers: { 'idempotency-key': crypto.randomUUID() } });
  ok(`${world}: chapter starts after consent`, r.status === 201 && r.json.world === world);
  const sid = r.json?.id;
  let last;
  for (let i = 0; i < 3; i++) {
    r = await api('POST', `/sessions/${sid}/beats`, { mode: 'child', headers: { 'idempotency-key': crypto.randomUUID() } });
    const beat = r.json;
    ok(`${world} beat ${i}: question without answer, skill kept`, Boolean(beat?.id) && !r.text.includes('correct_answer') && beat.skill_id === skill);
    if (i === 0) {
      const sc = await call('GET', `/api/v1/sessions/${sid}/beats/${beat.id}/narration?phase=scene`, { mode: 'child' });
      scenes.push([...sc.text.matchAll(/"delta":"([^"]*)"/g)].map((m) => m[1]).join(''));
    }
    const answer = solve(beat.question.math_text);
    ok(`${world} beat ${i}: solvable choice present`, beat.question.choices.some((c) => JSON.stringify(c) === JSON.stringify(answer)), beat.question.math_text);
    last = await api('POST', `/sessions/${sid}/beats/${beat.id}/answer`, { mode: 'child', body: { answer }, headers: { 'idempotency-key': crypto.randomUUID() } });
    ok(`${world} beat ${i}: graded correct`, last.status === 200 && last.json?.outcome === 'correct', JSON.stringify(last.json).slice(0, 80));
  }
  ok(`${world}: chapter completes with a card for that world`, last.json?.session?.status === 'completed' && last.json.rewards.some((x) => x.type === 'card_earned' && x.card.world === world));
}
// Card threshold: 2 right answers out of 3 (67%) is below 70%, so no card
{
  r = await api('POST', `/children/${nora.id}/sessions`, { mode: 'child', body: { world: 'sport', kind: 'chapter', skill_id: 'ARI-OPE-A06a' }, headers: { 'idempotency-key': crypto.randomUUID() } });
  const sid = r.json?.id;
  let last;
  for (let i = 0; i < 3; i++) {
    r = await api('POST', `/sessions/${sid}/beats`, { mode: 'child', headers: { 'idempotency-key': crypto.randomUUID() } });
    const beat = r.json;
    const right = solve(beat.question.math_text);
    const answer = i === 0 ? wrong(beat.question.choices, right) : right;
    last = await api('POST', `/sessions/${sid}/beats/${beat.id}/answer`, { mode: 'child', body: { answer }, headers: { 'idempotency-key': crypto.randomUUID() } });
  }
  ok('2 of 3 right: chapter completes without a card', last.json?.session?.status === 'completed' && !last.json.rewards.some((x) => x.type === 'card_earned'), JSON.stringify(last.json?.rewards ?? []).slice(0, 100));
}
// After a wrong answer the next exercise is a different one, not a replay
{
  r = await api('POST', `/children/${nora.id}/sessions`, { mode: 'child', body: { world: 'nature', kind: 'chapter', skill_id: 'ARI-OPE-A06a' }, headers: { 'idempotency-key': crypto.randomUUID() } });
  const sid = r.json?.id;
  r = await api('POST', `/sessions/${sid}/beats`, { mode: 'child', headers: { 'idempotency-key': crypto.randomUUID() } });
  const first = r.json;
  await api('POST', `/sessions/${sid}/beats/${first.id}/answer`, { mode: 'child', body: { answer: wrong(first.question.choices, solve(first.question.math_text)) }, headers: { 'idempotency-key': crypto.randomUUID() } });
  r = await api('POST', `/sessions/${sid}/beats`, { mode: 'child', headers: { 'idempotency-key': crypto.randomUUID() } });
  ok('wrong answer: the next exercise is different', r.status < 300 && r.json.question.math_text !== first.question.math_text, `${first.question.math_text} / ${r.json?.question?.math_text}`);
}
// Challenges and the welcome gift are server state
{
  r = await api('GET', `/children/${nora.id}/challenges`, { mode: 'child' });
  ok('challenges: the catalogue is listed with a status', r.status === 200 && r.json.items.length > 0 && r.json.items.every((c) => ['available', 'active', 'done'].includes(c.status)), r.text.slice(0, 80));
  const first = r.json.items.find((c) => c.status === 'available');
  r = await api('POST', `/children/${nora.id}/challenges/${first.id}/accept`, { mode: 'child' });
  ok('challenges: accepting makes it active', r.status === 200 && r.json.status === 'active', r.text.slice(0, 80));
  r = await api('POST', `/children/${nora.id}/challenges/${first.id}/accept`, { mode: 'child' });
  ok('challenges: accepting twice is harmless', r.status === 200 && r.json.status === 'active');
  r = await api('GET', `/children/${nora.id}/home`, { mode: 'child' });
  ok('home: the open challenges are counted', r.json?.active_challenges > 0, String(r.json?.active_challenges));
  const giftOn = r.json?.gift_available === true;
  if (!giftOn) {
    // FEATURE_WELCOME_GIFT is off: no gift is offered and a claim is refused
    r = await api('POST', `/children/${nora.id}/gift/claim`, { mode: 'child' });
    ok('gift off: nothing on offer and a claim is refused', r.status === 404, String(r.status));
  } else {
    r = await api('POST', `/children/${nora.id}/gift/claim`, { mode: 'child' });
    const giftCard = r.json?.id;
    ok('gift: first claim creates the card', r.status === 201 && Boolean(giftCard), r.text.slice(0, 80));
    r = await api('POST', `/children/${nora.id}/gift/claim`, { mode: 'child' });
    ok('gift: second claim returns the same card', r.status === 200 && r.json.id === giftCard);
    r = await api('GET', `/children/${nora.id}/home`, { mode: 'child' });
    ok('home: the gift is gone after the claim', r.json?.gift_available === false);
  }
}
// Subscription gate, driven by the admin API of the platform (skipped when no admin token is available, e.g. against a locked-down deployment)
{
  const ADMIN = process.env.PLATFORM_URL ?? 'http://localhost:8081';
  const adminToken = process.env.ADMIN_API_TOKEN ?? 'dev-admin-token';
  const admin = async (method, path, body) => {
    const res = await fetch(`${ADMIN}/admin/v1${path}`, { method, headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  const found = BASE.includes('localhost') ? await admin('GET', `/parents?q=${FLOW_EMAIL}`) : { status: 0 };
  const pid = found.json?.items?.[0]?.id;
  if (pid) {
    const startAs = async () => api('POST', `/children/${nora.id}/sessions`, { mode: 'child', body: { world: 'cuisine', kind: 'chapter' }, headers: { 'idempotency-key': crypto.randomUUID() } });
    await admin('PATCH', `/parents/${pid}`, { subscription: { status: 'unpaid' } });
    r = await startAs();
    ok('unpaid parent: Play is refused with a clear reason', r.status === 402 && r.json?.code === 'subscription_inactive', r.text.slice(0, 100));
    await admin('PATCH', `/parents/${pid}`, { subscription: { status: 'paid' } });
    r = await startAs();
    ok('paid parent: Play works again', r.status === 201, r.text.slice(0, 100));
    await admin('PATCH', `/parents/${pid}`, { status: 'blocked', blocked_reason: 'flows test' });
    r = await startAs();
    ok('blocked parent: Play is refused', r.status === 403 && r.json?.code === 'account_blocked', r.text.slice(0, 100));
    await admin('PATCH', `/parents/${pid}`, { status: 'active' });
    r = await startAs();
    ok('unblocked parent: Play works again', r.status === 201, r.text.slice(0, 100));
  }
}
ok('two worlds tell different stories', scenes.length === 2 && scenes[0] !== scenes[1] && scenes.every((x) => x.length > 80));
r = await api('GET', `/children/${nora.id}/collection`, { mode: 'child' });
ok('collection readable', r.status === 200);

// ── Pages render for a logged-in child
for (const path of ['/play/home', '/play/feed', '/play/worlds', '/play/collection', '/play/challenges', '/play/quest', '/play/me']) {
  r = await call('GET', path, { headers: { accept: 'text/html' } });
  ok(`page ${path}`, r.status === 200);
}

// ── Cleanup so reruns stay tidy
r = await api('DELETE', `/children/${nora.id}`);
ok('delete child', r.status === 204);
r = await api('GET', '/children');
ok('deleted child is gone', !r.json.items.some((c) => c.id === nora.id));

console.log(fails ? `\n${fails} FAILED` : '\nall flows pass');
process.exit(fails ? 1 : 0);
