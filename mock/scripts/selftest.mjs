// Walks the mock like the app does (state carried in the x-mock-state header), one line per check.
// Usage: node scripts/selftest.mjs [baseUrl]   (start the mock first: node dev.mjs 8081)
const BASE = (process.argv[2] ?? 'http://localhost:8081').replace(/\/$/, '');
const Z = '11111111-1111-4111-8111-111111111111';
const MAX_ID = '22222222-2222-4222-8222-222222222222';
const WORLDS = ['nature', 'espace', 'cuisine', 'sport', 'construction', 'medecine', 'science', 'echecs'];
const SKILLS = ['ARI-OPE-A02a', 'ARI-OPE-A03a', 'ARI-OPE-A05', 'ARI-OPE-A06a', 'ARI-SOP-A03a', 'ARI-OPE-A07a', 'ARI-SEN-A01c'];
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
const words = (t) => t.trim().split(/\s+/).length;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const has = (arr, v) => arr.some((x) => same(x, v));

function events(text) {
  if (!text.startsWith('event:')) return [];
  return text.split('\n\n').filter(Boolean).map((blk) => {
    const lines = blk.split('\n');
    return { ev: lines.find((l) => l.startsWith('event: ')).slice(7), data: JSON.parse(lines.find((l) => l.startsWith('data: ')).slice(6)) };
  });
}
const A = (lang) => ({ 'accept-language': lang });

// Mirror of the generators, to know which answer is correct and which is the documented misconception.
function solve(skill, m) {
  const n = m.match(/\d+/g).map(Number);
  switch (skill) {
    case 'ARI-OPE-A02a': return { c: n[0] + n[1], t: n[0] + n[1] - 10 };
    case 'ARI-OPE-A03a': return { c: n[0] - n[1], t: 10 * (Math.floor(n[0] / 10) - Math.floor(n[1] / 10)) + (n[1] % 10) - (n[0] % 10) };
    case 'ARI-OPE-A05': return { c: n[1] - n[0], t: n[1] + n[0] };
    case 'ARI-OPE-A06a': return { c: n[0] * n[1], t: n[0] + n[1] };
    case 'ARI-SOP-A03a': return { c: n[0] / n[1], t: n[0] - n[1] };
    case 'ARI-OPE-A07a': return { c: [Math.floor(n[0] / n[1]), n[0] % n[1]], t: [Math.floor(n[0] / n[1]), 0] };
    default: return { c: n[0] + n[1], t: n[0] + n[1] - 1000 };
  }
}

const start = async (world, skill, lang = 'fr', child = Z) =>
  call('POST', `/v1/children/${child}/sessions`, { world, kind: 'chapter', ...(skill ? { skill_id: skill } : {}) }, A(lang));
const nextBeat = (sid, lang = 'fr') => call('POST', `/v1/sessions/${sid}/beats`, null, A(lang));
const narrate = async (sid, bid, phase, lang = 'fr') => {
  const r = await call('GET', `/v1/sessions/${sid}/beats/${bid}/narration?phase=${phase}`, null, A(lang));
  const ev = events(r.text);
  return { ev, text: ev.filter((e) => e.ev === phase).map((e) => e.data.delta).join(''), raw: r.text, status: r.status };
};
const answer = (sid, bid, v) => call('POST', `/v1/sessions/${sid}/beats/${bid}/answer`, { answer: v });
const pickOther = (choices, c, t) => choices.find((x) => !same(x, c) && !same(x, t));

