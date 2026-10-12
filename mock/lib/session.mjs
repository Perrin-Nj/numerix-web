// World-aware chapter loop. A play is built from (world, skill, seed): numbers and wording change on every
// play, and everything is recomputed from the compact state d.sess = {id, c, w, k, seed, n, a, len, st, ti, kd?}
// (n beats served, a outcome codes c/t/r). Beats never carry the answer.
import { KIT } from './kit.mjs';

const NOW = '2026-10-12T14:00:00Z';
const LEN = 3;

// [id, fr, en, code, misconception fr, misconception en, detour nudge fr, detour nudge en]
export const SKILLS = [
  ['ARI-OPE-A02a', 'Additions rapides', 'Quick sums', 'retenue_oubliee', 'Oublie la retenue dans une addition', 'Forgets the carry in an addition', 'Quand les unités dépassent dix, on ajoute une dizaine à gauche.', 'When the ones go past ten, you add one ten on the left.'],
  ['ARI-OPE-A03a', 'Calcul mental', 'Mental math', 'petit_moins_grand', 'Soustrait toujours le plus petit chiffre du plus grand', 'Always subtracts the smaller digit from the larger one', 'Si le chiffre du haut est trop petit, on prend une dizaine à côté.', 'If the top digit is too small, you borrow one ten from the next column.'],
  ['ARI-OPE-A05', 'Le terme manquant', 'The missing term', 'addition_au_lieu_soustraction', 'Additionne au lieu de soustraire pour trouver le terme manquant', 'Adds instead of subtracting to find the missing term', 'Pour trouver ce qui manque, on enlève ce qu’on a du total.', 'To find what is missing, you take what you have away from the total.'],
  ['ARI-OPE-A06a', 'Les tables', 'Times tables', 'addition_au_lieu_multiplication', 'Additionne les deux nombres au lieu de les multiplier', 'Adds the two numbers instead of multiplying them', 'Avec des groupes égaux, on multiplie au lieu d’additionner.', 'With equal groups, you multiply instead of adding.'],
  ['ARI-SOP-A03a', 'Partager et grouper', 'Share and group', 'soustraction_au_lieu_division', 'Soustrait au lieu de partager en parts égales', 'Subtracts instead of sharing equally', 'Partager, c’est chercher la part de chacun, pas ce qui reste.', 'Sharing means finding each one’s part, not what is left.'],
  ['ARI-OPE-A07a', 'Division avec reste', 'Division with remainder', 'reste_ignore', 'Ignore le reste dans une division', 'Ignores the remainder in a division', 'Ce qui ne remplit pas un groupe, c’est le reste. Il compte aussi.', 'What does not fill a group is the remainder. It counts too.'],
  ['ARI-SEN-A01c', 'Grands nombres', 'Big numbers', 'retenue_grands_nombres', 'Oublie la retenue avec les grands nombres', 'Forgets the carry with big numbers', 'Dix centaines font un millier. Cette retenue compte aussi.', 'Ten hundreds make a thousand. That carry counts too.'],
];

