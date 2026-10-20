// HTTP smoke test. Usage: ADMIN_URL=http://localhost:3100 ADMIN_PASSWORD=... node scripts/smoke.mjs
const base = (process.env.ADMIN_URL ?? 'http://localhost:3100').replace(/\/$/, '');
const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.error('ADMIN_PASSWORD env required');
  process.exit(2);
}
let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || !extra ? '' : ` (${extra})`}`);
  if (!ok) failed++;
};
const post = (path, body, headers = {}) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), redirect: 'manual' });
const ip = (n) => ({ 'x-forwarded-for': `10.9.${Date.now() % 250}.${n}` }); // isolates the rate limiter between checks

try {
  let r = await post('/api/auth/login', {}, ip(1));
  check('login refused without password', r.status === 401, r.status);
  r = await post('/api/auth/login', { password: password + 'x' }, ip(1));
  check('login refused with wrong password', r.status === 401, r.status);
  r = await fetch(base + '/api/overview');
  check('protected api 401 without cookie', r.status === 401, r.status);
  r = await fetch(base + '/parents', { redirect: 'manual' });
  check('protected page redirects to login', r.status >= 300 && r.status < 400 && (r.headers.get('location') ?? '').includes('/login'), r.status);

  r = await post('/api/auth/login', { password }, ip(2));
  const setCookie = r.headers.get('set-cookie') ?? '';
  check('login ok sets httpOnly cookie', r.status === 200 && /nx_admin=/.test(setCookie) && /httponly/i.test(setCookie), r.status);
  const cookie = setCookie.split(';')[0];
  const call = async (path, method = 'GET', body) => {
    const x = await fetch(base + '/api/' + path, { method, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const t = await x.text();
    return { status: x.status, data: t ? JSON.parse(t) : null };
  };

  let o = await call('overview');
  check('overview returns data', o.status === 200 && typeof o.data?.parents_total === 'number' && Array.isArray(o.data?.signups_by_day_30), o.status);
  const ov = o.data;
  const sum = (a, k) => a.reduce((x, y) => x + y[k], 0);
  check(
    'overview contract includes every dashboard series',
    o.status === 200 &&
      ov.signups_by_day_30?.length === 30 &&
      ov.signups_by_month_12?.length === 12 &&
      ov.active_kids_by_day_30?.length === 30 &&
      ov.minutes_by_day_30?.length === 30 &&
      ov.sessions_by_day_30?.length === 30 &&
      ov.activity_by_day_90?.length === 90 &&
      ov.subscription_mix?.length === 5 &&
      ov.plan_mix?.length === 3 &&
      ov.mrr_by_month_12?.length === 12 &&
      ov.kids_by_grade?.length === 6 &&
      ov.top_worlds?.length === 8 &&
      ov.trend_30?.length === 31 &&
      ov.trend_30[0] &&
      typeof ov.trend_30[0].parents === 'number' &&
      typeof ov.trend_30[30].parents === 'number',
  );
  check('overview consistency: mixes and grades add up', sum(ov.subscription_mix, 'count') === ov.parents_total && sum(ov.kids_by_grade, 'count') === ov.kids_total && sum(ov.plan_mix, 'mrr_cad_cents') === ov.mrr_cad_cents);
  check('overview consistency: last points match tiles', ov.active_kids_by_day_30[29].value === ov.active_today && ov.mrr_by_month_12[11].mrr_cad_cents === ov.mrr_cad_cents);
  const pl = await call('parents?page_size=5');
  check('parents list returns data', pl.status === 200 && pl.data.items?.length > 0, pl.status);
  const cl = await call('children?page_size=5');
  check('children list returns data', cl.status === 200 && cl.data.items?.length > 0, cl.status);
  const cd = await call(`children/${cl.data.items[0].id}`);
  check('child detail returns data', cd.status === 200 && cd.data.settings, cd.status);

  const target = pl.data.items.find((p) => p.status === 'active' && p.subscription.status !== 'active') ?? pl.data.items[0];
  let u = await call(`parents/${target.id}`, 'PATCH', { subscription: { status: 'active', plan: 'family_monthly' } });
  let v = await call(`parents/${target.id}`);
  check('mark paid then verify', u.status === 200 && v.data?.subscription?.status === 'active', u.status);
  u = await call(`parents/${target.id}`, 'PATCH', { subscription: { status: 'unpaid' } });
  v = await call(`parents/${target.id}`);
  check('mark unpaid then verify', u.status === 200 && v.data?.subscription?.status === 'unpaid', u.status);
  u = await call(`parents/${target.id}`, 'PATCH', { status: 'blocked', blocked_reason: 'smoke' });
  v = await call(`parents/${target.id}`);
  check('block then verify', u.status === 200 && v.data?.status === 'blocked', u.status);
  u = await call(`parents/${target.id}`, 'PATCH', { status: 'active' });
  v = await call(`parents/${target.id}`);
  check('unblock then verify', u.status === 200 && v.data?.status === 'active', u.status);

  const cfg = await call('config');
  check('config returns data', cfg.status === 200 && typeof cfg.data?.card_threshold_pct === 'number', cfg.status);
  const next = { ...cfg.data, card_threshold_pct: cfg.data.card_threshold_pct === 71 ? 72 : 71 };
  u = await call('config', 'PUT', next);
  v = await call('config');
  check('config round trip', u.status === 200 && v.data?.card_threshold_pct === next.card_threshold_pct, u.status);
  await call('config', 'PUT', cfg.data);

  // Runtime config store through the proxy: list, validation, save, history, rollback, public copy.
  const lst = await call('appconfig');
  const names = (lst.data?.namespaces ?? []).map((n) => n.name);
  check('appconfig lists every namespace', lst.status === 200 && ['platform', 'music', 'voice', 'scenes', 'feed', 'maintenance'].every((n) => names.includes(n)), lst.status);
  check('appconfig env view never shows a secret value', lst.status === 200 && lst.data.env.every((e) => !e.secret || e.value === undefined), lst.status);
  const m0 = await call('appconfig/music');
  check('music config returns defaults and version', m0.status === 200 && typeof m0.data?.version === 'number' && Array.isArray(m0.data?.value?.tracks), m0.status);
  u = await call('appconfig/music', 'PUT', { value: { ...m0.data.value, default_volume: 101 } });
  check('music config rejects volume 101 (422)', u.status === 422, u.status);
  const vol = m0.data.value.default_volume === 33 ? 34 : 33;
  u = await call('appconfig/music', 'PUT', { value: { ...m0.data.value, default_volume: vol }, expected_version: m0.data.version });
  check('music config saves a new version', u.status === 200 && u.data.version === m0.data.version + 1, u.status);
  u = await call('appconfig/music', 'PUT', { value: m0.data.value, expected_version: m0.data.version });
  check('stale expected_version answers 409', u.status === 409, u.status);
  const hv = await call('appconfig/music/versions');
  check('history lists who and when', hv.status === 200 && hv.data.items[0]?.actor && hv.data.items[0]?.at, hv.status);
  u = await call('appconfig/music/rollback', 'POST', {});
  v = await call('appconfig/music');
  check('rollback restores the previous value', u.status === 200 && v.data.value.default_volume === m0.data.value.default_volume, u.status);
  if (process.env.PLATFORM_API_URL) {
    const pub = await fetch(process.env.PLATFORM_API_URL.replace(/\/$/, '') + '/v1/config/public');
    const pj = await pub.json();
    check('public config is served without auth and cached', pub.status === 200 && /max-age/.test(pub.headers.get('cache-control') ?? '') && pj.music?.default_volume === m0.data.value.default_volume, pub.status);
  }

  for (const p of ['config', 'music', 'voice', 'scenes', 'feed', 'maintenance']) {
    const pg = await fetch(`${base}/${p}`, { headers: { cookie }, redirect: 'manual' });
    check(`page /${p} renders`, pg.status === 200, pg.status);
  }

  const au = await call('audit');
  check('audit returns data', au.status === 200 && au.data.items?.length > 0, au.status);

  // Last: lock-out after 5 failures from one IP.
  const lock = ip(9);
  let last = 0;
  for (let i = 0; i < 6; i++) last = (await post('/api/auth/login', { password: 'nope' }, lock)).status;
  check('login rate limited after 5 tries', last === 429, last);
} catch (e) {
  check('smoke run', false, e.message);
}
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