/** Plays a whole chapter. plan: array of 'c' | 't' | 'r'. narr: 's' scenes, 'd' denouements (streams take 1.2 s each). */
async function play(world, skill, plan, lang = 'fr', narr = '') {
  const s = (await start(world, skill, lang)).json();
  const out = { s, scenes: [], dens: [], beats: [], results: [], maths: [] };
  for (const code of plan) {
    const b = (await nextBeat(s.id, lang)).json();
    const sol = solve(b.skill_id, b.question.math_text);
    out.beats.push(b);
    out.maths.push(b.question.math_text);
    if (narr.includes('s')) out.scenes.push((await narrate(s.id, b.id, 'scene', lang)).text);
    const val = code === 'c' ? sol.c : code === 't' ? sol.t : pickOther(b.question.choices, sol.c, sol.t);
    const r = await answer(s.id, b.id, val);
    out.results.push(r.json());
    if (narr.includes('d')) out.dens.push((await narrate(s.id, b.id, 'denouement', lang)).text);
  }
  return out;
}

// ── Basics
await call('POST', '/__admin/scenarios/reset');
let r = await call('GET', '/__admin/health');
expect('health', r.status === 200);
r = await call('GET', '/v1/worlds', null, A('en-CA'));
expect('worlds are bilingual (en)', r.json().items[0].hook.startsWith('Explore the forest'));
r = await call('POST', `/v1/children/${Z}/token`, { pin: '0000' });
expect('wrong PIN is refused', r.status === 403 && r.json().code === 'invalid_pin');
r = await call('POST', `/v1/children/${Z}/token`, { pin: '1234' });
expect('right PIN works', r.status === 200);
r = await start('echecs', null, 'fr', MAX_ID);
expect('no consent blocks play', r.status === 403 && r.json().code === 'consent_missing');

// ── World-aware chapters
const sceneByWorld = {};
for (const w of WORLDS) {
  const s = (await start(w)).json();
  const b = (await nextBeat(s.id)).json();
  sceneByWorld[w] = (await narrate(s.id, b.id, 'scene')).text;
}
expect('8 worlds give 8 different scenes', new Set(Object.values(sceneByWorld)).size === 8);
expect('scene is 40-70 words in every world', Object.values(sceneByWorld).every((t) => words(t) >= 40 && words(t) <= 70));
expect('no em dash in scenes', !Object.values(sceneByWorld).join(' ').includes('—'));

const p1 = await play('echecs', 'ARI-OPE-A06a', ['c', 'c', 'c'], 'fr', 's');
const p2 = await play('echecs', 'ARI-OPE-A06a', ['c', 'c', 'c'], 'fr', 's');
expect('two plays of the same world and skill use other numbers', p1.maths.join('|') !== p2.maths.join('|') && p1.maths[0] !== p2.maths[0]);
expect('two plays of the same world and skill read differently', p1.scenes.join('|') !== p2.scenes.join('|'));
expect('first play differs beat by beat', new Set(p1.scenes).size === 3);

r = await start('nature');
expect('missing skill_id defaults to the first skill', r.json().current_beat === null && (await nextBeat(r.json().id)).json().skill_id === SKILLS[0]);
r = await start('nature', 'NOPE-123');
expect('unknown skill_id defaults to the first skill', (await nextBeat(r.json().id)).json().skill_id === SKILLS[0]);

for (const skill of SKILLS) {
  const s = (await start('sport', skill)).json();
  const b = (await nextBeat(s.id)).json();
  const sol = solve(skill, b.question.math_text);
  const ch = b.question.choices;
  const distinct = new Set(ch.map((x) => JSON.stringify(x))).size === 4;
  expect(`${skill}: beat has 4 distinct choices incl. answer and misconception`, b.skill_id === skill && ch.length === 4 && distinct && has(ch, sol.c) && has(ch, sol.t));
  const shape = skill === 'ARI-OPE-A07a' ? ch.every((x) => Array.isArray(x) && x.length === 2) : ch.every((x) => Number.isInteger(x));
  expect(`${skill}: choices have the right shape`, shape);
  expect(`${skill}: beat never carries the answer`, !('correct_answer' in b) && b.scene.text === null && !JSON.stringify(b).includes('correct'));
  const sc = (await narrate(s.id, b.id, 'scene')).text;
  const inMath = b.question.math_text.match(/\d+/g).map(Number);
  const c = Array.isArray(sol.c) ? null : sol.c;
  expect(`${skill}: scene embeds the math text and not the answer`, sc.includes(b.question.math_text) && (c === null || inMath.includes(c) || !new RegExp(`(^|\\D)${c}(\\D|$)`).test(sc.replace(b.question.math_text, ''))));
}

