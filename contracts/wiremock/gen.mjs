// Generates WireMock mappings from the hand-written scenarios below.
// Source of truth for mock behavior. Run: node contracts/wiremock/gen.mjs
// Output: contracts/wiremock/mappings/*.json (committed, so `docker compose up` needs no Node).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const OUT = join(fileURLToPath(new URL('.', import.meta.url)), 'mappings');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const V = '/v1';
const ZOE = '11111111-1111-4111-8111-111111111111';
const MAX = '22222222-2222-4222-8222-222222222222';
const SESSION = '33333333-3333-4333-8333-333333333333';
const beatId = (i) => `44444444-4444-4444-8444-44444444444${i}`;
const NOW = '2026-10-12T14:00:00Z';

// Bilingual text through response templating on the Accept-Language header
const t = (fr, en) => `{{#if (contains request.headers.[Accept-Language].[0] 'en')}}${en}{{else}}${fr}{{/if}}`;

const JSON_H = { 'Content-Type': 'application/json' };
const PROBLEM_H = { 'Content-Type': 'application/problem+json' };

let n = 0;
const files = [];
function add(name, mapping) {
  n += 1;
  const id = `${String(n).padStart(3, '0')}-${name}`;
  files.push(id);
  writeFileSync(join(OUT, `${id}.json`), JSON.stringify(mapping, null, 2) + '\n');
}

const ok = (status, body, extra = {}) => ({
  status,
  headers: JSON_H,
  jsonBody: body,
  ...extra,
});
const problem = (status, code, title, detail) => ({
  status,
  headers: PROBLEM_H,
  jsonBody: { type: `https://numerix.app/problems/${code.replace(/_/g, '-')}`, title, status, detail, code },
});

// Failure injection: cookie nx_mock_scenario is forwarded by the app proxy as X-Mock-Scenario
const scenarioHeader = (value) => ({ 'X-Mock-Scenario': { equalTo: value } });

