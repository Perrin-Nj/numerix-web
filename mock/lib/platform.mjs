// Platform data (parents, subscriptions, kids' stats, notifications, audit, config) shared by the kid app
// and the admin app. It lives in a PlatformStore, NOT in the x-mock-state cookie.
// Stores: MemoryStore (default, seeded, per server instance) or UpstashStore (REST, when UPSTASH_REDIS_REST_URL
// and UPSTASH_REDIS_REST_TOKEN are set; values are JSON under nx:platform:*).
import { WORLD_IDS, ZOE, MAX } from './domain.mjs';
import { SKILLS } from './session.mjs';

const PFX = 'nx:platform:';
export const DAY = 864e5;
export const DEMO_EMAIL = 'parent@example.com';

// ───────────── Stores (get/set/list; every value is JSON) ─────────────
class MemoryStore {
  mode = 'memory';
  m = new Map();
  async get(k) { return this.m.has(k) ? structuredClone(this.m.get(k)) : null; }
  async set(k, v) { this.m.set(k, structuredClone(v)); }
  async list(k) { return (await this.get(k)) ?? []; }
}
class UpstashStore {
  mode = 'upstash';
  constructor(url, token) { this.url = url.replace(/\/$/, ''); this.token = token; }
  async cmd(args) {
    const res = await fetch(this.url, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
    const j = await res.json();
    if (!res.ok || j.error) throw new Error(`upstash: ${j.error ?? res.status}`);
    return j.result;
  }
  async get(k) { const v = await this.cmd(['GET', PFX + k]); return v == null ? null : JSON.parse(v); }
  async set(k, v) { await this.cmd(['SET', PFX + k, JSON.stringify(v)]); }
  async list(k) { return (await this.get(k)) ?? []; }
}

const memory = new MemoryStore();
let seededMemory = false;
let seededUpstash = false;

/** shortcut: read-modify-write of whole collections, last writer wins; move to per-key hashes if admins ever edit concurrently. */
export async function getStore() {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const s = url && token ? new UpstashStore(url, token) : memory;
  const done = s.mode === 'memory' ? seededMemory : seededUpstash;
  if (!done) {
    if (!(await s.get('seeded'))) {
      const data = buildSeed(Date.now());
      for (const [k, v] of Object.entries(data)) await s.set(k, v);
      await s.set('seeded', 1);
    }
    if (s.mode === 'memory') seededMemory = true; else seededUpstash = true;
  }
  return s;
}
export const storeMode = () => (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? 'upstash' : 'memory');

// ───────────── Defaults ─────────────
export const DEFAULT_CONFIG = {
  card_threshold_pct: 70, unpaid_policy: 'block', trial_days: 14, daily_time_limit_minutes_default: 60,
  reminder_hour_local: 17, expiring_warning_days: 7, default_locale: 'fr-CA',
  features: { feed: true, challenges: true, push: false, payments: true },
};
export const DEFAULT_PLANS = {
  currency: 'CAD',
  plans: [
    { id: 'free', price_cad_cents: 0, period: 'none', name: { fr: 'Gratuit', en: 'Free' },
      features: { fr: ['Un profil enfant', 'Un chapitre par jour', 'Rapports de base'], en: ['One child profile', 'One chapter a day', 'Basic reports'] } },
    { id: 'family_monthly', price_cad_cents: 899, period: 'month', name: { fr: 'Famille mensuel', en: 'Family monthly' },
      features: { fr: ['Jusqu’à 8 profils enfants', 'Chapitres illimités', 'Rapports détaillés pour les parents', 'Annulable à tout moment'], en: ['Up to 8 child profiles', 'Unlimited chapters', 'Detailed parent reports', 'Cancel any time'] } },
    { id: 'family_yearly', price_cad_cents: 8990, period: 'year', name: { fr: 'Famille annuel', en: 'Family yearly' },
      features: { fr: ['Tout le forfait mensuel', 'Deux mois offerts', 'Annulable à tout moment'], en: ['Everything in monthly', 'Two months free', 'Cancel any time'] } },
  ],
  methods: [
    { id: 'card', label: { fr: 'Carte de crédit', en: 'Credit card' } },
    { id: 'interac', label: { fr: 'Interac', en: 'Interac' } },
    { id: 'paypal', label: { fr: 'PayPal', en: 'PayPal' } },
    { id: 'apple_pay', label: { fr: 'Apple Pay', en: 'Apple Pay' } },
    { id: 'google_pay', label: { fr: 'Google Pay', en: 'Google Pay' } },
  ],
};
export const PLAN_IDS = ['free', 'family_monthly', 'family_yearly'];
export const METHOD_IDS = DEFAULT_PLANS.methods.map((m) => m.id);
export const KINDS = ['play_reminder', 'time_limit', 'subscription_expiring', 'payment_due', 'announcement'];

// ───────────── Seed (deterministic structure; dates are relative to the moment of seeding) ─────────────
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const iso = (ms) => new Date(ms).toISOString();
const uid = (p, n) => `${p}-0000-4000-8000-${String(n).padStart(12, '0')}`;

const FIRST = ['Marie', 'Jean-Philippe', 'Sophie', 'Mathieu', 'Isabelle', 'Étienne', 'Catherine', 'Alexandre', 'Julie', 'Simon', 'Véronique', 'Nicolas', 'Geneviève', 'Maxime', 'Annie', 'Francis', 'Caroline', 'Olivier', 'Mélanie', 'Patrick', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Daniel', 'Rachel', 'Kevin', 'Amanda', 'Brian', 'Priya', 'Wei', 'Fatima', 'Carlos', 'Aisha'];
const LAST = ['Tremblay', 'Gagnon', 'Roy', 'Côté', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Gagné', 'Smith', 'Brown', 'Wilson', 'Patel', 'Chen', 'Nguyen', 'Martin', 'Anderson', 'Singh', 'Haddad'];
const KIDS = ['Léa', 'Noah', 'Emma', 'Liam', 'Olivia', 'Jacob', 'Charlotte', 'Félix', 'Alice', 'Thomas', 'Mia', 'Nathan', 'Ève', 'Raphaël', 'Chloé', 'Leo', 'Lily', 'Jack', 'Sofia', 'Théo', 'Anna', 'Gabriel', 'Clara', 'Mathis'];
const AVATARS = ['fox', 'owl', 'bear', 'cat', 'panda', 'rabbit', 'lion', 'turtle'];
const LOCALES = ['fr-CA', 'fr-CA', 'fr-CA', 'en-CA', 'en-CA', 'fr-FR', 'en-US'];
const REASONS = ['Chargeback signalé par la banque', 'Compte en double', 'Demande du parent', 'Usage abusif des courriels'];

const NOTE_COPY = {
  play_reminder: [['C’est l’heure d’une petite aventure', 'Un chapitre de 10 minutes attend votre enfant.'], ['Time for a little adventure', 'A 10 minute chapter is waiting for your child.']],
  time_limit: [['Limite de temps atteinte', 'Votre enfant a joué assez pour aujourd’hui. À demain !'], ['Time limit reached', 'Your child has played enough for today. See you tomorrow!']],
  subscription_expiring: [['Votre abonnement se termine bientôt', 'Renouvelez pour que la famille puisse continuer à jouer.'], ['Your subscription ends soon', 'Renew so the family can keep playing.']],
  payment_due: [['Paiement requis', 'Réglez votre abonnement pour que votre enfant puisse rejouer.'], ['Payment needed', 'Settle your subscription so your child can play again.']],
};
export const noteFor = (kind, locale) => NOTE_COPY[kind][String(locale).startsWith('en') ? 1 : 0];

function buildSeed(now) {
  const R = rng(4242);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const statuses = [];
  for (const [s, n] of [['trial', 8], ['active', 18], ['unpaid', 5], ['expired', 4], ['canceled', 5]]) for (let i = 0; i < n; i++) statuses.push(s);
  for (let i = statuses.length - 1; i > 1; i--) { const j = 1 + Math.floor(R() * i); [statuses[i], statuses[j]] = [statuses[j], statuses[i]]; }
  statuses[0] = 'trial';
  const blocked = new Set([5, 11, 23, 31]);

  const todayStart = Math.floor(now / DAY) * DAY;
  const dstr = (ms) => new Date(ms).toISOString().slice(0, 10);
  const DAYS = 90;
  const subhist = {};
  const parents = [];
  for (let i = 0; i < 40; i++) {
    const demo = i === 0;
    const first = demo ? 'Camille' : pick(FIRST), last = demo ? 'Demo' : pick(LAST);
    const st = statuses[i];
    // unpaid and expired families are monthly plans so the whole history stays inside about 12 months
    const paid = st === 'unpaid' || st === 'expired' ? 'family_monthly' : pick(['family_monthly', 'family_monthly', 'family_yearly']);
    const sub = { status: st, plan: 'free' };
    const segs = [];
    let created;
    if (st === 'trial') {
      sub.trial_ends_at = iso(demo ? now + 14 * DAY : now + (1 + Math.floor(R() * 13)) * DAY);
      created = demo ? now - 30 * DAY : Date.parse(sub.trial_ends_at) - 14 * DAY;
    } else {
      sub.plan = paid; sub.method = pick(METHOD_IDS);
      const span = paid === 'family_yearly' ? 300 : 29;
      let end;
      if (st === 'active') end = now + (1 + Math.floor(R() * span)) * DAY;
      if (st === 'unpaid') end = now - (1 + Math.floor(R() * 20)) * DAY;
      if (st === 'expired') end = now - (10 + Math.floor(R() * 200)) * DAY;
      if (st === 'canceled') end = now + (R() < 0.5 ? 1 : -1) * (2 + Math.floor(R() * 25)) * DAY;
      sub.renews_at = iso(end);
      if (st === 'unpaid' && R() < 0.5) sub.marked_by_admin = true;
      const ref = Math.min(end, now);
      const start = paid === 'family_yearly' ? end - 365 * DAY : ref - (30 + Math.floor(R() * (st === 'active' ? 9 : 4)) * 30) * DAY;
      created = start - (14 + Math.floor(R() * 12)) * DAY;
      const seg = { plan: paid, started_at: iso(start), ended_at: st === 'active' ? null : iso(ref), canceled_at: null };
      if (st === 'canceled') seg.canceled_at = iso(Math.max(start + DAY, ref - (1 + Math.floor(R() * 14)) * DAY));
      segs.push(seg);
    }
    const p = {
      id: demo ? '99999999-9999-4999-8999-999999999999' : uid('aaaaaaaa', i),
      email: demo ? DEMO_EMAIL : `${slug(first)}.${slug(last)}${i}@example.com`,
      name: `${first} ${last}`, created_at: iso(created), locale: demo ? 'fr-CA' : pick(LOCALES), status: 'active', subscription: sub,
    };
    if (blocked.has(i)) { p.status = 'blocked'; p.blocked_reason = REASONS[i % REASONS.length]; p.blocked_at = iso(Math.max(created + DAY, now - (3 + Math.floor(R() * 40)) * DAY)); }
    parents.push(p);
    subhist[p.id] = segs;
  }

  const children = [];
  const activity = {};
  const kid = (parent, id, name, grade, avatar, idx) => {
    const pc = Date.parse(parent.created_at);
    // kids join after their parent signed up
    const created = pc + Math.floor(Math.pow(R(), 1.4) * Math.max(0, (now - pc) / DAY - 1) * 0.7) * DAY;
    const demoKid = id === ZOE || id === MAX;
    const eng = demoKid ? 0.85 : 0.25 + R() * 0.7;
    const lapsed = !demoKid && R() < 0.2;
    const lapseAt = todayStart - (5 + Math.floor(R() * 70)) * DAY;
    const favs = [Math.floor(R() * WORLD_IDS.length), Math.floor(R() * WORLD_IDS.length)];
    const sb = parent.subscription;
    const cut = parent.status === 'blocked' ? Date.parse(parent.blocked_at)
      : sb.status === 'unpaid' || sb.status === 'expired' || sb.status === 'canceled' ? Date.parse(sb.renews_at) : Infinity;
    const act = { from: dstr(todayStart - (DAYS - 1) * DAY), m: [], s: [], w: [] };
    let lastDay = -1, sum = 0;
    for (let k = 0; k < DAYS; k++) {
      const day = todayStart - (DAYS - 1 - k) * DAY;
      let m = 0, w = -1;
      const wd = new Date(day).getUTCDay(), weekend = wd === 0 || wd === 6;
      const live = day + DAY > created && day <= cut && !(lapsed && day > lapseAt);
      const pPlay = Math.min(0.95, eng * (weekend ? 1.25 : 1) * (sb.status === 'trial' ? 0.6 : 1));
      if (live && R() < pPlay) {
        m = Math.round((weekend ? 15 + R() * 40 : 8 + R() * 22) * (sb.status === 'trial' ? 0.8 : 1));
        w = R() < 0.7 ? favs[R() < 0.6 ? 0 : 1] : Math.floor(R() * WORLD_IDS.length);
      }
      const s = m ? Math.max(1, Math.round(m / 12)) : 0;
      act.m.push(m); act.s.push(s); act.w.push(w);
      if (m) lastDay = k;
      sum += s;
    }
    activity[id] = act;
    const today = act.m[DAYS - 1];
    const seen = today ? Math.max(todayStart, now - Math.floor(R() * 10) * 36e5) : lastDay >= 0 ? todayStart - (DAYS - 1 - lastDay) * DAY + 17 * 36e5 : created;
    const sessions = sum + (created < todayStart - DAYS * DAY ? Math.floor(R() * 80) : 0);
    children.push({
      id, parent_id: parent.id, display_name: name, grade, avatar_id: avatar, created_at: iso(created),
      last_seen_at: iso(Math.min(seen, now)), minutes_today: today, sessions_total: sessions,
      cards_total: Math.floor(sessions * 0.7 * R()), skills_mastered: Math.min(SKILLS.length * 3, Math.floor(sessions / 6 + R() * 4)),
      settings: {
        daily_goal_chapters: 1 + Math.floor(R() * 3), daily_time_limit_minutes: pick([null, null, 20, 30, 45, 60]),
        enabled_worlds: WORLD_IDS, read_aloud: R() < 0.8, sound: R() < 0.85, kid_can_change_language: idx === 1 ? false : R() < 0.85,
      },
    });
  };
  kid(parents[0], ZOE, 'Zoé', 3, 'fox', 0);
  kid(parents[0], MAX, 'Max', 1, 'bear', 0);
  for (let n = 0, i = 1; n < 68; n++, i = 1 + (i % 39)) kid(parents[i], uid('bbbbbbbb', n), pick(KIDS), 1 + Math.floor(R() * 6), pick(AVATARS), n);

  const notifications = [];
  let bi = 0;
  parents.forEach((p, i) => {
    if (i % 3 !== 0 && p.subscription.status !== 'unpaid') return;
    const kind = p.subscription.status === 'unpaid' ? 'payment_due' : pick(['play_reminder', 'time_limit', 'play_reminder']);
    const [title, body] = noteFor(kind, p.locale);
    notifications.push({ id: `nt-seed-${bi++}`, kind, title, body, created_at: iso(now - Math.floor(R() * 12) * DAY), read: R() < 0.4, audience: 'parent', parent_id: p.id });
  });

  const audit = [];
  const acts = [['parent.block', 'parent'], ['parent.unblock', 'parent'], ['child.read', 'child'], ['config.update', 'config'], ['parent.update', 'parent'], ['notification.broadcast', 'notification']];
  for (let i = 0; i < 12; i++) {
    const [action, target_type] = acts[i % acts.length];
    audit.push({ id: `au-seed-${i}`, at: iso(now - (i + 1) * 5 * 36e5), actor: 'admin', action, target_type, target_id: target_type === 'child' ? children[i].id : target_type === 'parent' ? parents[i].id : 'platform', detail: 'seed' });
  }
  return { parents, children, notifications, audit, config: DEFAULT_CONFIG, plans: DEFAULT_PLANS, activity, subhist };
}

// ───────────── Subscription logic ─────────────
/** Effective view: dates can end a trial or a paid period; can_play is what the gate uses. */
export function subView(sub, now = Date.now()) {
  const t = (x) => (x ? Date.parse(x) : 0);
  let status = sub.status, can = false, end = null;
  if (status === 'trial') { end = sub.trial_ends_at; can = t(end) > now; if (!can) status = 'expired'; }
  else if (status === 'active') { end = sub.renews_at; can = !end || t(end) > now; if (!can) status = 'expired'; }
  else if (status === 'canceled') { end = sub.renews_at; can = t(end) > now; }
  return { ...sub, status, can_play: can, days_left: end ? Math.ceil((t(end) - now) / DAY) : null };
}
export const parentView = (p, children) => ({ ...p, children_count: children.filter((c) => c.parent_id === p.id).length, subscription: subView(p.subscription) });

export function playState(p, cfg) {
  if (p.status === 'blocked') return 'account_blocked';
  return subView(p.subscription).can_play || cfg.unpaid_policy === 'allow' ? null : 'subscription_inactive';
}

// ───────────── Parent identity ─────────────
export const emailOf = (r) => String(r.headers['x-mock-parent-email'] || DEMO_EMAIL).trim().toLowerCase();

export async function ensureParent(s, email, extra = {}) {
  const parents = await s.list('parents');
  let p = parents.find((x) => x.email === email);
  if (p) return p;
  const cfg = (await s.get('config')) ?? DEFAULT_CONFIG;
  const now = Date.now();
  let h = 0;
  for (const ch of email) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  p = {
    id: `cccccccc-0000-4000-8000-${h.toString(16).padStart(12, '0')}`, email, name: extra.name || email.split('@')[0],
    created_at: iso(now), locale: extra.locale || cfg.default_locale, status: 'active',
    subscription: { status: 'trial', plan: 'free', trial_ends_at: iso(now + cfg.trial_days * DAY) },
  };
  await s.set('parents', [...parents, p]);
  return p;
}

// ───────────── HTTP helpers ─────────────
export const json = (status, body, headers = {}) => ({ status, headers: { 'content-type': 'application/json', ...headers }, chunks: [JSON.stringify(body)], delays: [0] });
export const empty = (status, headers = {}) => ({ status, headers, chunks: [''], delays: [0] });
export const problem = (status, code, title, detail, extra = {}) =>
  ({ status, headers: { 'content-type': 'application/problem+json' }, chunks: [JSON.stringify({ type: `https://numerix.app/problems/${code.replace(/_/g, '-')}`, title, status, code, detail, ...extra })], delays: [0] });

const GATE_COPY = {
  subscription_inactive: { status: 402, fr: ['Petite pause pour l’instant', 'L’abonnement de ta famille est en pause. Demande à un grand de le réactiver et l’aventure repart !'], en: ['A little break for now', 'Your family’s subscription is paused. Ask a grown-up to turn it back on and the adventure starts again!'] },
  account_blocked: { status: 403, fr: ['Compte en pause', 'Le compte de ta famille est en pause. Un grand peut nous écrire pour comprendre pourquoi.'], en: ['Account on pause', 'Your family’s account is on pause. A grown-up can contact us to find out why.'] },
};
const gateProblem = (code, lang) => {
  const c = GATE_COPY[code], l = String(lang).startsWith('en') ? 'en' : 'fr';
  return problem(c.status, code, c[l][0], c[l][1], { i18n: { fr: { title: c.fr[0], detail: c.fr[1] }, en: { title: c.en[0], detail: c.en[1] } } });
};

/** Blocks POST /v1/children/{id}/sessions according to the parent's subscription. Returns a plan or null. */
export async function gateSession(r) {
  if (r.method !== 'POST' || !/^\/v1\/children\/[^/]+\/sessions$/.test(r.path)) return null;
  const s = await getStore();
  const p = await ensureParent(s, emailOf(r));
  const code = playState(p, (await s.get('config')) ?? DEFAULT_CONFIG);
  return code ? gateProblem(code, r.headers['accept-language'] ?? 'fr') : null;
}

/** Called on register and login so the platform has a Parent record keyed by lower-cased email. */
export async function onAuth(r) {
  if (r.method !== 'POST' || !/^\/v1\/auth\/(register|login)$/.test(r.path)) return;
  let b = {};
  try { b = JSON.parse(r.body || '{}'); } catch { /* the mapping answers the bad body */ }
  if (typeof b.email !== 'string' || !b.email.includes('@')) return;
  await ensureParent(await getStore(), b.email.trim().toLowerCase(), { name: b.name || b.display_name, locale: b.locale });
}

/** Keeps kid_can_change_language (and the other settings) of platform-known kids in the store, so the admin toggle reaches the kid app. */
export async function syncSettings(r, plan) {
  const m = /^\/v1\/children\/([^/]+)\/settings$/.exec(r.path);
  if (!m || !['GET', 'PUT'].includes(r.method) || plan.status !== 200) return plan;
  const s = await getStore();
  const kids = await s.list('children');
  const k = kids.find((c) => c.id === m[1]);
  let out;
  try { out = JSON.parse(plan.chunks[0]); } catch { return plan; }
  if (k && r.method === 'PUT') {
    k.settings = { ...k.settings, ...out };
    if (typeof out.kid_can_change_language !== 'boolean') k.settings.kid_can_change_language = k.settings.kid_can_change_language ?? true;
    await s.set('children', kids);
  }
  out.kid_can_change_language = k ? k.settings.kid_can_change_language !== false : out.kid_can_change_language !== false;
  return { ...plan, chunks: [JSON.stringify(out)] };
}

// ───────────── Parent endpoints ─────────────
async function autoNotes(s, p, cfg) {
  const sub = subView(p.subscription);
  const end = sub.status === 'trial' || sub.status === 'active' || sub.status === 'canceled' ? sub.days_left : null;
  const wanted = [];
  if (['unpaid', 'expired'].includes(sub.status)) wanted.push(['payment_due', `${sub.status}:${sub.renews_at ?? sub.trial_ends_at}`]);
  else if (end !== null && end <= cfg.expiring_warning_days && sub.can_play) wanted.push(['subscription_expiring', `${sub.renews_at ?? sub.trial_ends_at}`]);
  if (!wanted.length) return;
  const notes = await s.list('notifications');
  const add = wanted.filter(([kind, key]) => !notes.some((n) => n.parent_id === p.id && n.key === `${kind}:${key}`));
  if (!add.length) return;
  for (const [kind, key] of add) {
    const [title, body] = noteFor(kind, p.locale);
    notes.push({ id: crypto.randomUUID(), kind, title, body, created_at: iso(Date.now()), read: false, audience: 'parent', parent_id: p.id, key: `${kind}:${key}` });
  }
  await s.set('notifications', notes.slice(-1500));
}

const pub = ({ parent_id, key, broadcast_id, ...n }) => n;

export async function parentRoutes(r) {
  const { path, method } = r;
  let m;
  if (!/^\/v1\/(subscription|notifications|platform)/.test(path)) return null;
  const s = await getStore();
  const cfg = (await s.get('config')) ?? DEFAULT_CONFIG;
  const plans = (await s.get('plans')) ?? DEFAULT_PLANS;
  const body = () => { try { return JSON.parse(r.body || '{}'); } catch { return {}; } };

  if (path === '/v1/platform/public' && method === 'GET') {
    return json(200, { unpaid_policy: cfg.unpaid_policy, card_threshold_pct: cfg.card_threshold_pct, trial_days: cfg.trial_days, default_locale: cfg.default_locale, features: cfg.features });
  }
  if (path === '/v1/subscription/plans' && method === 'GET') return json(200, plans);

  const p = await ensureParent(s, emailOf(r));
  const save = async (next) => { const all = await s.list('parents'); await s.set('parents', all.map((x) => (x.id === next.id ? next : x))); };

  if (path === '/v1/subscription' && method === 'GET') return json(200, subView(p.subscription));

  if (path === '/v1/subscription/checkout' && method === 'POST') {
    const b = body();
    const plan = plans.plans.find((x) => x.id === b.plan);
    if (!plan || plan.price_cad_cents <= 0) return problem(422, 'validation_failed', 'Invalid plan', 'Choose a paid plan.');
    if (!plans.methods.some((x) => x.id === b.method)) return problem(422, 'validation_failed', 'Invalid payment method', 'Choose one of the listed payment methods.');
    // BE-24: the real flow redirects to the processor's hosted page; the mock completes instantly
    const next = { ...p, subscription: { status: 'active', plan: plan.id, method: b.method, renews_at: iso(Date.now() + (plan.period === 'year' ? 365 : 30) * DAY) } };
    await save(next);
    return json(200, subView(next.subscription));
  }

  if (path === '/v1/subscription/cancel' && method === 'POST') {
    const sub = subView(p.subscription);
    if (sub.status === 'canceled') return json(200, sub);
    if (!['trial', 'active'].includes(sub.status)) return problem(409, 'not_cancelable', 'Nothing to cancel', 'This subscription is not running.');
    const next = { ...p, subscription: { ...p.subscription, status: 'canceled', renews_at: p.subscription.renews_at ?? p.subscription.trial_ends_at } };
    await save(next);
    return json(200, subView(next.subscription));
  }

  if (path === '/v1/notifications' && method === 'GET') {
    await autoNotes(s, p, cfg);
    const audience = r.query.audience?.[0] ?? 'parent';
    const mine = (await s.list('notifications')).filter((n) => n.parent_id === p.id && n.audience === audience).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return json(200, { items: mine.map(pub), unread_count: mine.filter((n) => !n.read).length });
  }

  if ((m = /^\/v1\/notifications\/([^/]+)\/read$/.exec(path)) && method === 'POST') {
    const notes = await s.list('notifications');
    const n = notes.find((x) => x.id === m[1] && x.parent_id === p.id);
    if (!n) return problem(404, 'not_found', 'Notification not found', 'No such notification.');
    n.read = true;
    await s.set('notifications', notes);
    return empty(204);
  }
  return null;
}