// Problem statements in plain words (no symbols). {do} = "de graines" / "d’œufs". The question ends each statement.
const MATH = {
  'ARI-OPE-A02a': [['{h} a {a} {o}. {h} en trouve {b} de plus. Combien {do} y a-t-il en tout ?', '{h} has {a} {o}. {h} finds {b} more. How many {o} are there in all?'], ['La première boîte a {a} {o}. La seconde en a {b}. Combien {do} en tout ?', 'The first box has {a} {o}. The second box has {b}. How many {o} in all?']],
  'ARI-OPE-A03a': [['{h} avait {a} {o}. {h} en donne {b}. Combien lui en reste-t-il ?', '{h} had {a} {o}. {h} gives away {b}. How many are left?'], ['Il y a {a} {o} dans le sac. On en enlève {b}. Combien en reste-t-il ?', 'There are {a} {o} in the bag. {b} are taken out. How many are left?']],
  'ARI-OPE-A05': [['{h} a {a} {o}. {h} veut en avoir {c}. Combien lui en manque-t-il ?', '{h} has {a} {o}. {h} wants to have {c}. How many more are needed?'], ['Il faut {c} {o} en tout. Il y en a déjà {a}. Combien en manque-t-il ?', '{c} {o} are needed in all. There are already {a}. How many are missing?']],
  'ARI-OPE-A06a': [['Il y a {b} rangées de {a} {o}. Combien {do} en tout ?', 'There are {b} rows of {a} {o}. How many {o} in all?'], ['{h} a {b} paniers. Il y a {a} {o} dans chaque panier. Combien {do} en tout ?', '{h} has {b} baskets. Each basket holds {a} {o}. How many {o} in all?']],
  'ARI-SOP-A03a': [['On partage {N} {o} entre {k} boîtes. Combien {do} dans chaque boîte ?', 'We share {N} {o} between {k} boxes. How many in each box?'], ['{h} a {N} {o}. {h} les range en {k} tas égaux. Combien {do} dans chaque tas ?', '{h} has {N} {o}. {h} makes {k} equal piles. How many {o} in each pile?']],
  'ARI-OPE-A07a': [['{h} a {N} {o}. {h} remplit des sacs de {k}. Combien de sacs pleins ? Il en reste combien ?', '{h} has {N} {o}. {h} fills bags of {k}. How many full bags? How many are left over?'], ['On range {N} {o} par groupes de {k}. Combien de groupes pleins ? Il en reste combien ?', '{N} {o} go into groups of {k}. How many full groups? How many are left over?']],
  'ARI-SEN-A01c': [['{h} a ramassé {a} {o}. {h} en ramasse {b} de plus. Combien {do} en tout ?', '{h} collected {a} {o}. {h} collects {b} more. How many {o} in all?'], ['Le compteur montre {a} {o}. On en ajoute {b}. Combien {do} maintenant ?', 'The counter shows {a} {o}. {b} more come in. How many {o} now?']],
};

// Deterministic helpers
const h = (...n) => {
  let x = 2166136261;
  for (const v of n) { x = Math.imul(x ^ (v | 0), 16777619); x ^= x >>> 13; }
  x = Math.imul(x ^ (x >>> 15), 2246822507);
  return (x ^ (x >>> 13)) >>> 0;
};
const rng = (s) => () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const uuid = (seed, salt) => {
  const p = [0, 1, 2, 3].map((i) => h(seed, salt, i).toString(16).padStart(8, '0')).join('');
  return `${p.slice(0, 8)}-${p.slice(8, 12)}-4${p.slice(13, 16)}-8${p.slice(17, 20)}-${p.slice(20, 32)}`;
};
const shuffle = (arr, r) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const key = (v) => (Array.isArray(v) ? v.map(Number).join(',') : String(Number(v)));

function numChoices(r, correct, typical, steps) {
  const out = [correct, typical];
  for (const s of shuffle(steps, r)) {
    const v = correct + s;
    if (v >= 0 && !out.includes(v)) out.push(v);
    if (out.length === 4) break;
  }
  return shuffle(out, r);
}

