// Contract inventory: every API call the frontend makes must exist in contracts/openapi.yaml (kid and parent API)
// or contracts/openapi.admin.yaml (admin API), and every operation must be described in contracts/BACKEND_INTEGRATION.md.
// Also checks that the guide names every error code, event kind, cookie and env var the code uses, and that every
// BE item has an owner, a priority and a test. No dependencies. Node 22.
// Usage: node scripts/api-inventory.mjs [--verbose]     exit 1 when something is missing.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const verbose = process.argv.includes('--verbose');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
let fails = 0;
const counts = {};
const say = (kind, msg) => {
  counts[kind] = (counts[kind] ?? 0) + 1;
  if (kind === 'FAIL') fails++;
  if (kind !== 'ok' || verbose) console.log(`${kind.padEnd(4)} ${msg}`);
};

// ───────── files ─────────
function walk(dir, out = []) {
  if (!existsSync(join(ROOT, dir))) return out;
  for (const name of readdirSync(join(ROOT, dir))) {
    if (name === 'node_modules' || name === '.next') continue;
    const rel = `${dir}/${name}`;
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx|mjs)$/.test(name) && !/(\.stories\.|\.test\.|schema\.d\.ts)/.test(name)) out.push(rel);
  }
  return out;
}

// ───────── openapi (tiny parser: only paths, methods, operationId) ─────────
function parseOpenapi(file) {
  const ops = new Map(); // "GET /path" -> operationId
  let inPaths = false;
  let path = null;
  let method = null;
  for (const line of read(file).split(/\r?\n/)) {
    if (/^paths:\s*$/.test(line)) { inPaths = true; continue; }
    if (inPaths && /^\S/.test(line) && !line.startsWith('#')) inPaths = false;
    if (!inPaths) continue;
    let m = /^ {2}(\/[^:\s]*):\s*$/.exec(line);
    if (m) { path = m[1]; method = null; continue; }
    m = /^ {4}(get|post|put|patch|delete):\s*$/.exec(line);
    if (m && path) { method = m[1].toUpperCase(); ops.set(`${method} ${path}`, ''); continue; }
    m = /^ {6}operationId:\s*(\S+)/.exec(line);
    if (m && path && method) ops.set(`${method} ${path}`, m[1]);
  }
  return ops;
}
const norm = (p) => p.replace(/\{[^}]*\}/g, '{}').replace(/\/+$/, '') || '/';
const normKey = (k) => { const i = k.indexOf(' '); return `${k.slice(0, i)} ${norm(k.slice(i + 1))}`; };

const kidOps = parseOpenapi('contracts/openapi.yaml');
const adminFile = 'contracts/openapi.admin.yaml';
const adminOps = existsSync(join(ROOT, adminFile)) ? parseOpenapi(adminFile) : new Map();
const kidIndex = new Map([...kidOps].map(([k, v]) => [normKey(k), { key: k, id: v }]));
const adminIndex = new Map([...adminOps].map(([k, v]) => [normKey(k), { key: k, id: v }]));

// ───────── frontend calls ─────────
const calls = []; // { key: "GET /path", file, api: 'kid' | 'admin' | 'app' }
const toPath = (s) => '/' + s.replace(/^\/+/, '').split('?')[0].replace(/\$\{[^}]*\}/g, '{}');

