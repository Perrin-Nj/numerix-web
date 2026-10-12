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
let answerHeaders = {};
const answer = (sid, bid, v) => call('POST', `/v1/sessions/${sid}/beats/${bid}/answer`, { answer: v }, answerHeaders);
const NO_SYMBOLS = /[+−×÷=]/;
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
expect('scene is 25-60 words in every world', Object.values(sceneByWorld).every((t) => words(t) >= 25 && words(t) <= 60));
expect('no + − × ÷ = in scene narration', !Object.values(sceneByWorld).some((t) => NO_SYMBOLS.test(t)));
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
  const inScene = (n) => new RegExp(`(^|\\D)${n}(\\D|$)`).test(sc);
  expect(`${skill}: scene states the numbers in words, no symbols, ends with a question, not the answer`, inMath.every(inScene) && !NO_SYMBOLS.test(sc) && sc.trim().endsWith('?') && (c === null || inMath.includes(c) || !inScene(c)));
}

// outcomes, per skill: typical error, correct, random
for (const skill of SKILLS) {
  const o = await play('science', skill, ['t', 'r', 'c']);
  expect(`${skill}: typical error, random error and correct are told apart`, same(o.results.map((x) => x.outcome), ['erreur_typique', 'erreur_aleatoire', 'correct']));
}
const mix = await play('cuisine', 'ARI-OPE-A06a', ['t', 'c', 'r'], 'fr', 'd');
expect('chapter ends after 3 answers with chapter_complete', mix.results[2].session.status === 'completed' && mix.results[2].rewards.some((x) => x.type === 'chapter_complete'));
expect('1 of 3 right: no card at the default 70 percent', !mix.results[2].rewards.some((x) => x.type === 'card_earned'));
expect('mistakes: no skill_mastered', !mix.results[2].rewards.some((x) => x.type === 'skill_mastered'));
expect('early answers carry no rewards and keep the chapter open', mix.results[0].rewards.length === 0 && mix.results[1].session.status === 'active' && mix.results[1].session.beats_answered === 2);
expect('wrong answers still return correct_answer for the engine', mix.results.every((x) => x.correct_answer !== undefined) && mix.results[0].denouement.status === 'pending');
const perfect = await play('medecine', 'ARI-SOP-A03a', ['c', 'c', 'c'], 'fr', 'd');
expect('3 correct answers earn skill_mastered', perfect.results[2].rewards.some((x) => x.type === 'skill_mastered' && x.skill_id === 'ARI-SOP-A03a'));
const card = perfect.results[2].rewards.find((x) => x.type === 'card_earned')?.card;
expect('3 of 3 earns a card with world, story title and session', card && card.world === 'medecine' && card.title === perfect.results[2].session.story_title && card.session_id === perfect.s.id && card.image_url === '');
expect('final answer carries score (3/3, 100, threshold 70, card awarded)', same(perfect.results[2].session.score, { correct: 3, total: 3, pct: 100, threshold_pct: 70, card_awarded: true }));
const two = await play('sport', 'ARI-OPE-A06a', ['c', 'c', 't']);
expect('2 of 3 (66.7 percent) earns no card at 70 and no skill_mastered', !two.results[2].rewards.some((x) => x.type === 'card_earned' || x.type === 'skill_mastered') && two.results[2].rewards.some((x) => x.type === 'chapter_complete'));
expect('score shows 2/3, 66.7, card_awarded false', same(two.results[2].session.score, { correct: 2, total: 3, pct: 66.7, threshold_pct: 70, card_awarded: false }));
answerHeaders = { 'x-card-threshold-pct': '50' };
const lenient = await play('sport', 'ARI-OPE-A06a', ['c', 'c', 't']);
expect('threshold 50 header: 2 of 3 earns a card', lenient.results[2].rewards.some((x) => x.type === 'card_earned') && lenient.results[2].session.score.threshold_pct === 50 && lenient.results[2].session.score.card_awarded === true);
answerHeaders = { 'x-card-threshold-pct': 'abc' };
const bad = await play('sport', 'ARI-OPE-A06a', ['c', 'c', 't']);
expect('invalid threshold header falls back to 70', bad.results[2].session.score.threshold_pct === 70 && !bad.results[2].rewards.some((x) => x.type === 'card_earned'));
answerHeaders = { 'x-card-threshold-pct': '100' };
const strict = await play('sport', 'ARI-OPE-A06a', ['c', 'c', 'c']);
expect('threshold 100: 3 of 3 still earns a card', strict.results[2].rewards.some((x) => x.type === 'card_earned'));
answerHeaders = {};
expect('story title is per world kit and bilingual', perfect.results[2].session.story_title && perfect.s.story_title === perfect.results[2].session.story_title);
const enPlay = await play('medecine', 'ARI-OPE-A07a', ['c', 't', 'r'], 'en-CA', 'sd');
expect('english play: english math text, scenes and titles', enPlay.maths[0].includes('with remainder') && /^[\x00-\x7F’“”]+$/.test(enPlay.scenes[0].replace(/[^\x00-\x7F’“”]/g, '')) && enPlay.scenes[0] !== '' && enPlay.results[2].session.story_title !== perfect.results[2].session.story_title);