/** Problem for (skill, seed, beat index): { m: [fr, en], v: slots, correct, typical, choices } */
export function problemFor(skillId, seed, i) {
  const r = rng(h(seed, i, 7));
  const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const small = [1, -1, 2, -2, 10, -10, 5, -5, 3, -3];
  switch (skillId) {
    case 'ARI-OPE-A02a': {
      const ua = int(5, 9), ub = int(Math.max(10 - ua, 1), 9);
      const a = 10 * int(1 + i, 4 + 2 * i) + ua, b = 10 * int(1, 3 + i) + ub;
      const c = a + b, t = c - 10;
      return { m: [`${a} + ${b} = ?`, `${a} + ${b} = ?`], v: { a, b }, correct: c, typical: t, choices: numChoices(r, c, t, small) };
    }
    case 'ARI-OPE-A03a': {
      const ta = int(4 + i, 9), tb = int(1, ta - 2), ua = int(0, 7), ub = int(ua + 1, 9);
      const a = 10 * ta + ua, b = 10 * tb + ub, c = a - b, t = 10 * (ta - tb) + (ub - ua);
      return { m: [`${a} − ${b} = ?`, `${a} − ${b} = ?`], v: { a, b }, correct: c, typical: t, choices: numChoices(r, c, t, small) };
    }
    case 'ARI-OPE-A05': {
      const a = int(6, 40 + 10 * i), c = a + int(7, 30 + 10 * i), x = c - a, t = c + a;
      return { m: [`${a} + ? = ${c}`, `${a} + ? = ${c}`], v: { a, c }, correct: x, typical: t, choices: numChoices(r, x, t, small) };
    }
    case 'ARI-OPE-A06a': {
      const a = int(3, 6 + i), b = int(3, 9), c = a * b, t = a + b;
      return { m: [`${a} × ${b} = ?`, `${a} × ${b} = ?`], v: { a, b }, correct: c, typical: t, choices: numChoices(r, c, t, [a, -a, b, -b, 1, -1, 2, -2]) };
    }
    case 'ARI-SOP-A03a': {
      const k = int(2, 5 + i), q = int(3, 9), N = k * q, t = N - k;
      return { m: [`${N} ÷ ${k} = ?`, `${N} ÷ ${k} = ?`], v: { N, k }, correct: q, typical: t, choices: numChoices(r, q, t, [1, -1, 2, -2, 3, -3, k, 4]) };
    }
    case 'ARI-OPE-A07a': {
      const k = int(3, 7 + i), q = int(3, 10 + 2 * i), rem = int(1, k - 1), N = k * q + rem;
      const correct = [q, rem], typical = [q, 0];
      const pool = [[q + 1, rem], [q - 1, rem], [q, rem + 1], [q, rem - 1], [q + 1, rem + 1], [q - 1, rem + 1], [q + 2, rem], [rem, q]];
      const out = [correct, typical];
      for (const p of shuffle(pool, r)) {
        if (p[0] >= 0 && p[1] >= 0 && !out.some((o) => key(o) === key(p))) out.push(p);
        if (out.length === 4) break;
      }
      return { m: [`${N} ÷ ${k} = ? (avec reste)`, `${N} ÷ ${k} = ? (with remainder)`], v: { N, k }, correct, typical, choices: shuffle(out, r) };
    }
    default: {
      const ra = int(500, 999), rb = int(1000 - ra, 999);
      const a = 1000 * int(1, 4 + i) + ra, b = 1000 * int(1, 3 + i) + rb, c = a + b, t = c - 1000;
      return { m: [`${a} + ${b} = ?`, `${a} + ${b} = ?`], v: { a, b }, correct: c, typical: t, choices: numChoices(r, c, t, [1, -1, 10, -10, 100, -100, 2, 1000]) };
    }
  }
}

const skillOf = (id) => SKILLS.find((s) => s[0] === id) ?? SKILLS[0];
const heroOf = (s) => KIT[s.w].h[h(s.seed, 1) % KIT[s.w].h.length];

function fill(text, s, en, extra = {}) {
  const kit = KIT[s.w], hero = heroOf(s), L = en ? 1 : 0;
  const o = kit.o[L], slots = { h: hero[0], r: hero[1 + L], p: kit.p[L], o, do: (/^[aeiouhœéèêàâîôû]/i.test(o) ? 'd’' : 'de ') + o, ...extra };
  return text.replace(/\{(\w+)\}/g, (_, k) => slots[k] ?? '').replace(/\bde ([AEIOUÉ])/g, en ? 'de $1' : 'd’$1');
}
const pick = (arr, s, i, salt) => arr[h(s.seed, i, salt) % arr.length];

export function sceneText(s, i, en) {
  const kit = KIT[s.w], p = problemFor(s.k, s.seed, i), L = en ? 1 : 0;
  const parts = [pick(kit.op, s, i, 11), pick(MATH[s.k], s, i, 12)].map((t) => t[L]);
  return parts.map((t) => fill(t, s, en, p.v)).join(' ');
}

export function denouementText(s, i, outcome, en) {
  const kit = KIT[s.w], L = en ? 1 : 0, sk = skillOf(s.k);
  const line = (bank, salt) => fill(pick(bank, s, i, salt)[L], s, en);
  if (outcome === 'correct') return line(kit.ok, 21);
  if (outcome === 'erreur_typique') return `${line(kit.dt, 22)} ${sk[6 + L]}`;
  return line(kit.su, 23);
}