// ───────────── Fixtures ─────────────
const parent = { id: '99999999-9999-4999-8999-999999999999', email: 'parent@example.com', locale: 'fr-CA' };
const zoe = {
  id: ZOE, display_name: 'Zoé', birth_year: 2018, grade: 3, avatar_id: 'fox', has_pin: true,
  consent_given: true, favorite_world: 'echecs', timezone: 'America/Toronto',
  onboarding_completed: false, created_at: NOW,
};
const max = {
  id: MAX, display_name: 'Max', birth_year: 2020, grade: 1, avatar_id: 'bear', has_pin: false,
  consent_given: false, favorite_world: null, timezone: 'America/Toronto',
  onboarding_completed: false, created_at: NOW,
};
const worlds = [
  ['nature', 'Nature', 'Explore la forêt et ses secrets', 'Explore the forest and its secrets', '#3FA34D', 41],
  ['espace', 'Espace', 'Une mission vers les étoiles', 'A mission to the stars', '#5B5BD6', 32],
  ['cuisine', 'Cuisine', 'Un grand repas à préparer', 'A big meal to cook', '#F07E2B', 39],
  ['sport', 'Sport', 'Le grand match approche', 'The big match is coming', '#1E88E5', 29],
  ['construction', 'Construction', 'Bâtis quelque chose d’incroyable', 'Build something amazing', '#E0A100', 44],
  ['medecine', 'Médecine', 'Soigne et sauve la journée', 'Heal and save the day', '#14A0A0', 52],
  ['science', 'Science', 'Le laboratoire a besoin de toi', 'The lab needs you', '#8E44AD', 75],
  ['echecs', 'Échecs', 'Un tournoi t’attend', 'A tournament awaits', '#4A5568', 43],
].map(([id, name, hookFr, hookEn, accent, count]) => ({
  id,
  name,
  tagline: name,
  image_url: '',
  accent_color: accent,
  hook: t(hookFr, hookEn),
  skill_count: count,
}));
const cards = [
  { id: '55555555-5555-4555-8555-555555555551', world: 'echecs', title: t('Le tournoi des tours', 'The tower tournament'), image_url: '', session_id: SESSION, earned_at: NOW },
  { id: '55555555-5555-4555-8555-555555555552', world: 'nature', title: t('La clairière secrète', 'The secret clearing'), image_url: '', session_id: SESSION, earned_at: NOW },
];
const engagement = {
  streak: { current_days: 3, longest_days: 5, last_active_date: '2026-10-11' },
  daily_goal: { target_chapters: 1, done_chapters: 0 },
};
const growthPeriod = (c, s, m) => ({ chapters_completed: c, skills_mastered: s, minutes_played: m });
const growth = { window_days: 7, current: growthPeriod(4, 2, 48), previous: growthPeriod(2, 1, 25) };
const quest = { available: true, completed: false, skill_ids: ['ARI-OPE-A06a'] };
const nodes = [
  ['ARI-OPE-A02a', 'mastered', 3], ['ARI-OPE-A03a', 'mastered', 2], ['ARI-OPE-A05', 'needs_review', 1],
  ['ARI-OPE-A06a', 'available', 0], ['ARI-SOP-A03a', 'in_progress', 0], ['ARI-OPE-A07a', 'locked', 0],
  ['ARI-SEN-A01c', 'locked', 0],
].map(([skill_id, state, level], i) => ({
  skill_id,
  label: t(['Additions rapides', 'Calcul mental', 'Le terme manquant', 'Les tables', 'Partager et grouper', 'Division avec reste', 'Grands nombres'][i],
           ['Quick sums', 'Mental math', 'The missing term', 'Times tables', 'Share and group', 'Division with remainder', 'Big numbers'][i]),
  state,
  position: { row: i, col: [2, 3, 2, 1, 2, 3, 2][i] },
  level,
  next_review_at: state === 'needs_review' ? '2026-10-12T18:00:00Z' : null,
}));
const session = (over = {}) => ({
  id: SESSION, child_id: ZOE, world: 'echecs', kind: 'chapter', status: 'active', chapter_length: 3,
  beats_answered: 0, current_beat: null, story_title: null, started_at: NOW, ended_at: null, ...over,
});

// The three sample problems: [skill, math_text, choices, correct, typical]
const problems = [
  ['ARI-OPE-A06a', '7 × 8 = ?', [54, 56, 48, 63], 56, 54],
  ['ARI-SOP-A03a', '48 ÷ 8 = ?', [4, 6, 8, 12], 6, 8],
  ['ARI-OPE-A07a', t('340 ÷ 7 = ? (avec reste)', '340 ÷ 7 = ? (with remainder)'), [[49, 4], [47, 11], [48, 0], [48, 4]], [48, 4], [48, 0]],
];
const scenes = [
  [t('Sur l’échiquier géant, ta tour doit avancer de huit cases, sept fois de suite. Combien de cases parcourra-t-elle ?', 'On the giant chessboard, your rook must move eight squares, seven times in a row. How many squares will it travel?'),],
  [t('Le roi a quarante-huit pions à répartir en huit équipes égales. Combien de pions par équipe ?', 'The king has forty-eight pawns to split into eight equal teams. How many pawns per team?')],
  [t('Trois cent quarante invités arrivent au tournoi et il y a sept grandes tables. Combien par table, et combien restent debout ?', 'Three hundred forty guests arrive at the tournament and there are seven big tables. How many per table, and how many are left standing?')],
];
const outcomes = {
  correct: t('La tour glisse sans effort et le pont se baisse devant toi. Le calcul a rendu le passage possible. Bravo !', 'The rook glides across and the bridge lowers in front of you. Your math opened the way. Well done!'),
  erreur_typique: t('La tour s’arrête une case trop tôt. Un petit pont se lève pour te montrer un autre chemin. Essayons-le ensemble.', 'The rook stops one square short. A little bridge rises to show you another path. Let us try it together.'),
  erreur_aleatoire: t('Un coup de vent fait tourner l’échiquier ! La scène change et une nouvelle chance apparaît.', 'A gust of wind spins the chessboard! The scene changes and a fresh chance appears.'),
};
const beat = (i) => ({
  id: beatId(i), session_id: SESSION, index: i, skill_id: problems[i][0],
  question: { math_text: problems[i][1], choices: problems[i][2] },
  scene: { status: 'pending', text: null, illustration_url: null },
  created_at: NOW,
});
const chapterRewards = [
  { type: 'chapter_complete' },
  { type: 'card_earned', card: cards[0] },
  { type: 'streak_extended', streak_days: 4 },
  { type: 'skill_mastered', skill_id: 'ARI-OPE-A06a' },
  { type: 'daily_goal_met' },
];

