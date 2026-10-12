// Walks the chapter loop against a running mock (local dev.mjs or the deployed URL), carrying state in
// the x-mock-state header exactly like the app proxy does. Usage: node scripts/selftest.mjs [baseUrl]
const BASE = (process.argv[2] ?? 'http://localhost:8081').replace(/\/$/, '');
const Z = '11111111-1111-4111-8111-111111111111';
const S = '33333333-3333-4333-8333-333333333333';
const B = (i) => `44444444-4444-4444-8444-44444444444${i}`;
let state = '';
const failures = [];

async function call(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(state ? { 'x-mock-state': state } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  state = res.headers.get('x-mock-state') ?? state;
  const text = await res.text();
  return { status: res.status, text, json: () => JSON.parse(text) };
}
function expect(name, cond) {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures.push(name);
}

let r = await call('GET', '/__admin/health');
expect('health', r.status === 200);
r = await call('GET', '/v1/worlds', null, { 'accept-language': 'en-CA' });
expect('worlds are bilingual (en)', r.json().items[0].hook.startsWith('Explore the forest'));
r = await call('POST', '/v1/children/' + Z + '/token', { pin: '0000' });
expect('wrong PIN is refused', r.status === 403 && r.json().code === 'invalid_pin');
r = await call('POST', '/v1/children/' + Z + '/token', { pin: '1234' });
expect('right PIN works', r.status === 200);
r = await call('POST', '/v1/children/22222222-2222-4222-8222-222222222222/sessions', { world: 'echecs', kind: 'chapter' });
expect('no consent blocks play', r.status === 403 && r.json().code === 'consent_missing');

r = await call('POST', `/v1/children/${Z}/sessions`, { world: 'echecs', kind: 'chapter' });
expect('start session', r.status === 201);
const plan = [
  { answer: 54, outcome: 'erreur_typique' },
  { answer: 6, outcome: 'correct' },
  { answer: [49, 4], outcome: 'erreur_aleatoire' },
];
for (const [i, step] of plan.entries()) {
  r = await call('POST', `/v1/sessions/${S}/beats`);
  const beat = r.json();
  expect(`beat ${i} has no answer field`, !JSON.stringify(beat).includes('correct_answer'));
  r = await call('GET', `/v1/sessions/${S}/beats/${B(i)}/narration?phase=scene`);
  expect(`beat ${i} scene streams`, r.text.includes('event: scene') && r.text.includes('event: done'));
  r = await call('POST', `/v1/sessions/${S}/beats/${B(i)}/answer`, { answer: step.answer });
  expect(`beat ${i} outcome ${step.outcome}`, r.json().outcome === step.outcome);
  r = await call('GET', `/v1/sessions/${S}/beats/${B(i)}/narration?phase=denouement`);
  expect(`beat ${i} consequence streams`, r.text.includes('event: denouement'));
  if (i === 2) expect('last answer completes the chapter with rewards', JSON.parse((await call('GET', `/v1/sessions/${S}`)).text).id === S);
}
r = await call('POST', `/v1/sessions/${S}/beats`);
expect('finished chapter refuses another beat', r.status === 409);

// ── Stateful domain: a new child appears, keeps its PIN, and needs consent before playing
r = await call('POST', '/v1/children', { display_name: 'Léa', grade: 2, avatar_id: 'owl', pin: '4321' });
expect('create child', r.status === 201 && r.json().has_pin === true);
const lea = r.json();
r = await call('GET', '/v1/children');
expect('new child is listed with the others', r.json().items.length === 3 && r.json().items.some((c) => c.display_name === 'Léa'));
r = await call('POST', `/v1/children/${lea.id}/token`, { pin: '1234' });
expect('new child refuses another PIN', r.status === 403);
r = await call('POST', `/v1/children/${lea.id}/token`, { pin: '4321' });
expect('new child accepts its own PIN', r.status === 200);
r = await call('POST', `/v1/children/${lea.id}/sessions`, { world: 'nature', kind: 'chapter' });
expect('no consent yet: play refused', r.status === 403 && r.json().code === 'consent_missing');
r = await call('POST', '/v1/auth/consent', { child_id: lea.id, version: '2026-10', accepted: true });
expect('consent recorded', r.status === 204);
r = await call('GET', '/v1/children');
expect('consent shows in the list', r.json().items.find((c) => c.id === lea.id).consent_given === true);
r = await call('POST', `/v1/children/${lea.id}/sessions`, { world: 'nature', kind: 'chapter' });
expect('after consent: play allowed', r.status === 201);

// ── Endless AI feed
let cursor;
const seen = new Set();
let kinds = new Set();
for (let page = 0; page < 4; page++) {
  r = await call('GET', `/v1/children/${lea.id}/feed${cursor ? `?cursor=${cursor}` : ''}`, null, { 'accept-language': 'en-CA' });
  const f = r.json();
  expect(`feed page ${page} has items and a next cursor`, r.status === 200 && f.items.length === 5 && Boolean(f.next_cursor));
  for (const it of f.items) {
    seen.add(it.id);
    kinds.add(it.kind);
    if (!it.ai_generated) failures.push('item not labeled AI');
    if (it.puzzle && JSON.stringify(it).includes('correct')) failures.push('puzzle leaks answer');
  }
  cursor = f.next_cursor;
}
expect('feed never repeats an id across pages', seen.size === 20);
expect('feed mixes kinds', kinds.size >= 3);
const puzzleId = [...seen].find((id) => Number(id.split('-')[1]) % 6 === 2);
r = await call('POST', `/v1/children/${lea.id}/feed/${puzzleId}/answer`, { answer: 1 });
expect('puzzle answer is graded', r.status === 200 && ['correct', 'erreur_typique', 'erreur_aleatoire'].includes(r.json().outcome));
r = await call('PUT', `/v1/children/${lea.id}/feed/feed-0/reaction`, { liked: true, saved: true });
expect('reaction stored', r.json().liked === true);
r = await call('GET', `/v1/children/${lea.id}/feed`);
expect('reaction survives', r.json().items[0].liked === true && r.json().items[0].saved === true);
r = await call('DELETE', `/v1/children/${lea.id}`);
r = await call('GET', '/v1/children');
expect('deleted child disappears', r.json().items.length === 2);

console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall good');
process.exit(failures.length ? 1 : 0);
