import { KINDS, feedItem, puzzleFor } from './feed.mjs';
import { sessionRoutes } from './session.mjs';

// Stateful domain of the mock: children, consent, PINs, settings, the chapter loop (session.mjs) and the endless feed (feed.mjs).
// Data travels with the client (the x-mock-state header) so it survives serverless cold starts and
// stays private to each browser. Static endpoints (journey, worlds...) come from the
// WireMock mappings; this file only handles what must remember things.

export const ZOE = '11111111-1111-4111-8111-111111111111';
export const MAX = '22222222-2222-4222-8222-222222222222';
const NOW = '2026-10-12T14:00:00Z';
const MAX_CHILDREN = 8;
const MAX_REACTIONS = 60;

export const WORLD_IDS = ['nature', 'espace', 'cuisine', 'sport', 'construction', 'medecine', 'science', 'echecs'];
const WORLD_NAMES = {
  nature: ['Nature', 'Nature'], espace: ['Espace', 'Space'], cuisine: ['Cuisine', 'Cooking'], sport: ['Sport', 'Sport'],
  construction: ['Construction', 'Building'], medecine: ['Médecine', 'Medicine'], science: ['Science', 'Science'], echecs: ['Échecs', 'Chess'],
};

// Compact child records keep the cookie small: id, name, grade, avatar, pin, consent, onboarding, world
export function seed() {
  return {
    children: [
      { id: ZOE, n: 'Zoé', g: 3, a: 'fox', p: '1234', c: 1, o: 0, w: 'echecs' },
      { id: MAX, n: 'Max', g: 1, a: 'bear', p: '', c: 0, o: 0, w: null },
    ],
    next: 1,
    settings: {},
    reactions: {},
    sess: null,
    seed: 0,
  };
}

const publicChild = (c) => ({
  id: c.id, display_name: c.n, birth_year: 2026 - (c.g + 5), grade: c.g, avatar_id: c.a, has_pin: Boolean(c.p),
  consent_given: Boolean(c.c), favorite_world: c.w ?? null, timezone: 'America/Toronto', onboarding_completed: Boolean(c.o), created_at: NOW,
});

const json = (status, body, extra = {}) => ({ status, headers: { 'content-type': 'application/json', ...extra }, chunks: [JSON.stringify(body)], delays: [0] });
const empty = (status) => ({ status, headers: {}, chunks: [''], delays: [0] });
const problem = (status, code, title, detail) =>
  ({ status, headers: { 'content-type': 'application/problem+json' }, chunks: [JSON.stringify({ type: `https://numerix.app/problems/${code.replace(/_/g, '-')}`, title, status, code, detail })], delays: [0] });

const DEFAULT_SETTINGS = { daily_goal_chapters: 1, daily_time_limit_minutes: null, enabled_worlds: WORLD_IDS, read_aloud: true, sound: true };

