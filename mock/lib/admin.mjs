// Platform admin API under /admin/v1/*: bearer ADMIN_API_TOKEN, CORS only for ADMIN_ORIGIN, every mutation and every child read is audited.
import { createHash, timingSafeEqual } from 'node:crypto';
import { WORLD_IDS } from './domain.mjs';
import { SKILLS } from './session.mjs';
import { DAY, DEFAULT_CONFIG, DEFAULT_PLANS, KINDS, METHOD_IDS, PLAN_IDS, getStore, json, empty, problem, parentView, subView } from './platform.mjs';

const iso = (ms) => new Date(ms).toISOString();
const sha = (s) => createHash('sha256').update(String(s)).digest();

function adminToken() {
  return process.env.ADMIN_API_TOKEN || (process.env.NODE_ENV !== 'production' ? 'dev-admin-token' : null);
}
function corsFor(origin) {
  const allowed = (process.env.ADMIN_ORIGIN ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const base = { vary: 'Origin' };
  if (!origin || !allowed.includes(origin)) return base;
  return { ...base, 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization,content-type,x-admin-actor', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-max-age': '600' };
}

const paged = (items, r) => {
  const size = Math.min(100, Math.max(1, Number(r.query.page_size?.[0]) || 20));
  const page = Math.max(1, Number(r.query.page?.[0]) || 1);
  return { items: items.slice((page - 1) * size, page * size), page, page_size: size, total: items.length };
};
const qp = (r, k) => r.query[k]?.[0];
const has = (text, q) => !q || String(text).toLowerCase().includes(q.toLowerCase());
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

const SETTING_RULES = {
  daily_goal_chapters: (v) => isInt(v, 1, 5),
  daily_time_limit_minutes: (v) => v === null || isInt(v, 5, 180),
  enabled_worlds: (v) => Array.isArray(v) && v.length > 0 && v.every((w) => WORLD_IDS.includes(w)),
  read_aloud: (v) => typeof v === 'boolean',
  sound: (v) => typeof v === 'boolean',
  kid_can_change_language: (v) => typeof v === 'boolean',
};
const CONFIG_RULES = {
  card_threshold_pct: (v) => typeof v === 'number' && v >= 0 && v <= 100,
  unpaid_policy: (v) => v === 'block' || v === 'allow',
  trial_days: (v) => isInt(v, 0, 365),
  daily_time_limit_minutes_default: (v) => v === null || isInt(v, 5, 180),
  reminder_hour_local: (v) => isInt(v, 0, 23),
  expiring_warning_days: (v) => isInt(v, 0, 60),
  default_locale: (v) => typeof v === 'string' && /^[a-z]{2}-[A-Z]{2}$/.test(v),
  features: (v) => v && typeof v === 'object' && Object.values(v).every((x) => typeof x === 'boolean'),
};

export async function adminHandle(r) {
  const cors = corsFor(r.headers.origin);
  const out = (p) => ({ ...p, headers: { ...p.headers, ...cors }, state: null });
  if (r.method === 'OPTIONS') return out(empty(204));

  const token = adminToken();
  if (!token) return out(problem(503, 'admin_disabled', 'Admin API disabled', 'ADMIN_API_TOKEN is not set.'));
  const given = (r.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!given || !timingSafeEqual(sha(given), sha(token))) return out(problem(401, 'unauthorized', 'Unauthorized', 'A valid admin bearer token is required.'));

  let body = {};
  if (r.method !== 'GET' && r.method !== 'DELETE' && r.body) {
    try { body = JSON.parse(r.body); } catch { return out(problem(400, 'invalid_json', 'Invalid JSON', 'The request body is not valid JSON.')); }
  }
  const bad = (detail) => problem(422, 'validation_failed', 'Invalid request', detail);
  const notFound = (what) => problem(404, 'not_found', `${what} not found`, `No such ${what.toLowerCase()}.`);
  const actor = r.headers['x-admin-actor'] || 'admin';

  try {
    const s = await getStore();
    const audit = async (action, target_type, target_id, detail = '') => {
      const log = await s.list('audit');
      log.push({ id: crypto.randomUUID(), at: iso(Date.now()), actor, action, target_type, target_id, detail: String(detail).slice(0, 300) });
      await s.set('audit', log.slice(-500));
    };
    const { path, method } = r;
    let m;
    const route = (re, ...methods) => (methods.includes(method) && (m = re.exec(path)));

    // ── overview
    if (route(/^\/admin\/v1\/overview$/, 'GET')) {
      const [parents, children, plans] = [await s.list('parents'), await s.list('children'), (await s.get('plans')) ?? DEFAULT_PLANS];
      const by = { trial: 0, active: 0, unpaid: 0, expired: 0, canceled: 0 };
      let mrr = 0;
      for (const p of parents) {
        const sub = subView(p.subscription);
        by[sub.status] += 1;
        if (sub.status === 'active' && p.status !== 'blocked') {
          const pl = plans.plans.find((x) => x.id === sub.plan);
          if (pl) mrr += pl.period === 'year' ? Math.round(pl.price_cad_cents / 12) : pl.price_cad_cents;
        }
      }
      const today = iso(Date.now()).slice(0, 10);
      const series = Array.from({ length: 30 }, (_, i) => ({ date: iso(Date.now() - (29 - i) * DAY).slice(0, 10), count: 0 }));
      for (const p of parents) { const row = series.find((x) => x.date === p.created_at.slice(0, 10)); if (row) row.count += 1; }
      return out(json(200, {
        parents_total: parents.length, by_subscription: by, blocked: parents.filter((p) => p.status === 'blocked').length,
        kids_total: children.length, active_today: children.filter((c) => c.last_seen_at.slice(0, 10) === today).length,
        mrr_cad_cents: mrr, currency: 'CAD', signups_30d: series, signups_30d_total: series.reduce((a, x) => a + x.count, 0),
      }));
    }

    // ── parents
    if (route(/^\/admin\/v1\/parents$/, 'GET')) {
      const children = await s.list('children');
      const status = qp(r, 'status'), subq = qp(r, 'subscription'), q = qp(r, 'q');
      const list = (await s.list('parents')).map((p) => parentView(p, children))
        .filter((p) => (!status || p.status === status) && (!subq || p.subscription.status === subq) && (has(p.name, q) || has(p.email, q)))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return out(json(200, paged(list, r)));
    }
    if (route(/^\/admin\/v1\/parents\/([^/]+)$/, 'GET', 'PATCH', 'DELETE')) {
      const id = m[1];
      const parents = await s.list('parents');
      const p = parents.find((x) => x.id === id);
      if (!p) return out(notFound('Parent'));
      let children = await s.list('children');
      if (method === 'GET') return out(json(200, { ...parentView(p, children), children: children.filter((c) => c.parent_id === id).map((c) => ({ id: c.id, display_name: c.display_name, grade: c.grade, last_seen_at: c.last_seen_at })) }));
      if (method === 'DELETE') {
        await s.set('parents', parents.filter((x) => x.id !== id));
        await s.set('children', children.filter((c) => c.parent_id !== id));
        await s.set('notifications', (await s.list('notifications')).filter((n) => n.parent_id !== id));
        await audit('parent.delete', 'parent', id, p.email);
        return out(empty(204));
      }
      const b = body, sb = b.subscription;
      if (b.name !== undefined && (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 80)) return out(bad('name must be 1 to 80 characters'));
      if (b.locale !== undefined && !/^[a-z]{2}-[A-Z]{2}$/.test(b.locale)) return out(bad('locale must look like fr-CA'));
      if (b.status !== undefined && !['active', 'blocked'].includes(b.status)) return out(bad('status must be active or blocked'));
      if (sb !== undefined) {
        if (!sb || typeof sb !== 'object') return out(bad('subscription must be an object'));
        if (sb.status !== undefined && !['active', 'paid', 'unpaid'].includes(sb.status)) return out(bad('subscription.status must be active (paid) or unpaid'));
        if (sb.plan !== undefined && !PLAN_IDS.includes(sb.plan)) return out(bad('unknown plan'));
        if (sb.extend_days !== undefined && !isInt(sb.extend_days, 1, 3650)) return out(bad('extend_days must be 1 to 3650'));
      }
      const next = { ...p, subscription: { ...p.subscription } };
      const changes = [];
      if (b.name !== undefined) { next.name = b.name.trim(); changes.push('name'); }
      if (b.locale !== undefined) { next.locale = b.locale; changes.push('locale'); }
      if (b.status === 'blocked') { next.status = 'blocked'; next.blocked_reason = String(b.blocked_reason ?? '').slice(0, 200) || 'Blocked by admin'; changes.push('block'); }
      else if (b.status === 'active') { next.status = 'active'; delete next.blocked_reason; changes.push('unblock'); }
      const now = Date.now(), sub = next.subscription;
      if (sb) {
        if (sb.plan) { sub.plan = sb.plan; changes.push(`plan=${sb.plan}`); }
        if (sb.status === 'unpaid') { sub.status = 'unpaid'; sub.marked_by_admin = true; changes.push('unpaid'); }
        if (sb.status === 'active' || sb.status === 'paid') {
          if (sub.plan === 'free') sub.plan = 'family_monthly';
          if (!(sub.status === 'active' && Date.parse(sub.renews_at) > now)) sub.renews_at = iso(now + (sub.plan === 'family_yearly' ? 365 : 30) * DAY);
          sub.status = 'active'; sub.marked_by_admin = true; changes.push('paid');
        }
        if (sb.extend_days) {
          const field = sub.status === 'trial' ? 'trial_ends_at' : 'renews_at';
          sub[field] = iso(Math.max(now, Date.parse(sub[field]) || 0) + sb.extend_days * DAY);
          changes.push(`extend ${sb.extend_days}d`);
        }
      }
      await s.set('parents', parents.map((x) => (x.id === id ? next : x)));
      await audit(b.status === 'blocked' ? 'parent.block' : b.status === 'active' ? 'parent.unblock' : 'parent.update', 'parent', id, `${changes.join(', ')}${next.blocked_reason && b.status === 'blocked' ? `: ${next.blocked_reason}` : ''}`);
      children = await s.list('children');
      return out(json(200, parentView(next, children)));
    }

    // ── children
    if (route(/^\/admin\/v1\/children$/, 'GET')) {
      const parents = await s.list('parents');
      const parent = qp(r, 'parent'), q = qp(r, 'q');
      const list = (await s.list('children')).filter((c) => (!parent || c.parent_id === parent) && has(c.display_name, q))
        .map((c) => ({ ...c, parent_name: parents.find((p) => p.id === c.parent_id)?.name ?? null }))
        .sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at));
      await audit('children.list', 'child', '*', `parent=${parent ?? ''} q=${q ?? ''}`);
      return out(json(200, paged(list, r)));
    }
    if (route(/^\/admin\/v1\/children\/([^/]+)\/activity$/, 'GET')) {
      const c = (await s.list('children')).find((x) => x.id === m[1]);
      if (!c) return out(notFound('Child'));
      await audit('child.activity.read', 'child', c.id);
      let h = 0;
      for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const rnd = () => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return h / 4294967296; };
      const last = Date.parse(c.last_seen_at);
      const sessions = Array.from({ length: Math.min(10, c.sessions_total) }, (_, i) => {
        const sk = SKILLS[Math.floor(rnd() * SKILLS.length)], total = 3, correct = Math.floor(rnd() * 4);
        return { id: `${c.id.slice(0, 8)}-s${i}`, world: WORLD_IDS[Math.floor(rnd() * WORLD_IDS.length)], skill_id: sk[0], skill_name: sk[1], started_at: iso(last - i * 17 * 36e5), status: 'completed', correct, total, card_awarded: correct / total >= 0.7 };
      });
      const cards = sessions.filter((x) => x.card_awarded).slice(0, 6).map((x, i) => ({ id: `${c.id.slice(0, 8)}-c${i}`, world: x.world, name: x.skill_name, earned_at: x.started_at }));
      const skills = SKILLS.slice(0, Math.min(SKILLS.length, c.skills_mastered)).map((sk) => ({ skill_id: sk[0], name: sk[1], mastery_pct: 70 + Math.floor(rnd() * 30) }));
      return out(json(200, { child_id: c.id, sessions, cards, skills }));
    }
    if (route(/^\/admin\/v1\/children\/([^/]+)$/, 'GET', 'PATCH')) {
      const kids = await s.list('children');
      const c = kids.find((x) => x.id === m[1]);
      if (!c) return out(notFound('Child'));
      const parent = (await s.list('parents')).find((p) => p.id === c.parent_id);
      const view = (k) => ({ ...k, parent: parent ? { id: parent.id, name: parent.name, email: parent.email } : null });
      if (method === 'GET') { await audit('child.read', 'child', c.id); return out(json(200, view(c))); }
      const b = body, settings = { ...(b.settings ?? {}) };
      if (b.daily_time_limit_minutes !== undefined) settings.daily_time_limit_minutes = b.daily_time_limit_minutes;
      if (b.kid_can_change_language !== undefined) settings.kid_can_change_language = b.kid_can_change_language;
      for (const [k, v] of Object.entries(settings)) if (!SETTING_RULES[k]?.(v)) return out(bad(`invalid setting ${k}`));
      const name = b.display_name ?? b.name;
      if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 30)) return out(bad('name must be 1 to 30 characters'));
      if (b.grade !== undefined && !isInt(b.grade, 1, 6)) return out(bad('grade must be 1 to 6'));
      if (b.avatar_id !== undefined && typeof b.avatar_id !== 'string') return out(bad('avatar_id must be a string'));
      const next = { ...c, ...(name !== undefined ? { display_name: name.trim() } : {}), ...(b.grade !== undefined ? { grade: b.grade } : {}), ...(b.avatar_id !== undefined ? { avatar_id: b.avatar_id } : {}), settings: { ...c.settings, ...settings } };
      await s.set('children', kids.map((x) => (x.id === c.id ? next : x)));
      await audit('child.update', 'child', c.id, Object.keys({ ...b, ...settings }).join(','));
      return out(json(200, view(next)));
    }

    // ── plans and config
    if (route(/^\/admin\/v1\/subscriptions\/plans$/, 'GET')) return out(json(200, (await s.get('plans')) ?? DEFAULT_PLANS));
    if (route(/^\/admin\/v1\/subscriptions\/plans$/, 'PUT')) {
      const cur = (await s.get('plans')) ?? DEFAULT_PLANS;
      const plans = body.plans ?? cur.plans, methods = body.methods ?? cur.methods;
      const okPlan = (p) => p && PLAN_IDS.includes(p.id) && isInt(p.price_cad_cents, 0, 1e6) && ['none', 'month', 'year'].includes(p.period) && p.name?.fr && p.name?.en && Array.isArray(p.features?.fr) && Array.isArray(p.features?.en);
      if (!Array.isArray(plans) || plans.length !== PLAN_IDS.length || !PLAN_IDS.every((id) => plans.some((p) => p.id === id)) || !plans.every(okPlan)) return out(bad('plans must hold free, family_monthly and family_yearly with id, price_cad_cents, period, name{fr,en}, features{fr[],en[]}'));
      if (!Array.isArray(methods) || !methods.length || !methods.every((x) => METHOD_IDS.includes(x.id) && x.label?.fr && x.label?.en)) return out(bad('methods must be a non-empty list of known ids with label{fr,en}'));
      const next = { currency: 'CAD', plans, methods };
      await s.set('plans', next);
      await audit('plans.update', 'plans', '*', plans.map((p) => `${p.id}=${p.price_cad_cents}`).join(' '));
      return out(json(200, next));
    }
    if (route(/^\/admin\/v1\/config$/, 'GET')) return out(json(200, (await s.get('config')) ?? DEFAULT_CONFIG));
    if (route(/^\/admin\/v1\/config$/, 'PUT')) {
      for (const [k, v] of Object.entries(body)) if (!CONFIG_RULES[k]?.(v)) return out(bad(`invalid config ${k}`));
      const next = { ...((await s.get('config')) ?? DEFAULT_CONFIG), ...body };
      await s.set('config', next);
      await audit('config.update', 'config', '*', Object.entries(body).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' '));
      return out(json(200, next));
    }

    // ── notifications
    if (route(/^\/admin\/v1\/notifications\/broadcast$/, 'POST')) {
      const { audience = 'parent', title, body: text, filter = {} } = body;
      const lang = (v, l) => (typeof v === 'string' ? v : v?.[l] ?? v?.fr ?? v?.en);
      if (!['parent', 'child'].includes(audience)) return out(bad('audience must be parent or child'));
      if (!lang(title, 'fr') || !lang(text, 'fr')) return out(bad('title and body are required (string or {fr,en})'));
      const want = (v) => (v === undefined ? null : [].concat(v));
      const f = { subscription: want(filter.subscription), status: want(filter.status), locale: want(filter.locale), plan: want(filter.plan), ids: want(filter.parent_ids) };
      const targets = (await s.list('parents')).filter((p) => {
        const sub = subView(p.subscription);
        return (!f.subscription || f.subscription.includes(sub.status)) && (!f.status || f.status.includes(p.status)) && (!f.locale || f.locale.includes(p.locale)) && (!f.plan || f.plan.includes(p.subscription.plan)) && (!f.ids || f.ids.includes(p.id));
      });
      const bid = crypto.randomUUID(), at = iso(Date.now());
      const notes = await s.list('notifications');
      for (const p of targets) {
        const l = p.locale.startsWith('en') ? 'en' : 'fr';
        notes.push({ id: crypto.randomUUID(), kind: 'announcement', title: lang(title, l), body: lang(text, l), created_at: at, read: false, audience, parent_id: p.id, broadcast_id: bid });
      }
      await s.set('notifications', notes.slice(-1500));
      await audit('notification.broadcast', 'notification', bid, `${audience} to ${targets.length}: ${lang(title, 'fr')}`);
      return out(json(201, { broadcast_id: bid, recipients: targets.length }));
    }
    if (route(/^\/admin\/v1\/notifications$/, 'GET')) {
      const rows = new Map();
      for (const n of (await s.list('notifications')).sort((a, b) => b.created_at.localeCompare(a.created_at))) {
        const key = n.broadcast_id ?? n.id;
        const row = rows.get(key);
        if (row) row.recipients += 1;
        else rows.set(key, { id: key, kind: n.kind, title: n.title, body: n.body, created_at: n.created_at, audience: n.audience, recipients: 1, broadcast: Boolean(n.broadcast_id), parent_id: n.broadcast_id ? null : n.parent_id });
      }
      return out(json(200, paged([...rows.values()], r)));
    }

    // ── audit
    if (route(/^\/admin\/v1\/audit$/, 'GET')) return out(json(200, paged((await s.list('audit')).sort((a, b) => b.at.localeCompare(a.at)), r)));

    return out(problem(404, 'not_found', 'Not found', `No admin route for ${method} ${path}.`));
  } catch (e) {
    return out(problem(500, 'internal_error', 'Platform store error', String(e.message ?? e)));
  }
}