for (const file of walk('src')) {
  const text = read(file);
  const rel = file;
  // openapi-fetch client: api.GET('/children/{childId}', ...)
  for (const m of text.matchAll(/\bapi\.(GET|POST|PUT|PATCH|DELETE)\(\s*'([^']+)'/g)) calls.push({ key: `${m[1]} ${m[2]}`, file: rel, api: 'kid' });
  // platform-hooks: call<T>('GET', '/subscription')  or call('POST', `/notifications/${id}/read`)
  for (const m of text.matchAll(/\bcall\s*(?:<[^()]*>)?\(\s*'(GET|POST|PUT|PATCH|DELETE)'\s*,\s*([`'])([^`']*)\2/g)) calls.push({ key: `${m[1]} ${toPath(m[3])}`, file: rel, api: 'kid' });
  // plain fetch to the proxy or to app routes
  for (const m of text.matchAll(/\bfetch\(\s*([`'])(\/api\/[^`']*)\1(?:\s*,\s*\{([^}]*)\})?/g)) {
    const url = m[2];
    const method = /method:\s*'([A-Z]+)'/.exec(m[3] ?? '')?.[1] ?? 'GET';
    if (url.startsWith('/api/v1/')) calls.push({ key: `${method} ${toPath(url.slice('/api/v1'.length))}`, file: rel, api: 'kid' });
    else calls.push({ key: `${method} ${toPath(url)}`, file: rel, api: 'app' });
  }
  // calls the proxy and the health route make to the backend itself
  for (const m of text.matchAll(/fetch\(\s*`\$\{base\}(\/[^`]*)`\s*,\s*\{\s*method:\s*'([A-Z]+)'/g)) calls.push({ key: `${m[2]} ${toPath(m[1])}`, file: rel, api: 'kid' });
  for (const m of text.matchAll(/API_URL\.replace\([^)]*\)\}(\/[a-z/]+)`/g)) calls.push({ key: `GET ${toPath(m[1])}`, file: rel, api: 'kid' });
}
// admin app: api('parents/${id}', { method: 'PATCH' }), useApi<T>('overview')
for (const file of walk('admin/src')) {
  if (file.includes('/messages/')) continue;
  const text = read(file);
  for (const m of text.matchAll(/\b(?:useApi\s*<[^()]*?>|api\s*(?:<[^()]*?>)?)\(\s*([`'])([^`']+)\1(?:\s*,\s*\{\s*method:\s*'([A-Z]+)')?/g)) {
    const raw = m[2];
    if (/^(auth)\//.test(raw)) { calls.push({ key: `${m[3] ?? 'POST'} /${raw}`, file, api: 'admin-app' }); continue; }
    // query helpers like ${qs({...})} stay out of the path
    const clean = raw.replace(/\$\{qs\([^}]*\}\)\}/g, '').replace(/\$\{[^}]*\}/g, (x) => (x.includes('qs(') ? '' : '{}'));
    calls.push({ key: `${m[3] ?? 'GET'} /admin/v1${toPath(clean)}`, file, api: 'admin' });
  }
}
// admin app routes that live in the admin app, not in the platform API
const adminAppRoutes = ['POST /auth/login', 'POST /auth/logout'];

// ───────── guide ─────────
const guide = read('contracts/BACKEND_INTEGRATION.md');
const guideHas = (needle) => guide.includes(needle);
const guideMentions = (key) => {
  const [method, path] = key.split(' ');
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withVersion = path.startsWith('/admin/v1') ? esc(path) : `(?:/v1)?${esc(path)}`;
  return new RegExp(`${method}\\s+${withVersion}(?![A-Za-z0-9_{/-])`).test(guide);
};

// ───────── check 1: frontend call -> operation ─────────
const seen = new Set();
const called = { kid: new Set(), admin: new Set() };
for (const c of calls) {
  const id = `${c.api}:${c.key}`;
  if (c.api === 'app') {
    const k = c.key;
    if (!seen.has(id)) say(guide.includes(k.split(' ')[1]) ? 'ok' : 'FAIL', `app route ${k} (${c.file})${guide.includes(k.split(' ')[1]) ? '' : ' is not described in the guide'}`);
    seen.add(id);
    continue;
  }
  if (c.api === 'admin-app') {
    if (!seen.has(id)) say(adminAppRoutes.includes(c.key) && guideHas(c.key.split(' ')[1]) ? 'ok' : 'FAIL', `admin app route ${c.key} (${c.file})`);
    seen.add(id);
    continue;
  }
  if (seen.has(id)) continue;
  seen.add(id);
  const index = c.api === 'admin' ? adminIndex : kidIndex;
  const hit = index.get(normKey(c.key));
  if (!hit) {
    say('FAIL', `frontend call ${c.key} (${relative(ROOT, join(ROOT, c.file)).split(sep).join('/')}) has no operation in ${c.api === 'admin' ? adminFile : 'contracts/openapi.yaml'}`);
    continue;
  }
  called[c.api].add(hit.key);
  say('ok', `call ${c.key} -> ${hit.id || hit.key}`);
}

// ───────── check 2: operation -> guide ─────────
for (const [label, ops, set] of [['kid', kidOps, called.kid], ['admin', adminOps, called.admin]]) {
  for (const [key, id] of ops) {
    if (!id) say('FAIL', `operation ${key} has no operationId`);
    if (!guideMentions(key)) say('FAIL', `operation ${key} (${id}) is not described in contracts/BACKEND_INTEGRATION.md`);
    else say('ok', `guide describes ${key}`);
    if (!set.has(key)) say('info', `${label} operation ${key} (${id}) is not called by the frontend today`);
  }
}
if (!adminOps.size) say('FAIL', `${adminFile} is missing or has no operations`);

// ---- check 3: the guide names what the code uses ----
const clientTs = read('src/lib/api/client.ts');
const errorCodes = new Set([...(/export type ErrorCode =([\s\S]*?);/.exec(clientTs)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
const messages = JSON.parse(read('src/lib/errors/messages.fr-CA.json')).errors;
for (const [k, v] of Object.entries(messages)) if (v && typeof v === 'object' && 'title' in v) errorCodes.add(k);
// codes the backend or the proxy produces (mock and admin included)
for (const extra of ['subscription_inactive', 'account_blocked', 'forbidden_origin', 'beat_not_answered', 'not_cancelable', 'conflict', 'invalid_json', 'admin_disabled', 'email_taken', 'invalid_credentials', 'too_many_attempts'])
  errorCodes.add(extra);
errorCodes.delete('sound'); errorCodes.delete('narrationFailed'); errorCodes.delete('offline'); errorCodes.delete('back'); errorCodes.delete('retry');
for (const code of errorCodes) say(guideHas(`\`${code}\``) ? 'ok' : 'FAIL', `error code ${code} in the guide`);

const events = [...read('src/lib/game/events.ts').matchAll(/k: '([a-z]+)'/g)].map((m) => m[1]);
for (const k of new Set(events)) say(guideHas(`\`${k}\``) ? 'ok' : 'FAIL', `game event ${k} mapped in the guide`);

for (const cookie of ['nx_parent', 'nx_refresh', 'nx_child', 'nx_child_id', 'nx_admin', 'NEXT_LOCALE', 'nx_parent_email', 'nx_mock_state', 'nx_mock_scenario'])
  say(guideHas(cookie) ? 'ok' : 'FAIL', `cookie ${cookie} in the guide`);

const envFile = read('src/config/env.ts');
const envNames = new Set([...envFile.matchAll(/\b((?:NEXT_PUBLIC_[A-Z_]+)|API_URL)\b/g)].map((m) => m[1]));
for (const f of ['admin/src/lib/env.ts']) for (const m of read(f).matchAll(/\b(ADMIN_[A-Z_]+|PLATFORM_API_URL)\b/g)) envNames.add(m[1]);
for (const n of ['UPSTASH_REDIS_REST_URL', 'ADMIN_ORIGIN', 'IMAGE_HOSTS', 'CONNECT_ORIGINS', 'VERCEL_REGIONS']) envNames.add(n);
for (const n of envNames) say(guideHas(n) ? 'ok' : 'FAIL', `env var ${n} in the guide`);

const rules = read('src/lib/game/rules.ts');
void rules;
for (const header of ['accept-language', 'idempotency-key', 'x-card-threshold-pct', 'x-nx-mode', 'last-event-id', 'x-mock-parent-email'])
  say(guide.toLowerCase().includes(header) ? 'ok' : 'FAIL', `header ${header} in the guide`);

// ---- check 4: BACKEND_REQUIREMENTS rows carry owner, priority and test ----
const req = read('contracts/BACKEND_REQUIREMENTS.md');
const rows = req.split(/\r?\n/).filter((l) => /^\|\s*(BE|CR)-\d+/.test(l));
for (const row of rows) {
  const id = /^\|\s*((?:BE|CR)-\d+)/.exec(row)[1];
  const problems = [];
  if (!/\|\s*P[012]\s*\|/.test(row)) problems.push('priority P0/P1/P2');
  if (!/BACKEND_INTEGRATION\.md#/.test(row)) problems.push('guide link');
  if (!/\btest:/i.test(row)) problems.push('acceptance test');
  if (!/\bowner:/i.test(row)) problems.push('owner');
  say(problems.length ? 'FAIL' : 'ok', `${id}${problems.length ? ` is missing ${problems.join(', ')}` : ' has owner, priority, test and guide link'}`);
}
// every guide anchor linked from the requirements file must exist as a heading
const slug = (h) => h.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/ /g, '-');
const anchors = new Set(guide.split(/\r?\n/).filter((l) => /^#{1,4} /.test(l)).map((l) => slug(l.replace(/^#+\s*/, ''))));
for (const m of new Set([...req.matchAll(/BACKEND_INTEGRATION\.md#([a-z0-9-]+)/g)].map((x) => x[1]))) say(anchors.has(m) ? 'ok' : 'FAIL', `requirements link #${m} resolves to a guide heading`);

// ───────── result ─────────
const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ');
console.log(summary);
console.log(fails ? `${fails} FAILED` : 'all contract checks pass');
process.exit(fails ? 1 : 0);