// ───────────── Failure injection (highest priority) ─────────────
add('inject-network-error', { priority: 1, request: { urlPathPattern: `${V}/.*`, headers: scenarioHeader('network-error') }, response: { fault: 'CONNECTION_RESET_BY_PEER' } });
add('inject-unauthorized', { priority: 1, request: { urlPathPattern: `${V}/(children|sessions|reports|worlds|skills).*`, headers: scenarioHeader('unauthorized') }, response: problem(401, 'unauthorized', 'Session ended', 'The access token is missing or expired.') });
add('inject-rate-limited', { priority: 1, request: { urlPathPattern: `${V}/.*`, headers: scenarioHeader('rate-limited') }, response: problem(429, 'rate_limited', 'Too many requests', 'Slow down and try again.') });
add('inject-server-error', { priority: 1, request: { urlPathPattern: `${V}/.*`, headers: scenarioHeader('server-error') }, response: problem(500, 'internal_error', 'Something went wrong', 'The server could not complete the request.') });
add('inject-daily-limit', { priority: 1, request: { method: 'POST', urlPathPattern: `${V}/children/[^/]+/sessions`, headers: scenarioHeader('daily-limit') }, response: problem(403, 'daily_limit_reached', 'Daily limit reached', 'The daily time limit is reached.') });

// ───────────── Auth ─────────────
const authBody = (email = '{{jsonPath request.body \'$.email\'}}') => ({
  access_token: 'mock-parent-token', refresh_token: 'mock-refresh-token', expires_in: 3600,
  parent: { ...parent, email },
});
add('auth-register', { priority: 5, request: { method: 'POST', urlPath: `${V}/auth/register` }, response: ok(201, authBody(), { transformers: ['response-template'] }) });
add('auth-login-wrong', { priority: 2, request: { method: 'POST', urlPath: `${V}/auth/login`, bodyPatterns: [{ matchesJsonPath: "$[?(@.password == 'wrong-password')]" }] }, response: problem(401, 'unauthorized', 'Wrong email or password', 'Check your details and try again.') });
add('auth-login', { priority: 5, request: { method: 'POST', urlPath: `${V}/auth/login` }, response: ok(200, authBody(), { transformers: ['response-template'] }) });
add('auth-refresh', { priority: 5, request: { method: 'POST', urlPath: `${V}/auth/refresh` }, response: ok(200, authBody('parent@example.com')) });
add('auth-consent', { priority: 5, request: { method: 'POST', urlPath: `${V}/auth/consent` }, response: { status: 204 } });