// outcomes, per skill: typical error, correct, random
for (const skill of SKILLS) {
  const o = await play('science', skill, ['t', 'r', 'c']);
  expect(`${skill}: typical error, random error and correct are told apart`, same(o.results.map((x) => x.outcome), ['erreur_typique', 'erreur_aleatoire', 'correct']));
}
const mix = await play('cuisine', 'ARI-OPE-A06a', ['t', 'c', 'r'], 'fr', 'd');
expect('chapter ends after 3 answers with chapter_complete and a card', mix.results[2].session.status === 'completed' && mix.results[2].rewards.some((x) => x.type === 'chapter_complete'));
const card = mix.results[2].rewards.find((x) => x.type === 'card_earned')?.card;
expect('card has world, story title and session', card && card.world === 'cuisine' && card.title === mix.results[2].session.story_title && card.session_id === mix.s.id && card.image_url === '');
expect('mistakes: no skill_mastered', !mix.results[2].rewards.some((x) => x.type === 'skill_mastered'));
expect('early answers carry no rewards and keep the chapter open', mix.results[0].rewards.length === 0 && mix.results[1].session.status === 'active' && mix.results[1].session.beats_answered === 2);
expect('wrong answers still return correct_answer for the engine', mix.results.every((x) => x.correct_answer !== undefined) && mix.results[0].denouement.status === 'pending');
const perfect = await play('medecine', 'ARI-SOP-A03a', ['c', 'c', 'c'], 'fr', 'd');
expect('3 correct answers earn skill_mastered', perfect.results[2].rewards.some((x) => x.type === 'skill_mastered' && x.skill_id === 'ARI-SOP-A03a'));
expect('story title is per world kit and bilingual', perfect.results[2].session.story_title && perfect.s.story_title === perfect.results[2].session.story_title);
const enPlay = await play('medecine', 'ARI-OPE-A07a', ['c', 't', 'r'], 'en-CA', 'sd');
expect('english play: english math text, scenes and titles', enPlay.maths[0].includes('with remainder') && /^[\x00-\x7F’“”]+$/.test(enPlay.scenes[0].replace(/[^\x00-\x7F’“”]/g, '')) && enPlay.scenes[0] !== '' && enPlay.results[2].session.story_title !== perfect.results[2].session.story_title);

const dwords = [...mix.dens, ...perfect.dens, ...enPlay.dens].map(words);
expect('denouement is 25-45 words', dwords.every((n) => n >= 25 && n <= 45));
expect('no em dash in denouements', ![...mix.dens, ...perfect.dens, ...enPlay.dens].join(' ').includes('—'));
const [dT, dC, dR] = mix.dens;
expect('denouement depends on the outcome', new Set([dT, dC, dR]).size === 3);

// narration stream: events, chunks of ~4 words, ~1.2 s
{
  const s = (await start('espace', 'ARI-OPE-A06a')).json();
  const b = (await nextBeat(s.id)).json();
  const t0 = Date.now();
  const n = await narrate(s.id, b.id, 'scene');
  const dt = Date.now() - t0;
  const chunks = n.ev.filter((e) => e.ev === 'scene');
  expect('scene streams as scene events then done', chunks.length > 5 && n.ev.at(-1).ev === 'done' && same(n.ev.at(-1).data, {}));
  expect('chunks are about 4 words', chunks.every((e) => words(e.data.delta) <= 4) && chunks.length >= Math.floor(words(n.text) / 4));
  expect('stream takes about 1.2 s', dt > 800 && dt < 3000);
  const early = await narrate(s.id, b.id, 'denouement');
  expect('denouement before the answer is refused (409)', early.status === 409 || early.ev.length === 0);
}

