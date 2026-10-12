// Fast end-to-end flows over HTTP (no browser): drives the app's own proxy like the UI does, with a cookie jar.
// Prints one line per check. Usage: node scripts/flows.mjs [baseUrl]    (default http://localhost:3000)
const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const jar = new Map();
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
r = await api('POST', '/auth/register', { body: { email: 'flows@example.com', password: 'correct-horse-battery', locale: 'fr-CA' } });
ok('register', r.status === 201 && jar.has('nx_parent') && !r.text.includes('mock-parent-token'), r.text.slice(0, 80));
r = await api('GET', '/children');
ok('seed children are listed', r.status === 200 && r.json.items.length >= 2);
const before = r.json.items.length;
r = await api('POST', '/children', { body: { display_name: 'Nora', grade: 3, avatar_id: 'owl', pin: '4321' } });
ok('create child', r.status === 201 && r.json.display_name === 'Nora' && r.json.has_pin === true);
const nora = r.json;
r = await api('GET', '/children');
ok('new child appears on the parent list', r.json.items.length === before + 1 && r.json.items.some((c) => c.id === nora.id));
ok('new child starts without consent', r.json.items.find((c) => c.id === nora.id).consent_given === false);

r = await api('POST', `/children/${nora.id}/token`, { body: { pin: '1234' } });
ok('wrong PIN refused', r.status === 403 && r.json.code === 'invalid_pin');
r = await api('POST', `/children/${nora.id}/token`, { body: { pin: '4321' } });
ok('own PIN accepted, child cookie set, token hidden', r.status === 200 && jar.has('nx_child') && !r.text.includes('mock-child-token'));

r = await api('POST', `/children/${nora.id}/sessions`, { mode: 'child', body: { world: 'nature', kind: 'chapter' } });
ok('no consent: play refused with a clear code', r.status === 403 && r.json.code === 'consent_missing');
r = await api('POST', '/auth/consent', { body: { child_id: nora.id, version: '2026-10', accepted: true } });
ok('consent recorded', r.status === 204);
r = await api('GET', '/children');
ok('consent visible on the parent list', r.json.items.find((c) => c.id === nora.id).consent_given === true);

// ── Child: home, feed, chapter
r = await api('GET', `/children/${nora.id}/home`, { mode: 'child' });
ok('child home loads', r.status === 200 && r.json.worlds.length === 8);
let cursor;
const ids = new Set();
for (let i = 0; i < 4; i++) {
  r = await api('GET', `/children/${nora.id}/feed?limit=5${cursor ? `&cursor=${cursor}` : ''}`, { mode: 'child' });
  r.json?.items?.forEach((it) => ids.add(it.id));
  cursor = r.json?.next_cursor;
}
ok('feed scrolls on forever with unique AI items', ids.size === 20 && Boolean(cursor));
r = await api('PUT', `/children/${nora.id}/feed/feed-1/reaction`, { mode: 'child', body: { liked: true, saved: false } });
ok('like stored', r.status === 200 && r.json.liked === true);
r = await api('GET', `/children/${nora.id}/feed?limit=5`, { mode: 'child' });
ok('like survives a reload of the feed', r.json.items[1].liked === true);

r = await api('POST', `/children/${nora.id}/sessions`, { mode: 'child', body: { world: 'nature', kind: 'chapter' }, headers: { 'idempotency-key': crypto.randomUUID() } });
ok('chapter starts after consent', r.status === 201);
const sid = r.json?.id;
const plan = [54, 6, [49, 4]];
for (const [i, answer] of plan.entries()) {
  r = await api('POST', `/sessions/${sid}/beats`, { mode: 'child', headers: { 'idempotency-key': crypto.randomUUID() } });
  const bid = r.json?.id;
  ok(`beat ${i}: question without answer`, Boolean(bid) && !r.text.includes('correct_answer'));
  r = await api('POST', `/sessions/${sid}/beats/${bid}/answer`, { mode: 'child', body: { answer }, headers: { 'idempotency-key': crypto.randomUUID() } });
  ok(`beat ${i}: graded (${r.json?.outcome})`, r.status === 200 && ['correct', 'erreur_typique', 'erreur_aleatoire'].includes(r.json?.outcome));
}
r = await api('GET', `/children/${nora.id}/collection`, { mode: 'child' });
ok('collection readable', r.status === 200);

// ── Pages render for a logged-in child
for (const path of ['/play/home', '/play/feed', '/play/worlds', '/play/collection', '/play/me']) {
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
