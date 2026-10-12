// Overview aggregates for the admin app, computed from the stored records (parents, children, per-day activity,
// subscription history). Nothing here is hard-coded: change the store and the numbers move.
import { WORLD_IDS } from './domain.mjs';
import { DAY, DEFAULT_PLANS, subView } from './platform.mjs';

const dstr = (ms) => new Date(ms).toISOString().slice(0, 10);
const t = (x) => (x ? Date.parse(x) : 0);
const STATUSES = ['trial', 'active', 'unpaid', 'expired', 'canceled'];

export function computeOverview(now, { parents, children, plans: planDoc, activity = {}, subhist = {} }) {
  const plans = (planDoc ?? DEFAULT_PLANS).plans;
  const monthly = (plan) => {
    const pl = plans.find((x) => x.id === plan);
    return !pl ? 0 : pl.period === 'year' ? Math.round(pl.price_cad_cents / 12) : pl.price_cad_cents;
  };
  const todayStart = Math.floor(now / DAY) * DAY;
  const today = dstr(now);

  // ── live subscription state
  const by = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  const planMix = Object.fromEntries(plans.map((p) => [p.id, { plan: p.id, count: 0, mrr_cad_cents: 0 }]));
  let mrr = 0;
  for (const p of parents) {
    const sub = subView(p.subscription, now);
    by[sub.status] += 1;
    const row = (planMix[p.subscription.plan] ??= { plan: p.subscription.plan, count: 0, mrr_cad_cents: 0 });
    row.count += 1;
    if (sub.status === 'active' && p.status !== 'blocked') { const v = monthly(sub.plan); mrr += v; row.mrr_cad_cents += v; }
  }

  // ── per kid per day: live data for today, stored records before
  const idxOf = (rec, date) => Math.round((Date.parse(date) - Date.parse(rec.from)) / DAY);
  const dayOf = (c, date) => {
    const rec = activity[c.id];
    if (date === today) {
      const seen = c.last_seen_at && dstr(t(c.last_seen_at)) === today;
      const m = seen ? c.minutes_today ?? 0 : 0;
      const i = rec ? idxOf(rec, date) : -1;
      return { active: seen, m, s: seen ? Math.max(rec?.s[i] ?? 0, Math.ceil(m / 12)) : 0, w: rec?.w[i] ?? -1 };
    }
    if (!rec) return { active: false, m: 0, s: 0, w: -1 };
    const i = idxOf(rec, date);
    const m = rec.m[i] ?? 0;
    return { active: m > 0, m, s: rec.s[i] ?? 0, w: rec.w[i] ?? -1 };
  };
  const dates = (n) => Array.from({ length: n }, (_, i) => dstr(todayStart - (n - 1 - i) * DAY));

  const days90 = dates(90).map((date) => {
    let active_kids = 0, minutes = 0, sessions = 0;
    for (const c of children) { const d = dayOf(c, date); if (d.active) active_kids += 1; minutes += d.m; sessions += d.s; }
    return { date, active_kids, minutes, sessions };
  });
  const last30 = days90.slice(-30);
  const pick = (k) => last30.map((d) => ({ date: d.date, value: d[k] }));

  // ── history based snapshots (as of end of a day; live values for now)
  const segs = parents.flatMap((p) => (subhist[p.id] ?? []).map((s) => ({ ...s, pid: p.id })));
  const snapshot = (T) => {
    const live = T >= now;
    const D = live ? now : T;
    let paid, mrrAt;
    if (live) { paid = by.active; mrrAt = mrr; } else {
      const on = segs.filter((s) => t(s.started_at) <= D && (!s.ended_at || t(s.ended_at) > D) && s.plan !== 'free');
      paid = new Set(on.map((s) => s.pid)).size;
      mrrAt = on.reduce((a, s) => a + monthly(s.plan), 0);
    }
    const churn = new Set(segs.filter((s) => { const e = t(s.canceled_at || s.ended_at); return e > D - 30 * DAY && e <= D; }).map((s) => s.pid)).size;
    const eligible = children.filter((c) => t(c.created_at) <= D - 30 * DAY);
    const week = Array.from({ length: 7 }, (_, i) => dstr(D - i * DAY));
    const act = eligible.filter((c) => week.some((d) => dayOf(c, d).active)).length;
    return {
      parents: parents.filter((p) => t(p.created_at) <= D).length,
      kids: children.filter((c) => t(c.created_at) <= D).length,
      paid, mrr_cad_cents: mrrAt, arpu_cad_cents: paid ? Math.round(mrrAt / paid) : 0, churn_30d: churn,
      retention_pct: eligible.length ? Math.round((act / eligible.length) * 1000) / 10 : 0, retention_eligible: eligible.length, retention_active: act,
    };
  };
  const trend = Array.from({ length: 31 }, (_, i) => {
    const day = todayStart - (30 - i) * DAY;
    return { date: dstr(day), ...snapshot(i === 30 ? now : day + DAY - 1) };
  });
  const cur = trend[30];

  // ── signups
  const created = parents.map((p) => p.created_at);
  const days30 = dates(30);
  const signupsDay = days30.map((date) => ({ date, count: created.filter((c) => c.slice(0, 10) === date).length }));
  const nowD = new Date(now);
  const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth() - (11 - i), 1)));
  const mkey = (d) => d.toISOString().slice(0, 7);
  const signupsMonth = months.map((m) => ({ month: mkey(m), count: created.filter((c) => c.slice(0, 7) === mkey(m)).length }));
  const mrrMonth = months.map((m, i) => {
    const end = i === 11 ? now : Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1) - 1;
    return { month: mkey(m), mrr_cad_cents: snapshot(end).mrr_cad_cents };
  });

  // ── kids and worlds
  const gradeCount = new Map();
  for (const c of children) gradeCount.set(c.grade, (gradeCount.get(c.grade) ?? 0) + 1);
  for (let g = 1; g <= 6; g++) if (!gradeCount.has(g)) gradeCount.set(g, 0);
  const kidsByGrade = [...gradeCount].sort((a, b) => a[0] - b[0]).map(([grade, count]) => ({ grade, count }));
  const worlds = Object.fromEntries(WORLD_IDS.map((w) => [w, 0]));
  for (const date of dates(30)) for (const c of children) { const d = dayOf(c, date); if (d.s && d.w >= 0) worlds[WORLD_IDS[d.w]] += d.s; }
  const topWorlds = Object.entries(worlds).map(([world, sessions_30d]) => ({ world, sessions_30d })).sort((a, b) => b.sessions_30d - a.sessions_30d);

  return {
    parents_total: parents.length, by_subscription: by, blocked: parents.filter((p) => p.status === 'blocked').length,
    kids_total: children.length, active_today: children.filter((c) => dayOf(c, today).active).length,
    mrr_cad_cents: mrr, currency: 'CAD',
    signups_30d: signupsDay, signups_30d_total: signupsDay.reduce((a, x) => a + x.count, 0),
    signups_by_day_30: signupsDay, signups_by_month_12: signupsMonth,
    active_kids_by_day_30: pick('active_kids'), minutes_by_day_30: pick('minutes'), sessions_by_day_30: pick('sessions'),
    activity_by_day_90: days90,
    subscription_mix: STATUSES.map((status) => ({ status, count: by[status] })),
    plan_mix: Object.values(planMix),
    mrr_by_month_12: mrrMonth,
    kids_by_grade: kidsByGrade,
    retention: { pct: cur.retention_pct, eligible: cur.retention_eligible, active: cur.retention_active },
    churn_30d: cur.churn_30d,
    arpu_cad_cents: cur.arpu_cad_cents,
    top_worlds: topWorlds,
    trend_30: trend,
  };
}