// 409 cases and flow rules
{
  const s = (await start('construction', 'ARI-OPE-A05')).json();
  const b0 = (await nextBeat(s.id)).json();
  r = await nextBeat(s.id);
  expect('open beat requested again returns the same beat (200)', r.status === 200 && r.json().id === b0.id);
  const sol = solve(b0.skill_id, b0.question.math_text);
  expect('session shows the open beat', (await call('GET', `/v1/sessions/${s.id}`)).json().current_beat?.id === b0.id);
  r = await answer(s.id, b0.id, sol.c);
  expect('first answer ok', r.status === 200 && r.json().outcome === 'correct');
  r = await answer(s.id, b0.id, sol.c);
  expect('answering a beat twice gives 409 beat_answered', r.status === 409 && r.json().code === 'beat_answered');
  r = await answer(s.id, '00000000-0000-4000-8000-000000000000', 1);
  expect('unknown beat gives 404', r.status === 404);
  r = await call('GET', '/v1/sessions/00000000-0000-4000-8000-000000000000');
  expect('unknown session gives 404', r.status === 404);
  for (let i = 1; i < 3; i++) { const b = (await nextBeat(s.id)).json(); await answer(s.id, b.id, solve(b.skill_id, b.question.math_text).c); }
  r = await nextBeat(s.id);
  expect('beat after completion gives 409 session_completed', r.status === 409 && r.json().code === 'session_completed');
  r = await call('GET', `/v1/children/${Z}/sessions`);
  expect('session list holds the play', r.json().items.some((x) => x.id === s.id && x.status === 'completed' && x.beats_answered === 3));
}

// summary, pause, resume, finish
{
  const o = await play('echecs', 'ARI-OPE-A07a', ['t', 'c', 'c']);
  r = await call('GET', `/v1/sessions/${o.s.id}/summary`, null, A('fr'));
  const sm = r.json();
  expect('summary: one skill, 3 attempts, correct count, reason nouvelle', sm.skills.length === 1 && sm.skills[0].skill_id === 'ARI-OPE-A07a' && sm.skills[0].attempts === 3 && sm.skills[0].correct === 2 && sm.skills[0].reason === 'nouvelle' && sm.skills[0].label === 'Division avec reste');
  expect('summary: stuck point from the misconception table', sm.stuck_points.length === 1 && sm.stuck_points[0].code === 'reste_ignore' && sm.stuck_points[0].description.length > 5 && sm.stuck_points[0].skill_ids[0] === 'ARI-OPE-A07a');
  expect('summary: duration and recap', sm.duration_seconds > 0 && sm.story_recap.includes('Zoé') && sm.session.story_title === o.results[2].session.story_title);
  const clean = await play('echecs', 'ARI-OPE-A06a', ['c', 'c', 'c']);
  expect('summary without a typical error has no stuck points', (await call('GET', `/v1/sessions/${clean.s.id}/summary`, null, A('en'))).json().stuck_points.length === 0);
  const s = (await start('sport')).json();
  expect('pause', (await call('POST', `/v1/sessions/${s.id}/pause`)).json().status === 'paused');
  expect('resume', (await call('POST', `/v1/sessions/${s.id}/resume`)).json().status === 'active');
  expect('finish', (await call('POST', `/v1/sessions/${s.id}/finish`)).json().status === 'completed');
}