const dwords = [...mix.dens, ...perfect.dens, ...enPlay.dens].map(words);
expect('denouement is 15-45 words', dwords.every((n) => n >= 15 && n <= 45));
expect('no + − × ÷ = in denouements', ![...mix.dens, ...perfect.dens, ...enPlay.dens].some((t) => NO_SYMBOLS.test(t)));
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

// ── Platform: subscriptions, gates, admin API (platform data lives in the store, not in the cookie)
const TOKEN = process.env.ADMIN_API_TOKEN ?? 'dev-admin-token';
const adm = async (method, path, body, token = TOKEN, extra = {}) => {
  const res = await fetch(`${BASE}/admin/v1${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: () => JSON.parse(text) };
};
const email = `selftest-${Date.now()}@Example.com`;
const PH = { 'x-mock-parent-email': email.toLowerCase() };
const sessionAs = (h = PH, lang = 'fr') => call('POST', `/v1/children/${Z}/sessions`, { world: 'nature', kind: 'chapter' }, { ...A(lang), ...h });
await call('POST', '/v1/auth/register', { email, password: 'Password123!', name: 'Self Test' });
r = await call('GET', '/v1/subscription', null, PH);
expect('register creates a trial parent', r.status === 200 && r.json().status === 'trial' && r.json().can_play === true && r.json().days_left >= 13);
r = await call('GET', '/v1/subscription/plans');
expect('plans: free 0, monthly 899, yearly 8990 CAD cents, fr and en features', r.json().plans.map((p) => p.price_cad_cents).join() === '0,899,8990' && r.json().plans.every((p) => p.features.fr.length && p.features.en.length) && r.json().methods.length >= 4);
r = await call('GET', '/v1/platform/public');
expect('platform public exposes policy and threshold', r.json().unpaid_policy === 'block' && r.json().card_threshold_pct === 70);
r = await sessionAs();
expect('trial parent can start a chapter', r.status === 201);
r = await call('POST', '/v1/subscription/checkout', { plan: 'family_monthly', method: 'interac' }, PH);
expect('checkout activates the subscription (+30 days)', r.status === 200 && r.json().status === 'active' && r.json().days_left >= 29 && r.json().days_left <= 30);
r = await call('POST', '/v1/subscription/checkout', { plan: 'free', method: 'card' }, PH);
expect('checkout refuses the free plan', r.status === 422);
r = await call('POST', '/v1/subscription/cancel', null, PH);
expect('cancel keeps access until the end of the period', r.status === 200 && r.json().status === 'canceled' && r.json().can_play === true);
r = await sessionAs();
expect('canceled but not ended still plays', r.status === 201);

r = await adm('GET', '/overview', null, null);
expect('admin refused without token', r.status === 401);
r = await adm('GET', '/overview', null, 'nope');
expect('admin refused with a wrong token', r.status === 401);
r = await adm('GET', '/overview');
const ov = r.json();
expect('overview counts parents, kids, MRR and a 30 day series', r.status === 200 && ov.parents_total >= 40 && ov.kids_total >= 70 && ov.signups_30d.length === 30 && ov.mrr_cad_cents > 0 && Object.keys(ov.by_subscription).length === 5);
const sum = (a, k) => a.reduce((x, y) => x + y[k], 0);
expect('overview subscription_mix sums to parents_total', sum(ov.subscription_mix, 'count') === ov.parents_total);
expect('overview kids_by_grade sums to kids_total', sum(ov.kids_by_grade, 'count') === ov.kids_total);
expect('overview plan_mix mrr equals mrr_cad_cents', sum(ov.plan_mix, 'mrr_cad_cents') === ov.mrr_cad_cents && sum(ov.plan_mix, 'count') === ov.parents_total);
expect('overview day series have 30 points and end on active_today', ov.active_kids_by_day_30.length === 30 && ov.minutes_by_day_30.length === 30 && ov.sessions_by_day_30.length === 30 && ov.active_kids_by_day_30[29].value === ov.active_today && ov.activity_by_day_90.length === 90 && ov.activity_by_day_90[89].active_kids === ov.active_today);
expect('overview month series: 12 signup months, 12 mrr months ending on current mrr', ov.signups_by_month_12.length === 12 && ov.mrr_by_month_12.length === 12 && ov.mrr_by_month_12[11].mrr_cad_cents === ov.mrr_cad_cents && ov.signups_by_day_30.length === 30);
expect('overview has real activity, retention, churn, arpu, worlds', ov.minutes_by_day_30.some((d) => d.value > 0) && ov.retention.pct >= 0 && ov.retention.pct <= 100 && ov.churn_30d >= 0 && ov.arpu_cad_cents > 0 && ov.top_worlds.length === 8 && ov.top_worlds[0].sessions_30d > 0);
expect('overview signups spread over the year (older months have signups)', ov.signups_by_month_12.slice(0, 6).some((m) => m.count > 0) && ov.trend_30.length === 31);
r = await adm('GET', '/parents?page=1&page_size=15');
expect('parents are paged', r.json().items.length === 15 && r.json().total >= 41 && r.json().page_size === 15);
const pg2 = (await adm('GET', '/parents?page=2&page_size=15')).json();
expect('page 2 differs from page 1', pg2.items[0].id !== r.json().items[0].id);
r = await adm('GET', '/parents?q=selftest');
const me = r.json().items.find((p) => p.email === email.toLowerCase());
expect('parents search finds the registered parent (email lower-cased)', Boolean(me));
r = await adm('GET', '/parents?status=blocked');
expect('parents filter by status', r.json().total >= 4 && r.json().items.every((p) => p.status === 'blocked'));
r = await adm('GET', '/parents?subscription=unpaid&page_size=100');
expect('parents filter by subscription', r.json().total >= 4 && r.json().items.every((p) => p.subscription.status === 'unpaid'));

const auditCount = async () => (await adm('GET', '/audit?page_size=1')).json().total;
let a0 = await auditCount();
r = await adm('PATCH', `/parents/${me.id}`, { status: 'blocked', blocked_reason: 'selftest' });
expect('admin blocks a parent', r.status === 200 && r.json().status === 'blocked' && r.json().blocked_reason === 'selftest');
r = await sessionAs();
expect('blocked parent: kid session refused 403 account_blocked (fr and en copy)', r.status === 403 && r.json().code === 'account_blocked' && r.json().i18n.en.title && r.json().i18n.fr.detail);
r = await call('GET', `/v1/children/${Z}/feed?limit=2`, null, PH);
expect('feed stays readable while blocked', r.status === 200);
r = await adm('PATCH', `/parents/${me.id}`, { status: 'active' });
r = await sessionAs();
expect('unblocked parent plays again', r.status === 201);
r = await adm('PATCH', `/parents/${me.id}`, { subscription: { status: 'unpaid' } });
expect('admin marks the parent unpaid', r.json().subscription.status === 'unpaid' && r.json().subscription.can_play === false);
r = await sessionAs();
expect('unpaid: 402 subscription_inactive with i18n copy', r.status === 402 && r.json().code === 'subscription_inactive' && r.json().i18n.en.detail.length > 10 && r.json().title === r.json().i18n.fr.title);
r = await sessionAs(PH, 'en-CA');
expect('402 title follows Accept-Language', r.json().title === r.json().i18n.en.title);
r = await adm('PUT', '/config', { unpaid_policy: 'allow' });
r = await sessionAs();
expect('policy allow lets an unpaid family play', r.status === 201);
r = await adm('PUT', '/config', { unpaid_policy: 'nonsense' });
expect('config validation refuses a bad policy', r.status === 422);
await adm('PUT', '/config', { unpaid_policy: 'block' });
r = await adm('PATCH', `/parents/${me.id}`, { subscription: { status: 'paid', plan: 'family_yearly' } });
expect('admin marks the parent paid (yearly)', r.json().subscription.status === 'active' && r.json().subscription.plan === 'family_yearly' && r.json().subscription.marked_by_admin === true);
r = await sessionAs();
expect('paid again: play works', r.status === 201);
r = await adm('PATCH', `/parents/${me.id}`, { subscription: { extend_days: 10 } });
expect('extend adds days', r.json().subscription.days_left >= 29);
expect('audit grew with every mutation', (await auditCount()) >= a0 + 7);

r = await adm('GET', '/children?page_size=100');
const kidRow = r.json().items[5];
a0 = await auditCount();
r = await adm('GET', `/children/${kidRow.id}`);
expect('child detail has parent and stats', r.status === 200 && r.json().parent && typeof r.json().sessions_total === 'number');
r = await adm('GET', `/children/${kidRow.id}/activity`);
expect('child activity lists sessions', r.status === 200 && Array.isArray(r.json().sessions));
expect('child reads are audited', (await auditCount()) === a0 + 2);
r = await adm('PATCH', `/children/${kidRow.id}`, { name: 'Renamed', grade: 4, daily_time_limit_minutes: 30, kid_can_change_language: false });
expect('child patch updates name, grade, limit and language flag', r.json().display_name === 'Renamed' && r.json().grade === 4 && r.json().settings.daily_time_limit_minutes === 30 && r.json().settings.kid_can_change_language === false);
r = await adm('PATCH', `/children/${kidRow.id}`, { grade: 9 });
expect('child patch validates grade', r.status === 422);

r = await adm('POST', '/notifications/broadcast', { audience: 'parent', title: { fr: 'Bonjour', en: 'Hello' }, body: 'Nouveauté', filter: { parent_ids: [me.id] } });
expect('broadcast reaches one targeted parent', r.status === 201 && r.json().recipients === 1);
r = await call('GET', '/v1/notifications', null, PH);
const note = r.json().items.find((n) => n.kind === 'announcement');
expect('parent receives the broadcast in the right language', Boolean(note) && note.title === 'Bonjour' && note.read === false && r.json().unread_count >= 1);
r = await call('POST', `/v1/notifications/${note.id}/read`, null, PH);
r = await call('GET', '/v1/notifications', null, PH);
expect('mark read works', r.json().items.find((n) => n.id === note.id).read === true);
r = await adm('GET', '/notifications');
expect('admin lists broadcasts', r.json().items.some((n) => n.broadcast && n.title === 'Bonjour'));
const planBody = async (price) => ({ plans: (await call('GET', '/v1/subscription/plans')).json().plans.map((p) => (p.id === 'family_monthly' ? { ...p, price_cad_cents: price } : p)) });
r = await adm('PUT', '/subscriptions/plans', await planBody(999));
expect('admin edits plan prices, parents see them', r.status === 200 && (await call('GET', '/v1/subscription/plans')).json().plans[1].price_cad_cents === 999);
await adm('PUT', '/subscriptions/plans', await planBody(899));

// kid_can_change_language round trip through the parent settings route (Zoé is a platform kid too)
r = await call('GET', `/v1/children/${Z}/settings`);
expect('settings default kid_can_change_language true', r.json().kid_can_change_language === true);
await call('PUT', `/v1/children/${Z}/settings`, { ...r.json(), kid_can_change_language: false });
r = await call('GET', `/v1/children/${Z}/settings`);
expect('parent turns kid_can_change_language off', r.json().kid_can_change_language === false);
r = await adm('PATCH', `/children/${Z}`, { kid_can_change_language: true });
r = await call('GET', `/v1/children/${Z}/settings`);
expect('admin turns it back on and the kid app sees it', r.json().kid_can_change_language === true);

r = await adm('GET', '/audit?page=1&page_size=100');
expect('audit entries carry actor, action and target', r.json().items.every((e) => e.actor && e.action && e.target_type && e.at));
r = await adm('DELETE', `/parents/${me.id}`);
expect('admin deletes a parent', r.status === 204 && (await adm('GET', `/parents/${me.id}`)).status === 404);
r = await fetch(`${BASE}/admin/v1/overview`, { method: 'OPTIONS', headers: { origin: 'http://evil.test', 'access-control-request-method': 'GET' } });
expect('CORS: foreign origin gets no allow header', r.status === 204 && !r.headers.get('access-control-allow-origin'));
if (process.env.ADMIN_ORIGIN) {
  r = await fetch(`${BASE}/admin/v1/overview`, { method: 'OPTIONS', headers: { origin: process.env.ADMIN_ORIGIN } });
  expect('CORS: ADMIN_ORIGIN is allowed', r.headers.get('access-control-allow-origin') === process.env.ADMIN_ORIGIN);
}
expect(`cookie still small after platform calls (${state.length})`, state.length < 3800);

console.log(failures.length ? `\n${failures.length} failure(s): ${failures.join('; ')}` : '\nall good');
process.exit(failures.length ? 1 : 0);
