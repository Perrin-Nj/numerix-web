// Backend contract fuzz + data integrity against the QA API (default :8130/v1). One line per check, FAIL on any 5xx or wrong boundary.
// Usage: node scripts/qa/api-fuzz.mjs [apiUrl]
import { solve } from '../lib/solver.mjs';
const API = (process.argv[2] ?? 'http://localhost:8130/v1').replace(/\/$/, '');
let fails = 0, calls = 0; const five = [];
const T = {};
async function call(method, path, { body, token, raw, headers = {} } = {}) {
  calls++;
  const res = await fetch(API + path, { method, headers: { ...(raw === undefined ? { 'content-type': 'application/json' } : { 'content-type': 'application/json' }), ...(token ? { authorization: `Bearer ${token}` } : {}), 'x-forwarded-for': headers['x-forwarded-for'] ?? '10.9.8.7', ...headers }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch {}
  if (res.status >= 500) five.push(`${res.status} ${method} ${path} ${text.slice(0, 80)}`);
  return { status: res.status, json, text, ct: res.headers.get('content-type') ?? '', h: res.headers };
}
const ok = (n, c, x = '') => { console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${c ? '' : ' ' + x}`); if (!c) fails++; };
const problem = (r) => /problem\+json|json/.test(r.ct) && typeof r.json?.code === 'string';
const email = () => `qa${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.com`;
const ip = () => ({ 'x-forwarded-for': `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });

// validation
for (const [n, body] of [['empty', {}], ['bad email', { email: 'nope', password: 'correct-horse-battery' }], ['short password', { email: email(), password: 'a' }], ['huge email', { email: 'a'.repeat(5000) + '@x.com', password: 'correct-horse-battery' }], ['wrong types', { email: 5, password: [] }], ['unicode/sql', { email: "' OR 1=1 --@x.com", password: 'correct-horse-battery' }]]) {
  const r = await call('POST', '/auth/register', { body, headers: ip() });
  ok(`register ${n}: 4xx problem shape`, r.status >= 400 && r.status < 500 && r.status !== 429 ? problem(r) : r.status === 429, `${r.status} ${r.text.slice(0, 80)}`);
}
let r = await call('POST', '/auth/register', { raw: '{bad json', headers: ip() }); ok('malformed JSON: 400/422 not 5xx', [400, 422].includes(r.status), r.status + r.text.slice(0, 60));
r = await call('POST', '/auth/register', { raw: JSON.stringify({ email: email(), password: 'x'.repeat(2_000_000) }), headers: ip() }); ok('2MB body refused (4xx)', r.status >= 400 && r.status < 500, String(r.status));
r = await call('POST', '/auth/login', { raw: '', headers: ip() }); ok('login empty body 4xx', r.status >= 400 && r.status < 500, String(r.status));
r = await call('GET', '/nope'); ok('unknown path 404 problem', r.status === 404, `${r.status} ${r.text.slice(0, 60)}`);
r = await call('DELETE', '/worlds'); ok('wrong method 405/404/401', [404, 405, 401].includes(r.status), String(r.status));
r = await call('GET', '/health'); ok('health 200', r.status === 200);

// parent + child
const em = email();
r = await call('POST', '/auth/register', { body: { email: em, password: 'correct-horse-battery', locale: 'fr-CA' }, headers: ip() });
ok('register ok 201', r.status === 201, r.text.slice(0, 80)); T.parent = r.json?.access_token;
r = await call('POST', '/auth/register', { body: { email: em, password: 'correct-horse-battery', locale: 'fr-CA' }, headers: ip() }); ok('duplicate register 409', r.status === 409 && problem(r), `${r.status}`);
r = await call('POST', '/auth/login', { body: { email: em, password: 'wrong-password-123' }, headers: ip() }); ok('wrong password 401 problem', r.status === 401 && problem(r), `${r.status}`);
r = await call('POST', '/children', { token: T.parent, body: { display_name: 'QA', grade: 3, avatar_id: 'owl', pin: '4321' } }); ok('create child 201', r.status === 201); const kid = r.json?.id;
for (const [n, b] of [['grade 0', { display_name: 'A', grade: 0, avatar_id: 'owl', pin: '1234' }], ['grade 99', { display_name: 'A', grade: 99, avatar_id: 'owl', pin: '1234' }], ['pin letters', { display_name: 'A', grade: 2, avatar_id: 'owl', pin: 'abcd' }], ['empty name', { display_name: '', grade: 2, avatar_id: 'owl', pin: '1234' }], ['xss name', { display_name: '<script>alert(1)</script>', grade: 2, avatar_id: 'owl', pin: '1234' }]]) {
  r = await call('POST', '/children', { token: T.parent, body: b }); ok(`child ${n}: 4xx (xss may 201 but must be escaped client side)`, r.status < 500 && (n === 'xss name' || r.status >= 400), `${r.status}`);
}
// boundaries
for (const [m, p] of [['GET', '/children'], ['GET', `/children/${kid}`], ['POST', '/children'], ['GET', `/children/${kid}/journey?world=nature`], ['POST', `/children/${kid}/sessions`], ['GET', `/children/${kid}/progress`], ['GET', `/children/${kid}/export`], ['GET', '/worlds']]) {
  r = await call(m, p, { body: m === 'POST' ? {} : undefined }); ok(`no token ${m} ${p.replace(kid ?? '', ':id')}: 401`, r.status === 401 || (p === '/worlds' && r.status === 200), `${r.status}`);
}
r = await call('GET', '/children', { token: 'garbage.token.value' }); ok('garbage token 401', r.status === 401 && problem(r), `${r.status}`);
r = await call('POST', `/children/${kid}/token`, { token: T.parent, body: { pin: '4321' } }); ok('child token blocked without consent 403', r.status === 403 && r.json?.code === 'consent_missing', `${r.status} ${r.text.slice(0, 60)}`);
await call('POST', '/auth/consent', { token: T.parent, body: { child_id: kid, version: '2026-10', accepted: true } });
r = await call('POST', `/children/${kid}/token`, { token: T.parent, body: { pin: '4321' } }); T.child = r.json?.access_token; ok('child token issued', r.status === 200 && !!T.child, `${r.status}`);
r = await call('POST', '/children', { token: T.child, body: { display_name: 'X', grade: 2, avatar_id: 'owl', pin: '1234' } }); ok('child token cannot create child 403', r.status === 403, `${r.status}`);
r = await call('GET', '/children', { token: T.child }); ok('child token cannot list family 403', r.status === 403, `${r.status}`);
r = await call('GET', `/children/${kid}/export`, { token: T.child }); ok('child token cannot export 403', r.status === 403, `${r.status}`);
r = await call('PUT', `/children/${kid}/settings`, { token: T.child, body: { daily_minutes: 999 } }); ok('child token cannot change settings 403/405', [403, 405].includes(r.status), `${r.status}`);
r = await call('POST', `/children/${kid}/sessions`, { token: T.parent, body: { world: 'nature', kind: 'chapter' }, headers: { 'idempotency-key': crypto.randomUUID() } }); ok('parent token cannot start a session 403', r.status === 403, `${r.status}`);
// other family
r = await call('POST', '/auth/register', { body: { email: email(), password: 'correct-horse-battery', locale: 'fr-CA' }, headers: ip() }); const other = r.json?.access_token;
for (const p of [`/children/${kid}`, `/children/${kid}/progress`, `/children/${kid}/export`, `/children/${kid}/journey?world=nature`]) { r = await call('GET', p, { token: other }); ok(`other family ${p.replace(kid, ':id')}: 403/404`, [403, 404].includes(r.status), `${r.status}`); }
r = await call('GET', '/children/00000000-0000-0000-0000-000000000000', { token: T.parent }); ok('unknown child 404 problem', r.status === 404 && problem(r), `${r.status}`);
r = await call('GET', '/children/not-a-uuid', { token: T.parent }); ok('bad id 400/404/422', [400, 404, 422].includes(r.status), `${r.status}`);
r = await call('GET', "/sessions/'%20OR%201=1", { token: T.child }); ok('sqli session id 4xx', r.status >= 400 && r.status < 500, `${r.status}`);
// sessions: shapes, integrity
r = await call('POST', `/children/${kid}/sessions`, { token: T.child, body: { world: 'zzz', kind: 'chapter' }, headers: { 'idempotency-key': crypto.randomUUID() } }); ok('unknown world 4xx', r.status >= 400 && r.status < 500, `${r.status}`);
r = await call('POST', `/children/${kid}/sessions`, { token: T.child, body: { world: 'nature', kind: 'chapter' } }); ok('missing Idempotency-Key 4xx or handled', r.status < 500, `${r.status}`);
const jr = await call('GET', `/children/${kid}/journey?world=nature`, { token: T.child }); ok('journey 200', jr.status === 200, `${jr.status}`);
const locked = JSON.stringify(jr.json ?? {}).match(/"locked"/g)?.length ?? 0;
const worlds = (await call('GET', '/worlds', { token: T.child })).json?.items?.map((w) => w.id) ?? [];
ok(`worlds listed (${worlds.length})`, worlds.length >= 20);
const seen = new Map(); let served = 0, lockedServed = 0; const kinds = new Set();
for (const w of worlds.slice(0, 8)) {
  const s = await call('POST', `/children/${kid}/sessions`, { token: T.child, body: { world: w, kind: 'chapter' }, headers: { 'idempotency-key': crypto.randomUUID() } });
  if (s.status !== 201) { ok(`${w}: session starts`, false, `${s.status} ${s.text.slice(0, 80)}`); continue; }
  for (let i = 0; i < 6; i++) {
    const b = await call('POST', `/sessions/${s.json.id}/beats`, { token: T.child, headers: { 'idempotency-key': crypto.randomUUID() } });
    if (b.status !== 200 && b.status !== 201) { if (!(b.status === 409 || b.status === 422)) ok(`${w} beat ${i}`, false, `${b.status} ${b.text.slice(0, 80)}`); break; }
    served++; const q = b.json.question; kinds.add(q.kind ?? q.type ?? q.input ?? 'n/a');
    const key = q.id ?? b.json.question_id ?? q.math_text + q.prompt; if (seen.has(key)) ok(`no repeat for child: ${key}`, false, `${w} again`); seen.set(key, w);
    if (/correct|answer_value|solution/.test(JSON.stringify(q))) ok(`${w} beat ${i}: no answer leak in question`, false, Object.keys(q).join(','));
    let ans; try { ans = solve(q.math_text); } catch { ans = q.choices?.[0]; }
    const a = await call('POST', `/sessions/${s.json.id}/beats/${b.json.id}/answer`, { token: T.child, body: { answer: ans }, headers: { 'idempotency-key': crypto.randomUUID() } });
    if (a.status >= 400 && a.status !== 422) ok(`${w} answer ${i}`, false, `${a.status} ${a.text.slice(0, 80)}`);
    if (a.json?.session?.status === 'completed') break;
  }
}
ok(`beats served ${served}, question kinds seen: ${[...kinds].join(',')}`, served > 20);
// idempotency replay
{
  const key = crypto.randomUUID();
  const s = await call('POST', `/children/${kid}/sessions`, { token: T.child, body: { world: worlds[9] ?? 'nature', kind: 'chapter' }, headers: { 'idempotency-key': key } });
  const s2 = await call('POST', `/children/${kid}/sessions`, { token: T.child, body: { world: worlds[9] ?? 'nature', kind: 'chapter' }, headers: { 'idempotency-key': key } });
  ok('idempotent replay returns the same session', s.json?.id && s.json.id === s2.json?.id, `${s.status}/${s2.status}`);
}
// rate limit
let n429 = 0, shape = true; const rip = ip();
for (let i = 0; i < 25; i++) { const x = await call('POST', '/auth/login', { body: { email: em, password: 'wrong-password-123' }, headers: rip }); if (x.status === 429) { n429++; shape &&= problem(x) && !!x.h.get('retry-after'); } }
ok(`login brute force limited (429 x${n429}), problem shape + Retry-After`, n429 > 0 && shape);
const rr = []; for (let i = 0; i < 8; i++) rr.push((await call('POST', '/auth/register', { body: { email: email(), password: 'correct-horse-battery', locale: 'fr-CA' }, headers: { 'x-forwarded-for': '10.55.55.55' } })).status);
ok(`register per-IP limited: ${rr.join(',')}`, rr.includes(429));
console.log(`${calls} calls, 5xx: ${five.length}${five.length ? '\n' + five.slice(0, 5).join('\n') : ''}`);
if (five.length) fails++;
console.log(fails ? `${fails} FAILED` : 'all pass');
process.exit(fails ? 1 : 0);
