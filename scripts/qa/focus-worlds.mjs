// Quick QA of the three focus worlds over HTTP: only chess, medicine and space are on, a chapter has 5 beats,
// and every beat carries a diagram. Usage: node scripts/qa/focus-worlds.mjs [baseUrl]
const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const jar = new Map();
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
/** Any valid answer of the right shape (this check is about the pictures, not about being right). */
function anyAnswer(q) {
  if (q.choices?.length) return q.choices[0];
  if (q.kind === 'truefalse') return true;
  if (q.items?.length) return q.items.map((i) => i.id);
  if (q.kind === 'match') return [];
  return 0;
}

let r = await api('POST', '/auth/register', { body: { email: `focus${Date.now()}@example.com`, password: 'correct-horse-battery', locale: 'fr-CA' } });
ok('register', r.status === 201, r.text.slice(0, 80));
r = await api('POST', '/children', { body: { display_name: 'Nora', grade: 3, avatar_id: 'owl', pin: '4321' } });
const kid = r.json;
r = await api('POST', '/auth/consent', { body: { child_id: kid.id, version: '2026-10', accepted: true } });
r = await api('POST', `/children/${kid.id}/token`, { body: { pin: '4321' } });
ok('child signed in', r.status === 200 && jar.has('nx_child'));

r = await api('GET', `/children/${kid.id}/settings`);
ok('a new child starts with chess, medicine and space only', JSON.stringify([...(r.json?.enabled_worlds ?? [])].sort()) === JSON.stringify(['echecs', 'espace', 'medecine']), r.text.slice(0, 120));
r = await api('POST', `/children/${kid.id}/sessions`, { mode: 'child', body: { world: 'nature', kind: 'chapter' }, headers: { 'idempotency-key': crypto.randomUUID() } });
ok('a disabled world cannot be started', r.status === 422, `${r.status} ${r.text.slice(0, 80)}`);

for (const world of ['echecs', 'medecine', 'espace']) {
  r = await api('POST', `/children/${kid.id}/sessions`, { mode: 'child', body: { world, kind: 'chapter' }, headers: { 'idempotency-key': crypto.randomUUID() } });
  ok(`${world}: chapter starts`, r.status === 201, `${r.status} ${r.text.slice(0, 100)}`);
  if (r.status !== 201) continue;
  const sid = r.json.id;
  ok(`${world}: a chapter has 5 questions`, r.json.chapter_length === 5, String(r.json.chapter_length));
  const seen = new Set();
  let last;
  for (let i = 0; i < 5; i++) {
    const b = await api('POST', `/sessions/${sid}/beats`, { mode: 'child', headers: { 'idempotency-key': crypto.randomUUID() } });
    const q = b.json?.question;
    ok(`${world} beat ${i}: question has a diagram`, Boolean(q?.visual?.kind), JSON.stringify(q).slice(0, 120));
    ok(`${world} beat ${i}: a question never repeats in a chapter`, !seen.has(q?.id ?? b.json?.id), q?.prompt);
    seen.add(q?.id ?? b.json?.id);
    last = await api('POST', `/sessions/${sid}/beats/${b.json.id}/answer`, { mode: 'child', body: { answer: anyAnswer(q) }, headers: { 'idempotency-key': crypto.randomUUID() } });
    ok(`${world} beat ${i}: answer graded`, last.status === 200, `${last.status} ${last.text.slice(0, 100)}`);
    // the reaction after the answer is about THIS question: its explanation or its hint, never a stock line
    const den = await api('GET', `/sessions/${sid}/beats/${b.json.id}/narration?phase=denouement`, { mode: 'child' });
    const said = [...den.text.matchAll(/"delta":"([^"]*)"/g)].map((m) => m[1]).join('') || den.text;
    ok(`${world} beat ${i}: reaction is specific`, said.length > 15 && !/imprévu|Bravo, tu as trouvé|adventure goes on|Well done, you found it/.test(said), said.slice(0, 120));
    ok(`${world} beat ${i}: explanation is sent`, typeof last.json?.explain === 'string' && last.json.explain.length > 3, JSON.stringify(last.json).slice(0, 100));
  }
  ok(`${world}: chapter completes after 5`, last?.json?.session?.status === 'completed', last?.text?.slice(0, 100));
}
console.log(fails ? `${fails} FAILED` : 'all focus-world checks pass');
process.exit(fails ? 1 : 0);