const titleOf = (s, en) => KIT[s.w].t[s.ti ?? 0][en ? 1 : 0];

// ───────────── Wire shapes ─────────────
function beatOf(s, i, en) {
  const p = problemFor(s.k, s.seed, i);
  return { id: uuid(s.seed, 10 + i), session_id: s.id, index: i, skill_id: s.k, question: { math_text: p.m[en ? 1 : 0], choices: p.choices }, scene: { status: 'pending', text: null, illustration_url: null }, created_at: NOW };
}
// Share of right answers (first-try 'c' codes in s.a) against the card threshold; derived, so the cookie state stays compact.
const scoreOf = (s, thr) => {
  const total = s.a.length, correct = [...s.a].filter((x) => x === 'c').length, pct = total ? Math.round((1000 * correct) / total) / 10 : 0;
  return { correct, total, pct, threshold_pct: thr, card_awarded: total > 0 && pct >= thr };
};
const thresholdOf = (req) => {
  const v = String(req.headers['x-card-threshold-pct'] ?? '').trim();
  return /^\d+$/.test(v) && Number(v) <= 100 ? Number(v) : 70;
};
const sessionOut = (s, en, withBeat = true, score) => ({
  id: s.id, child_id: s.c, world: s.w, kind: s.kd ?? 'chapter', status: s.st, chapter_length: s.len, beats_answered: s.a.length,
  current_beat: withBeat && s.n > s.a.length ? beatOf(s, s.n - 1, en) : null,
  story_title: titleOf(s, en), started_at: NOW, ended_at: s.st === 'completed' ? NOW : null,
  ...(score ? { score } : {}),
});
const beatIndex = (s, beatId) => [0, 1, 2].find((i) => uuid(s.seed, 10 + i) === beatId);

function sse(phase, text) {
  const words = text.split(' ');
  const chunks = [];
  for (let i = 0; i < words.length; i += 4) chunks.push(words.slice(i, i + 4).join(' ') + (i + 4 < words.length ? ' ' : ''));
  const per = Math.round(1200 / chunks.length);
  return {
    status: 200, headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }, streamed: true,
    chunks: [...chunks.map((c) => `event: ${phase}\ndata: ${JSON.stringify({ delta: c })}\n\n`), 'event: done\ndata: {}\n\n'],
    delays: [...chunks.map((_, i) => (i === 0 ? 0 : per)), 0],
  };
}