// ───────────── Children ─────────────
add('children-list', { priority: 5, request: { method: 'GET', urlPath: `${V}/children` }, response: ok(200, { items: [zoe, max] }, { transformers: ['response-template'] }) });
add('children-create', {
  priority: 5, request: { method: 'POST', urlPath: `${V}/children` },
  response: {
    status: 201, headers: JSON_H, transformers: ['response-template'],
    body: `{"id":"66666666-6666-4666-8666-666666666666","display_name":"{{jsonPath request.body '$.display_name'}}","grade":{{jsonPath request.body '$.grade'}},"avatar_id":"{{jsonPath request.body '$.avatar_id'}}","has_pin":false,"consent_given":false,"favorite_world":null,"timezone":"America/Toronto","onboarding_completed":false,"created_at":"${NOW}"}`,
  },
});
add('child-get-zoe', { priority: 5, request: { method: 'GET', urlPath: `${V}/children/${ZOE}` }, response: ok(200, zoe, { transformers: ['response-template'] }) });
add('child-get-max', { priority: 5, request: { method: 'GET', urlPath: `${V}/children/${MAX}` }, response: ok(200, max) });
add('child-patch', { priority: 6, request: { method: 'PATCH', urlPathPattern: `${V}/children/[^/]+` }, response: ok(200, zoe, { transformers: ['response-template'] }) });
add('child-delete', { priority: 6, request: { method: 'DELETE', urlPathPattern: `${V}/children/[^/]+` }, response: { status: 204 } });
add('child-token-bad-pin', {
  priority: 2, request: { method: 'POST', urlPath: `${V}/children/${ZOE}/token`, bodyPatterns: [{ matchesJsonPath: "$[?(@.pin != '1234')]" }] },
  response: problem(403, 'invalid_pin', 'Wrong PIN', 'That PIN does not match.'),
});
add('child-token-zoe', { priority: 5, request: { method: 'POST', urlPath: `${V}/children/${ZOE}/token` }, response: ok(200, { access_token: 'mock-child-token', expires_in: 3600, child: zoe }) });
add('child-token-other', { priority: 6, request: { method: 'POST', urlPathPattern: `${V}/children/[^/]+/token` }, response: ok(200, { access_token: 'mock-child-token', expires_in: 3600, child: max }) });
const settings = { daily_goal_chapters: 1, daily_time_limit_minutes: null, enabled_worlds: worlds.map((w) => w.id), read_aloud: true, sound: true };
add('child-settings-get', { priority: 5, request: { method: 'GET', urlPathPattern: `${V}/children/[^/]+/settings` }, response: ok(200, settings) });
add('child-settings-put', { priority: 5, request: { method: 'PUT', urlPathPattern: `${V}/children/[^/]+/settings` }, response: { status: 200, headers: JSON_H, body: '{{{request.body}}}', transformers: ['response-template'] } });
add('child-export', { priority: 5, request: { method: 'GET', urlPathPattern: `${V}/children/[^/]+/export` }, response: ok(200, { child: zoe, sessions: [], progress: [] }) });

// ───────────── Catalog and journey ─────────────
add('worlds', { priority: 5, request: { method: 'GET', urlPath: `${V}/worlds` }, response: ok(200, { items: worlds }, { transformers: ['response-template'] }) });
add('skills', { priority: 5, request: { method: 'GET', urlPath: `${V}/skills` }, response: ok(200, { items: [
  { id: 'ARI-OPE-A06a', label: 'Construire les faits numériques de la multiplication', ref_pda: 'Opérations — A.6.a', section: 'operations', grade_intro: 3, grade_mastery: 3, cycle: 2, prerequisites: [], worlds: ['echecs', 'nature'], implemented: true },
  { id: 'ARI-OPE-A07a', label: 'Division avec reste', ref_pda: 'Opérations — A.7.a', section: 'operations', grade_intro: 4, grade_mastery: 4, cycle: 2, prerequisites: ['ARI-OPE-A06a'], worlds: ['echecs'], implemented: true },
] }) });
add('journey', { priority: 5, request: { method: 'GET', urlPathPattern: `${V}/children/[^/]+/journey.*` }, response: ok(200, { world: "{{request.query.world}}", nodes, current_skill_id: 'ARI-OPE-A06a' }, { transformers: ['response-template'] }) });

