// Question bank smoke test through the admin /api proxy (real Go endpoints). Usage: ADMIN_URL=... ADMIN_PASSWORD=... node scripts/questions-smoke.mjs
const base = (process.env.ADMIN_URL ?? 'http://localhost:3100').replace(/\/$/, '');
let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || !extra ? '' : ` (${extra})`}`);
  if (!ok) failed++;
};
try {
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.8.${Date.now() % 250}.7` },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
  });
  const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];
  const call = async (path, method = 'GET', body, headers = {}) => {
    const x = await fetch(base + '/api/' + path, { method, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const t = await x.text();
    let data = null;
    try { data = t ? JSON.parse(t) : null; } catch { data = t; }
    return { status: x.status, data };
  };

  // list + coverage
  const quests = (await call('quests')).data.items;
  const quest = quests.find((q) => q.id === 'meteo.pluie') ?? quests[0];
  const list = await call(`questions?quest=${quest.id}&page_size=5`);
  check('list returns paged questions', list.status === 200 && list.data.items.length > 0 && typeof list.data.total === 'number', list.status);
  const filtered = await call(`questions?quest=${quest.id}&status=published&type=numeric`);
  check('list filters by status and type', filtered.status === 200 && filtered.data.items.every((q) => q.status === 'published' && q.type === 'numeric'));
  const cov = await call('content/coverage');
  check('coverage lists quests with target and counts', cov.status === 200 && cov.data.quests.every((q) => q.target_count > 0 && q.by_status) && cov.data.worlds.length > 0);

  // create a draft from an existing question
  const src = (await call(`questions/${list.data.items[0].id}`)).data.question;
  const q = { ...src, id: undefined, status: undefined, version: undefined, author: undefined, source: undefined, tags: [...src.tags, 'admin-smoke'] };
  const created = await call('questions', 'POST', q);
  check('create saves a draft', created.status === 201 && created.data.status === 'draft' && created.data.id.startsWith(quest.id), created.status);
  const id = created.data.id;

  // validate error: the hint leaks the answer
  const leaky = { ...q, hint: { fr: 'La réponse est 99', en: 'The answer is 99' }, answer: { ...q.answer, value: 99, calc: '99' } };
  const bad = await call('questions/validate', 'POST', { ...leaky, status: 'draft' });
  check('validate reports the answer leak', bad.status === 200 && bad.data.ok === false && bad.data.issues.some((i) => i.code === 'answer_leak' && !i.warning), JSON.stringify(bad.data).slice(0, 200));
  const badSave = await call('questions', 'POST', leaky);
  const badId = badSave.data?.id;
  const badPub = await call(`questions/${badId}/transition`, 'POST', { to: 'published', comment: 'smoke' });
  check('publish of an invalid draft is refused with field errors', badPub.status === 422 && badPub.data.errors?.length > 0, badPub.status);

  // optimistic locking
  const stale = await call(`questions/${id}`, 'PUT', q, { 'if-match': '99' });
  check('stale If-Match is refused (409 version_conflict)', stale.status === 409 && stale.data.code === 'version_conflict', stale.status);
  const put = await call(`questions/${id}`, 'PUT', { ...q, tags: [...q.tags, 'edited'] }, { 'if-match': '1' });
  check('save with If-Match makes version 2', put.status === 200 && put.data.version === 2, put.status);

  // publish, unpublish, versions
  const pub = await call(`questions/${id}/transition`, 'POST', { to: 'published', comment: 'smoke' });
  check('publish a valid draft', pub.status === 200 && pub.data.status === 'published' && pub.data.reviewed_by, pub.status);
  const vs = await call(`questions/${id}/versions`);
  check('version history lists every save', vs.status === 200 && vs.data.items.length >= 3, vs.status);
  const retire = await call(`questions/${id}/transition`, 'POST', { to: 'retired', comment: 'cleanup' });
  check('archive (retired)', retire.status === 200 && retire.data.status === 'retired', retire.status);
  await call(`questions/${badId}/transition`, 'POST', { to: 'retired', comment: 'cleanup' });

  // audit trail
  const audit = await call('audit?page_size=50');
  check('audit shows the question actions', audit.status === 200 && ['question.create', 'question.publish'].every((a) => audit.data.items.some((e) => e.action === a && e.target_id === id)), audit.status);

  // import dry run
  const exp = await call(`questions/export?world=${quest.world}`);
  check('export gives the seed shape', exp.status === 200 && Array.isArray(exp.data.questions) && exp.data.questions.length > 0);
  const same = await call('questions/import?dry_run=1', 'POST', { schema: 1, questions: exp.data.questions.filter((x) => x.status === 'published').slice(0, 3) });
  check('import dry run: unchanged questions are a no-op', same.status === 200 && same.data.dry_run === true && same.data.added === 0 && same.data.changed === 0 && same.data.unchanged === 3, JSON.stringify(same.data));
  const inv = await call('questions/import?dry_run=1', 'POST', [{ quest: 'x' }]);
  check('import dry run: invalid items are listed', inv.status === 200 && inv.data.invalid.length === 1 && inv.data.invalid[0].issues.length > 0);

  // AI draft: 503 not_configured is an honest, readable state
  const ai = await call('questions/ai-draft', 'POST', { quest: quest.id, type: 'numeric' });
  check('ai draft answers not_configured or creates a draft', (ai.status === 503 && ai.data.code === 'not_configured') || (ai.status === 201 && ai.data.question.status === 'draft'), ai.status);

  // media: list, search, thumbnails through the admin origin (cookie required)
  const assets = await call('assets?page_size=3');
  check('assets list', assets.status === 200 && assets.data.items.length > 0 && assets.data.items[0].licence);
  const a = assets.data.items[0];
  const file = a.media.srcset?.[0]?.url.split('/').pop() ?? `${a.id}.webp`;
  const img = await fetch(`${base}/api/media/${file}`, { headers: { cookie } });
  check('thumbnail served through the proxy', img.status === 200 && img.headers.get('content-type') === 'image/webp', img.status);
  const noAuth = await fetch(`${base}/api/media/${file}`);
  check('thumbnail needs the session', noAuth.status === 401, noAuth.status);

  // pages render
  for (const p of ['/questions', '/questions/new', `/questions/${list.data.items[0].id}`, '/questions/import', '/media']) {
    const r = await fetch(base + p, { headers: { cookie } });
    check(`page ${p} renders`, r.status === 200, r.status);
  }
} catch (e) {
  check('questions smoke run', false, e.message);
}
console.log(failed ? `${failed} check(s) failed` : 'all question checks passed');
process.exit(failed ? 1 : 0);