/** Handles chapter routes. X = { json, empty, problem, find, body, en }. Returns { plan, d } or null. */
export function sessionRoutes(req, d, X) {
  const { method, path } = req;
  const { json, problem, find, body, en } = X;
  const s = d.sess;
  const notFound = () => ({ plan: problem(404, 'not_found', 'Session not found', 'No such session.'), d });
  let m;

  if ((m = /^\/v1\/children\/([^/]+)\/sessions$/.exec(path))) {
    const c = find(m[1]);
    if (!c) return { plan: problem(404, 'not_found', 'Child not found', 'No such profile.'), d };
    if (method === 'GET') return { plan: json(200, { items: s && s.c === c.id ? [sessionOut(s, en)] : [], next_cursor: null }), d };
    if (method !== 'POST') return null;
    if (!c.c) return { plan: problem(403, 'consent_missing', 'Consent needed', 'A parent must give consent before this child can play.'), d };
    const b = body();
    if (!KIT[b.world]) return { plan: problem(422, 'validation_failed', 'Invalid world', 'Unknown world.'), d };
    const seed = (d.seed ?? 0) + 1;
    const k = skillOf(b.skill_id)[0];
    const ns = { id: uuid(seed, 0), c: c.id, w: b.world, k, seed, n: 0, a: '', len: LEN, st: 'active', ti: h(seed, 99) % 3 };
    if (b.kind && b.kind !== 'chapter') ns.kd = b.kind;
    return { plan: json(201, sessionOut(ns, en)), d: { ...d, seed, sess: ns } };
  }

  if (!(m = /^\/v1\/sessions\/([^/]+)(?:\/(.*))?$/.exec(path))) return null;
  if (!s || s.id !== m[1]) return notFound();
  const rest = m[2] ?? '';
  const save = (ns, plan) => ({ plan, d: { ...d, sess: ns } });

  if (rest === '' && method === 'GET') return { plan: json(200, sessionOut(s, en)), d };
  if (rest === 'summary' && method === 'GET') {
    const L = en ? 1 : 0, sk = skillOf(s.k), name = find(s.c)?.n ?? '';
    const good = [...s.a].filter((x) => x === 'c').length;
    const recap = en
      ? `${name} and ${heroOf(s)[0]} lived “${titleOf(s, en)}” ${KIT[s.w].p[1]}. ${good} of ${s.a.length} right on the first try.`
      : `${name} et ${heroOf(s)[0]} ont vécu « ${titleOf(s, en)} » ${KIT[s.w].p[0]}. ${good} sur ${s.a.length} du premier coup.`;
    const stuck = s.a.includes('t') ? [{ code: sk[3], description: sk[4 + L], skill_ids: [sk[0]] }] : [];
    return { plan: json(200, { session: sessionOut(s, en, true, scoreOf(s, thresholdOf(req))), duration_seconds: 180 * Math.max(1, s.a.length), story_recap: recap, skills: [{ skill_id: sk[0], label: sk[1 + L], reason: 'nouvelle', attempts: s.a.length, correct: good }], stuck_points: stuck }), d };
  }
  if (method === 'POST' && ['pause', 'resume', 'finish'].includes(rest)) {
    const ns = { ...s, st: rest === 'pause' ? 'paused' : rest === 'resume' ? (s.st === 'completed' ? 'completed' : 'active') : 'completed' };
    return save(ns, json(200, sessionOut(ns, en)));
  }

  if (rest === 'beats' && method === 'POST') {
    if (s.st === 'completed') return { plan: problem(409, 'session_completed', 'Chapter finished', 'This chapter is already complete.'), d };
    if (s.n > s.a.length) return { plan: json(200, beatOf(s, s.n - 1, en)), d };
    const ns = { ...s, n: s.n + 1 };
    return save(ns, json(201, beatOf(ns, s.n, en)));
  }

  if ((m = /^beats\/([^/]+)\/(answer|narration)$/.exec(rest))) {
    const i = beatIndex(s, m[1]);
    if (i === undefined || i >= s.n) return { plan: problem(404, 'not_found', 'Beat not found', 'No such question.'), d };
    if (m[2] === 'narration' && method === 'GET') {
      const phase = req.query.phase?.[0] === 'denouement' ? 'denouement' : 'scene';
      if (phase === 'scene') return { plan: sse(phase, sceneText(s, i, en)), d };
      const code = s.a[i];
      if (!code) return { plan: problem(409, 'beat_not_answered', 'Not answered yet', 'Answer the question first.'), d };
      return { plan: sse(phase, denouementText(s, i, { c: 'correct', t: 'erreur_typique', r: 'erreur_aleatoire' }[code], en)), d };
    }
    if (m[2] === 'answer' && method === 'POST') {
      if (i < s.a.length) return { plan: problem(409, 'beat_answered', 'Already answered', 'This question was already answered.'), d };
      const p = problemFor(s.k, s.seed, i), given = body().answer;
      const code = key(given) === key(p.correct) ? 'c' : key(given) === key(p.typical) ? 't' : 'r';
      const outcome = { c: 'correct', t: 'erreur_typique', r: 'erreur_aleatoire' }[code];
      const ns = { ...s, a: s.a + code };
      const done = ns.a.length >= ns.len;
      if (done) ns.st = 'completed';
      const score = scoreOf(ns, thresholdOf(req));
      const rewards = done
        ? [{ type: 'chapter_complete' }, ...(score.card_awarded ? [{ type: 'card_earned', card: { id: uuid(s.seed, 900), world: s.w, title: titleOf(s, en), image_url: '', session_id: s.id, earned_at: NOW } }] : []),
          ...(ns.a === 'ccc' ? [{ type: 'skill_mastered', skill_id: s.k }] : [])]
        : [];
      return save(ns, json(200, { outcome, correct_answer: p.correct, denouement: { status: 'pending', text: null, illustration_url: null }, session: sessionOut(ns, en, false, score), rewards }));
    }
  }
  return null;
}