// ───────────── Engagement, progress ─────────────
add('engagement', { priority: 5, request: { method: 'GET', urlPathPattern: `${V}/children/[^/]+/engagement` }, response: ok(200, engagement) });
add('quest', { priority: 5, request: { method: 'GET', urlPathPattern: `${V}/children/[^/]+/quests/daily` }, response: ok(200, quest) });
add('collection', { priority: 5, request: { method: 'GET', urlPathPattern: `${V}/children/[^/]+/collection.*` }, response: ok(200, { items: cards }, { transformers: ['response-template'] }) });
add('home', {
  priority: 5, request: { method: 'GET', urlPathPattern: `${V}/children/[^/]+/home` },
  response: ok(200, {
    suggested: { world: 'echecs', skill_id: 'ARI-OPE-A06a', label: nodes[3].label, open_session: null },
    quest, worlds, recent_cards: cards, engagement, growth,
  }, { transformers: ['response-template'] }),
});
add('growth', { priority: 5, request: { method: 'GET', urlPathPattern: `${V}/children/[^/]+/growth.*` }, response: ok(200, growth) });
add('reviews', { priority: 5, request: { method: 'GET', urlPathPattern: `${V}/children/[^/]+/reviews.*` }, response: ok(200, { items: [{ skill_id: 'ARI-OPE-A05', label: 'Le terme manquant', due_at: '2026-10-12T18:00:00Z' }] }) });
const misconceptions = [{ code: 'reste_ignore', description: 'Ignore le reste dans une division', skill_ids: ['ARI-OPE-A07a'] }];
add('progress', { priority: 5, request: { method: 'GET', urlPathPattern: `${V}/children/[^/]+/progress` }, response: ok(200, {
  skills: nodes.map((x) => ({ skill_id: x.skill_id, mastery: x.state === 'mastered' ? 0.95 : x.state === 'locked' ? 0 : 0.5, state: x.state, attempts: x.level * 4, last_practiced_at: NOW, next_review_at: x.next_review_at })),
  misconceptions,
}) });
add('weekly-report', { priority: 5, request: { method: 'GET', urlPath: `${V}/reports/weekly` }, response: ok(200, {
  child_id: ZOE, week_start: '2026-10-05', sessions: 4, days_played: 3, skills_practised: ['ARI-OPE-A06a', 'ARI-SOP-A03a'], stuck_points: misconceptions, growth,
}) });

// ───────────── Sessions: the stateful chapter ─────────────
const SC = 'chapter';
const states = ['Started', 'S0'];
for (let i = 0; i < 3; i++) states.push(`B${i}`, `A${i}c`, `A${i}t`, `A${i}r`);

// Start (also resets the chapter from any state)
for (const s of states) {
  add(`session-start-${s}`, {
    priority: 5, scenarioName: SC, requiredScenarioState: s, newScenarioState: 'S0',
    request: { method: 'POST', urlPathPattern: `${V}/children/[^/]+/sessions` },
    response: ok(201, session()),
  });
}
add('sessions-list', { priority: 5, request: { method: 'GET', urlPathPattern: `${V}/children/[^/]+/sessions` }, response: ok(200, { items: [session({ status: 'completed', beats_answered: 3, story_title: t('Le tournoi des tours', 'The tower tournament'), ended_at: NOW })], next_cursor: null }, { transformers: ['response-template'] }) });
add('session-get', { priority: 5, request: { method: 'GET', urlPath: `${V}/sessions/${SESSION}` }, response: ok(200, session({ story_title: t('Le tournoi des tours', 'The tower tournament') }), { transformers: ['response-template'] }) });