// ── Injected failures still win on domain routes
{
  const ok = state;
  r = await call('GET', '/v1/children', null, { 'x-mock-scenario': 'rate-limited' });
  expect('rate-limited gives 429 on a domain route', r.status === 429 && r.json().code === 'rate_limited');
  r = await call('GET', `/v1/children/${Z}`, null, { 'x-mock-scenario': 'unauthorized' });
  expect('unauthorized gives 401 on a domain route', r.status === 401);
  r = await call('GET', `/v1/children/${Z}/feed`, null, { 'x-mock-scenario': 'server-error' });
  expect('server-error gives 500 on the feed', r.status === 500);
  r = await start('echecs', null, 'fr').then(() => call('POST', `/v1/children/${Z}/sessions`, { world: 'echecs', kind: 'chapter' }, { 'x-mock-scenario': 'daily-limit' }));
  expect('daily-limit gives 403 on session start', r.status === 403 && r.json().code === 'daily_limit_reached');
  let reset = false;
  try { await call('GET', '/v1/children', null, { 'x-mock-scenario': 'network-error' }); } catch { reset = true; }
  expect('network-error resets the connection', reset);
  const s = (await start('echecs')).json();
  const b = (await nextBeat(s.id)).json();
  r = await call('GET', `/v1/sessions/${s.id}/beats/${b.id}/narration?phase=scene`, null, { 'x-mock-scenario': 'narration-fallback', ...A('fr') });
  expect('narration-fallback sends a fallback event', events(r.text)[0].ev === 'fallback' && events(r.text)[0].data.text.length > 10);
  let slow = false;
  try { await fetch(`${BASE}/v1/sessions/${s.id}/beats/${b.id}/narration?phase=scene`, { headers: { 'x-mock-scenario': 'narration-slow', 'x-mock-state': state }, signal: AbortSignal.timeout(2000) }); } catch { slow = true; }
  expect('narration-slow holds the stream back', slow);
  r = await call('GET', `/v1/sessions/${s.id}/beats/${b.id}/narration?phase=scene`);
  expect('normal narration works again after injections', events(r.text).some((e) => e.ev === 'scene'));
  expect('state survives injections', ok.length > 0 && (await call('GET', '/v1/children')).json().items.length === 2);
}

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
r = await start('nature', null, 'fr', lea.id);
expect('no consent yet: play refused', r.status === 403 && r.json().code === 'consent_missing');
r = await call('POST', '/v1/auth/consent', { child_id: lea.id, version: '2026-10', accepted: true });
expect('consent recorded', r.status === 204);
r = await call('GET', '/v1/children');
expect('consent shows in the list', r.json().items.find((c) => c.id === lea.id).consent_given === true);
r = await start('nature', null, 'fr', lea.id);
expect('after consent: play allowed', r.status === 201 && r.json().child_id === lea.id);

