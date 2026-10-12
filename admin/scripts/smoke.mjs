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
  check('overview returns data', o.status === 200 && typeof o.data?.parents_total === 'number' && Array.isArray(o.data?.signups_30d), o.status);
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