// Next beat per state
add('beat-first', { priority: 5, scenarioName: SC, requiredScenarioState: 'S0', newScenarioState: 'B0', request: { method: 'POST', urlPath: `${V}/sessions/${SESSION}/beats` }, response: ok(201, beat(0), { transformers: ['response-template'] }) });
for (let i = 0; i < 3; i++) {
  add(`beat-repeat-B${i}`, { priority: 5, scenarioName: SC, requiredScenarioState: `B${i}`, request: { method: 'POST', urlPath: `${V}/sessions/${SESSION}/beats` }, response: ok(200, beat(i), { transformers: ['response-template'] }) });
  if (i < 2) {
    for (const k of ['c', 't', 'r']) {
      add(`beat-next-A${i}${k}`, { priority: 5, scenarioName: SC, requiredScenarioState: `A${i}${k}`, newScenarioState: `B${i + 1}`, request: { method: 'POST', urlPath: `${V}/sessions/${SESSION}/beats` }, response: ok(201, beat(i + 1), { transformers: ['response-template'] }) });
    }
  }
}
add('beat-after-done', { priority: 6, request: { method: 'POST', urlPath: `${V}/sessions/${SESSION}/beats` }, response: problem(409, 'session_completed', 'Chapter finished', 'This chapter is already complete.') });

// Answers
const answerMatch = (value) => Array.isArray(value)
  ? `$[?(@.answer[0] == ${value[0]} && @.answer[1] == ${value[1]})]`
  : `$[?(@.answer == ${value})]`;
for (let i = 0; i < 3; i++) {
  const last = i === 2;
  const sess = (answered) => session({ beats_answered: answered, status: last ? 'completed' : 'active', ended_at: last ? NOW : null, story_title: t('Le tournoi des tours', 'The tower tournament') });
  const result = (outcome) => ({
    outcome,
    correct_answer: problems[i][3],
    denouement: { status: 'pending', text: null, illustration_url: null },
    session: sess(i + 1),
    rewards: last ? chapterRewards : [],
  });
  const answerUrl = `${V}/sessions/${SESSION}/beats/${beatId(i)}/answer`;
  add(`answer-${i}-correct`, { priority: 2, scenarioName: SC, requiredScenarioState: `B${i}`, newScenarioState: `A${i}c`, request: { method: 'POST', urlPath: answerUrl, bodyPatterns: [{ matchesJsonPath: answerMatch(problems[i][3]) }] }, response: ok(200, result('correct'), { transformers: ['response-template'] }) });
  add(`answer-${i}-typical`, { priority: 2, scenarioName: SC, requiredScenarioState: `B${i}`, newScenarioState: `A${i}t`, request: { method: 'POST', urlPath: answerUrl, bodyPatterns: [{ matchesJsonPath: answerMatch(problems[i][4]) }] }, response: ok(200, result('erreur_typique'), { transformers: ['response-template'] }) });
  add(`answer-${i}-random`, { priority: 4, scenarioName: SC, requiredScenarioState: `B${i}`, newScenarioState: `A${i}r`, request: { method: 'POST', urlPath: answerUrl }, response: ok(200, result('erreur_aleatoire'), { transformers: ['response-template'] }) });
  add(`answer-${i}-twice`, { priority: 6, request: { method: 'POST', urlPath: answerUrl }, response: problem(409, 'beat_answered', 'Already answered', 'This question was already answered.') });
}