// ───────────── Routing ─────────────
/** Returns { plan, d } when the request is handled here, or null to let the mappings answer. */
export function domain(req, d) {
  const { method, path } = req;
  const lang = (req.headers['accept-language'] ?? 'fr').toLowerCase();
  const body = () => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } };
  const find = (id) => d.children.find((c) => c.id === id);
  let m;

  if (path === '/v1/children' && method === 'GET') return { plan: json(200, { items: d.children.map(publicChild) }), d };

  if (path === '/v1/children' && method === 'POST') {
    const b = body();
    if (d.children.length >= MAX_CHILDREN) return { plan: problem(422, 'validation_failed', 'Too many profiles', `A demo account holds ${MAX_CHILDREN} profiles.`), d };
    if (!b.display_name || !b.grade) return { plan: problem(422, 'validation_failed', 'Invalid profile', 'A name and a grade are required.'), d };
    const id = `00000000-0000-4000-8000-${String(d.next).padStart(12, '0')}`;
    const child = { id, n: String(b.display_name).slice(0, 30), g: Number(b.grade), a: b.avatar_id ?? 'fox', p: b.pin ?? '', c: 0, o: 0, w: null };
    return { plan: json(201, publicChild(child)), d: { ...d, next: d.next + 1, children: [...d.children, child] } };
  }

  if (path === '/v1/auth/consent' && method === 'POST') {
    const b = body();
    if (!find(b.child_id)) return { plan: problem(404, 'not_found', 'Child not found', 'No such profile.'), d };
    return { plan: empty(204), d: { ...d, children: d.children.map((c) => (c.id === b.child_id ? { ...c, c: 1 } : c)) } };
  }

  if ((m = /^\/v1\/children\/([^/]+)$/.exec(path))) {
    const c = find(m[1]);
    if (!c) return { plan: problem(404, 'not_found', 'Child not found', 'No such profile.'), d };
    if (method === 'GET') return { plan: json(200, publicChild(c)), d };
    if (method === 'DELETE') return { plan: empty(204), d: { ...d, sess: d.sess?.c === c.id ? null : d.sess, children: d.children.filter((x) => x.id !== c.id) } };
    if (method === 'PATCH') {
      const b = body();
      const next = { ...c, ...(b.display_name ? { n: b.display_name } : {}), ...(b.grade ? { g: b.grade } : {}), ...(b.avatar_id ? { a: b.avatar_id } : {}), ...(b.onboarding_completed !== undefined ? { o: b.onboarding_completed ? 1 : 0 } : {}), ...(b.pin !== undefined ? { p: b.pin ?? '' } : {}) };
      return { plan: json(200, publicChild(next)), d: { ...d, children: d.children.map((x) => (x.id === c.id ? next : x)) } };
    }
  }

  if ((m = /^\/v1\/children\/([^/]+)\/token$/.exec(path)) && method === 'POST') {
    const c = find(m[1]);
    if (!c) return { plan: problem(404, 'not_found', 'Child not found', 'No such profile.'), d };
    if (c.p && body().pin !== c.p) return { plan: problem(403, 'invalid_pin', 'Wrong PIN', 'That PIN does not match.'), d };
    return { plan: json(200, { access_token: 'mock-child-token', expires_in: 3600, child: publicChild(c) }), d };
  }

  if ((m = /^\/v1\/children\/([^/]+)\/settings$/.exec(path))) {
    if (!find(m[1])) return { plan: problem(404, 'not_found', 'Child not found', 'No such profile.'), d };
    if (method === 'GET') return { plan: json(200, d.settings[m[1]] ?? DEFAULT_SETTINGS), d };
    if (method === 'PUT') { const s = body(); return { plan: json(200, s), d: { ...d, settings: { ...d.settings, [m[1]]: s } } }; }
  }

  if ((m = /^\/v1\/children\/([^/]+)\/feed$/.exec(path)) && method === 'GET') {
    const c = find(m[1]);
    if (!c) return { plan: problem(404, 'not_found', 'Child not found', 'No such profile.'), d };
    if (!c.c) return { plan: problem(403, 'consent_missing', 'Consent needed', 'A parent must give consent before this child can play.'), d };
    const cursor = req.query.cursor?.[0] ?? 'i0';
    const start = Math.max(0, Number(cursor.replace(/^i/, '')) || 0);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit?.[0] ?? 5)));
    const items = Array.from({ length: limit }, (_, k) => feedItem(start + k, lang, d.reactions, c.n.split(' ')[0], WORLD_IDS[(start + k) % WORLD_IDS.length], WORLD_NAMES[WORLD_IDS[(start + k) % WORLD_IDS.length]][lang.startsWith('en') ? 1 : 0]));
    return { plan: json(200, { items, next_cursor: `i${start + limit}` }), d };
  }

  if ((m = /^\/v1\/children\/([^/]+)\/feed\/([^/]+)\/reaction$/.exec(path)) && method === 'PUT') {
    const b = body();
    const key = m[2];
    const reactions = { ...d.reactions };
    delete reactions[key];
    const value = (b.liked ? 'l' : '') + (b.saved ? 's' : '');
    if (value) reactions[key] = value;
    const keys = Object.keys(reactions);
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_REACTIONS))) delete reactions[k];
    return { plan: json(200, { liked: Boolean(b.liked), saved: Boolean(b.saved) }), d: { ...d, reactions } };
  }

  if ((m = /^\/v1\/children\/([^/]+)\/feed\/feed-(\d+)\/answer$/.exec(path)) && method === 'POST') {
    const n = Number(m[2]);
    if (KINDS[n % KINDS.length] !== 'puzzle') return { plan: problem(404, 'not_found', 'Not a puzzle', 'This item has no question.'), d };
    const p = puzzleFor(n);
    const given = Number(body().answer);
    const en = lang.startsWith('en');
    const [outcome, message] = given === p.correct
      ? ['correct', en ? 'The gate swings open and the hero walks through. Your math did that.' : 'La porte s’ouvre et le héros passe. C’est ton calcul qui a fait ça.']
      : given === p.typical
        ? ['erreur_typique', en ? 'The gate wobbles and a side path appears. Same numbers, another way to combine them.' : 'La porte vacille et un petit chemin apparaît. Mêmes nombres, une autre façon de les combiner.']
        : ['erreur_aleatoire', en ? 'A breeze blows the gate shut, then a new lock appears. Another try is waiting.' : 'Un coup de vent referme la porte, puis une nouvelle serrure apparaît. Un autre essai t’attend.'];
    return { plan: json(200, { outcome, message }), d };
  }

  return sessionRoutes(req, d, { json, empty, problem, find, body, en: lang.startsWith('en') });
}