// ── Endless human feed
const feed = [];
let cursor;
for (let page = 0; page < 3; page++) {
  r = await call('GET', `/v1/children/${lea.id}/feed?limit=20${cursor ? `&cursor=${cursor}` : ''}`, null, A('fr-CA'));
  const f = r.json();
  expect(`feed page ${page} has 20 items and a next cursor`, r.status === 200 && f.items.length === 20 && f.next_cursor === `i${(page + 1) * 20}`);
  feed.push(...f.items);
  cursor = f.next_cursor;
}
expect('feed never repeats an id', new Set(feed.map((i) => i.id)).size === 60);
expect('no duplicate text across 60 consecutive items', new Set(feed.map((i) => i.text)).size === 60);
expect('feed mixes the four kinds', new Set(feed.map((i) => i.kind)).size === 4);
expect('feed speaks to the child by first name', feed.filter((i) => i.text.includes('Léa')).length >= 35);
expect('authors: Pip on story/fact/challenge, Lumi on puzzles', feed.every((i) => (i.kind === 'puzzle' ? i.author?.name === 'Lumi' && i.author.emoji === '🦉' : i.author?.name === 'Pip' && i.author.emoji === '🦊')));
const range = { story_short: [35, 60], fun_fact: [20, 40], challenge: [15, 30] };
expect('text lengths: story 35-60, fact 20-40, challenge 15-30 words', feed.every((i) => !range[i.kind] || (words(i.text) >= range[i.kind][0] && words(i.text) <= range[i.kind][1])));
expect('no em dash, no empty slot in the feed', feed.every((i) => !/—|\{|\}/.test(i.text + i.title)));
expect('items are labeled AI and puzzles never leak the answer', feed.every((i) => i.ai_generated === true && (!i.puzzle || (i.puzzle.choices.length === 4 && !('correct_answer' in i)))));
expect('stories and challenges carry a call to play', feed.filter((i) => i.kind === 'story_short' || i.kind === 'challenge').every((i) => i.cta?.world === i.world));
r = await call('GET', `/v1/children/${lea.id}/feed?limit=20`, null, A('en-CA'));
const en = r.json().items;
expect('english feed uses the first name and english words', en.filter((i) => i.text.includes('Léa')).length >= 10 && en.every((i) => /\b(the|a|you|is|to|of)\b/i.test(i.text)));
r = await call('GET', `/v1/children/${lea.id}/feed?limit=20&cursor=i9000`, null, A('en-CA'));
expect('feed is endless', r.json().items.length === 20 && r.json().next_cursor === 'i9020');
const long = [];
for (let c = 0; c < 200; c += 20) long.push(...(await call('GET', `/v1/children/${lea.id}/feed?limit=20&cursor=i${c}`, null, A('fr'))).json().items);
let near = 0;
for (let a = 0; a < long.length; a++) for (let b = a + 1; b < Math.min(long.length, a + 40); b++) if (long[a].text === long[b].text) near++;
expect('no two items within 40 share the same text (200 items)', near === 0);
const puzzleId = feed.find((i) => i.kind === 'puzzle').id;
r = await call('POST', `/v1/children/${lea.id}/feed/${puzzleId}/answer`, { answer: 1 });
expect('puzzle answer is graded', r.status === 200 && ['correct', 'erreur_typique', 'erreur_aleatoire'].includes(r.json().outcome));
const pz = feed.find((i) => i.kind === 'puzzle');
const [pa, pb] = pz.puzzle.math_text.match(/\d+/g).map(Number);
r = await call('POST', `/v1/children/${lea.id}/feed/${pz.id}/answer`, { answer: pa * pb });
expect('puzzle right answer is correct', r.json().outcome === 'correct');
r = await call('POST', `/v1/children/${lea.id}/feed/${pz.id}/answer`, { answer: pa + pb });
expect('puzzle typical error is recognised', r.json().outcome === 'erreur_typique');
r = await call('PUT', `/v1/children/${lea.id}/feed/feed-0/reaction`, { liked: true, saved: true });
expect('reaction stored', r.json().liked === true);
r = await call('GET', `/v1/children/${lea.id}/feed`);
expect('reaction survives', r.json().items[0].liked === true && r.json().items[0].saved === true);
r = await call('DELETE', `/v1/children/${lea.id}`);
r = await call('GET', '/v1/children');
expect('deleted child disappears', r.json().items.length === 2);

// ── Cookie size: 8 children, one active session, 40 reactions
await call('POST', '/__admin/scenarios/reset');
for (let i = 0; i < 6; i++) await call('POST', '/v1/children', { display_name: `Enfant-${i}-prénom-long`, grade: 3, avatar_id: 'fox', pin: '1234' });
r = await call('GET', '/v1/children');
const kids = r.json().items;
expect('8 children exist', kids.length === 8);
for (const k of kids) await call('POST', '/v1/auth/consent', { child_id: k.id, version: '2026-10', accepted: true });
await start('construction', 'ARI-OPE-A07a', 'fr', kids[7].id);
const sid = (await call('GET', `/v1/children/${kids[7].id}/sessions`)).json().items[0].id;
const cb = (await nextBeat(sid)).json();
await answer(sid, cb.id, cb.question.choices[0]);
for (let i = 0; i < 40; i++) await call('PUT', `/v1/children/${kids[0].id}/feed/feed-${i}/reaction`, { liked: true, saved: i % 2 === 0 });
expect(`encoded state stays under 3800 bytes (now ${state.length})`, state.length < 3800);
r = await call('POST', '/v1/children', { display_name: 'Trop', grade: 3 });
expect('a ninth profile is refused', r.status === 422);

console.log(failures.length ? `\n${failures.length} failure(s): ${failures.join('; ')}` : '\nall good');
process.exit(failures.length ? 1 : 0);