// Narration streams (server-sent events, delivered in chunks to simulate typing)
const sse = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
function stream(text, event) {
  // Split the (templated) text into word groups so the stream is visibly progressive
  const words = text.split(' ');
  const chunks = [];
  for (let i = 0; i < words.length; i += 4) chunks.push(words.slice(i, i + 4).join(' ') + (i + 4 < words.length ? ' ' : ''));
  return chunks.map((c) => sse(event, { delta: c })).join('') + sse('done', {});
}
const sseResponse = (body, delayMs = 1400) => ({
  status: 200,
  headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  body,
  transformers: ['response-template'],
  chunkedDribbleDelay: { numberOfChunks: 8, totalDuration: delayMs },
});
const narrationUrl = (i) => `${V}/sessions/${SESSION}/beats/${beatId(i)}/narration`;
add('narration-fallback', { priority: 1, request: { method: 'GET', urlPathPattern: `${V}/sessions/.*/narration.*`, headers: scenarioHeader('narration-fallback') }, response: { status: 200, headers: { 'Content-Type': 'text/event-stream' }, transformers: ['response-template'], body: sse('fallback', { text: t('Le héros avance dans l’histoire, un pas à la fois.', 'The hero moves ahead in the story, one step at a time.') }) } });
add('narration-slow', { priority: 1, request: { method: 'GET', urlPathPattern: `${V}/sessions/.*/narration.*`, headers: scenarioHeader('narration-slow') }, response: { ...sseResponse('event: done\ndata: {}\n\n'), fixedDelayMilliseconds: 9000 } });
for (let i = 0; i < 3; i++) {
  add(`narration-scene-${i}`, { priority: 5, scenarioName: SC, requiredScenarioState: `B${i}`, request: { method: 'GET', urlPath: narrationUrl(i), queryParameters: { phase: { equalTo: 'scene' } } }, response: sseResponse(stream(scenes[i][0], 'scene')) });
  const denTexts = { c: outcomes.correct, t: outcomes.erreur_typique, r: outcomes.erreur_aleatoire };
  for (const k of ['c', 't', 'r']) {
    const state = `A${i}${k}`;
    add(`narration-den-${i}${k}`, { priority: 5, scenarioName: SC, requiredScenarioState: state, request: { method: 'GET', urlPath: narrationUrl(i), queryParameters: { phase: { equalTo: 'denouement' } } }, response: sseResponse(stream(denTexts[k], 'denouement')) });
  }
}
// Fallback for narration requests outside the expected chapter state
add('narration-pause-resume-ok', { priority: 9, request: { method: 'GET', urlPathPattern: `${V}/sessions/.*/narration.*` }, response: sseResponse(stream(outcomes.correct, 'denouement')) });

add('session-pause', { priority: 5, request: { method: 'POST', urlPath: `${V}/sessions/${SESSION}/pause` }, response: ok(200, session({ status: 'paused' })) });
add('session-resume', { priority: 5, request: { method: 'POST', urlPath: `${V}/sessions/${SESSION}/resume` }, response: ok(200, session()) });
add('session-finish', { priority: 5, request: { method: 'POST', urlPath: `${V}/sessions/${SESSION}/finish` }, response: ok(200, session({ status: 'completed', ended_at: NOW })) });
add('session-summary', { priority: 5, request: { method: 'GET', urlPath: `${V}/sessions/${SESSION}/summary` }, response: ok(200, {
  session: session({ status: 'completed', beats_answered: 3, ended_at: NOW, story_title: t('Le tournoi des tours', 'The tower tournament') }),
  duration_seconds: 540,
  story_recap: t('Zoé a traversé le grand échiquier et aidé le roi à répartir ses pions.', 'Zoé crossed the giant chessboard and helped the king split his pawns.'),
  skills: [
    { skill_id: 'ARI-OPE-A06a', label: 'Les tables', reason: 'nouvelle', attempts: 1, correct: 1 },
    { skill_id: 'ARI-SOP-A03a', label: 'Partager et grouper', reason: 'consolidation', attempts: 1, correct: 0 },
    { skill_id: 'ARI-OPE-A07a', label: 'Division avec reste', reason: 'revision', attempts: 1, correct: 1 },
  ],
  stuck_points: misconceptions,
}, { transformers: ['response-template'] }) });

// ───────────── Ops ─────────────
add('health', { priority: 5, request: { method: 'GET', urlPath: `${V}/health` }, response: ok(200, { status: 'ok', narrator: 'stub' }) });
add('events', { priority: 5, request: { method: 'POST', urlPath: `${V}/events` }, response: { status: 202 } });

// Reset helper: GET /v1/__reset also resets scenarios through the admin API (called by the app proxy in dev)
console.log(`wrote ${files.length} mappings to ${OUT}`);
