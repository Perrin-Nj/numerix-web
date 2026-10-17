// Seeds a demo parent with two children through the real API (register, child, consent). Development only.
// Usage: node scripts/seed-dev.mjs [apiUrl]   (default http://localhost:8081/v1). Safe to run twice.
const API = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:8081/v1').replace(/\/$/, '');
if (/numerix\.(app|com)|vercel\.app/.test(API)) throw new Error('seed-dev refuses to run against a hosted API');
const EMAIL = 'demo@numerix.dev';
const PASSWORD = 'correct-horse-battery';

const call = async (method, path, body, token) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'accept-language': 'fr-CA', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

let r = await call('POST', '/auth/register', { email: EMAIL, password: PASSWORD, locale: 'fr-CA' });
if (r.status === 409) r = await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
if (!r.json?.access_token) throw new Error(`seed: no parent token (${r.status})`);
const token = r.json.access_token;

const existing = (await call('GET', '/children', null, token)).json?.items ?? [];
for (const [name, grade, avatar, pin] of [['Zoé', 2, 'fox', '1234'], ['Noé', 4, 'owl', '4321']]) {
  if (existing.some((c) => c.display_name === name)) continue;
  const c = await call('POST', '/children', { display_name: name, grade, avatar_id: avatar, pin }, token);
  if (c.status !== 201) throw new Error(`seed: child ${name} failed (${c.status})`);
  await call('POST', '/auth/consent', { child_id: c.json.id, version: '2026-10', accepted: true }, token);
}
console.log(`seeded ${EMAIL} / ${PASSWORD} with PINs 1234 and 4321`);
