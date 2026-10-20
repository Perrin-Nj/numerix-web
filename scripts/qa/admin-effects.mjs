// R3 wiring proof, end to end: what the admin changes (Music, Voice, Scenes, Maintenance via /admin/v1/appconfig) really
// changes in the player, plus child settings sync and variant_history on answers. One line per check, exit 1 on any FAIL.
// Usage: node scripts/qa/admin-effects.mjs [appUrl] [apiUrl]   (needs the seeded stack: bash scripts/test.sh with SEED_CONTENT=1)
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from '../lib/kid.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3300').replace(/\/$/, '');
const API = (process.argv[3] ?? 'http://localhost:8300').replace(/\/$/, '');
const ADMIN = process.env.ADMIN_API_TOKEN ?? 'dev-admin-token';
let fails = 0;
const ok = (n, c, x = '') => {
  console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${c ? '' : ' ' + x}`);
  if (!c) fails++;
};

async function admin(method, path, body) {
  const r = await fetch(`${API}/admin/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${ADMIN}`, 'content-type': 'application/json', 'x-admin-actor': 'qa-effects' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(j).slice(0, 120)}`);
  return j;
}
/** Read a namespace, apply a patch on its value, save it. Returns the previous value so the run can restore it. */
async function patchNs(ns, patch) {
  const cur = await admin('GET', `/appconfig/${ns}`);
  await admin('PUT', `/appconfig/${ns}`, { value: { ...cur.value, ...patch }, expected_version: cur.version });
  return cur.value;
}
const restore = async (ns, value) => {
  const cur = await admin('GET', `/appconfig/${ns}`);
  await admin('PUT', `/appconfig/${ns}`, { value, expected_version: cur.version });
};
const pub = async () => (await fetch(`${API}/v1/config/public`)).json();

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const answers = [];
page.on('request', (r) => {
  if (/\/beats\/[^/]+\/answer$/.test(r.url()) && r.method() === 'POST') answers.push(r.postDataJSON());
});
await parentLogin(page, BASE);
await kidEnter(page, BASE);
const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
const toggle = page.getByRole('button', { name: /couper la musique|mettre la musique/i });
const settings = () => page.evaluate(async (c) => (await (await fetch(`/api/v1/children/${c}/settings`, { headers: { 'x-nx-mode': 'child' } })).json()), childId);

try {
  // ── baseline ──
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  ok('public config is served and has the R3 blocks', (await pub()).version >= 0 && !!(await pub()).music);
  ok('music: toggle shown by default', (await toggle.count()) === 1);

  // ── child switch is saved in the backend settings ──
  await toggle.evaluate((el) => el.click()); // a first-visit tour or gift may overlay the corner
  await page.waitForTimeout(800);
  ok('child turns music off: backend settings music.enabled=false', (await settings()).music?.enabled === false);
  await toggle.evaluate((el) => el.click()); // a first-visit tour or gift may overlay the corner
  await page.waitForTimeout(800);
  ok('child turns music on again: backend music.enabled=true', (await settings()).music?.enabled === true);

  // ── admin Music off -> no music UI, nothing to play ──
  const oldMusic = await patchNs('music', { enabled: false });
  await page.reload({ waitUntil: 'networkidle' });
  ok('admin music off: public config says so', (await pub()).music.enabled === false);
  ok('admin music off: player has no music toggle', (await toggle.count()) === 0);
  const musicFiles = [];
  page.on('request', (r) => /\/music\/.*\.(webm|m4a)$/.test(r.url()) && musicFiles.push(r.url()));
  await page.mouse.click(200, 400);
  await page.waitForTimeout(1500);
  ok('admin music off: no music file downloaded after a tap', musicFiles.length === 0, musicFiles.join(','));
  await restore('music', oldMusic);
  await page.reload({ waitUntil: 'networkidle' });
  ok('admin music back on: toggle returns', (await toggle.count()) === 1);

  // ── parent lock ──
  const s0 = await settings();
  const parentApi = await ctx.newPage();
  await parentApi.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' });
  const put = await parentApi.evaluate(async ([c, s]) => (await fetch(`/api/v1/children/${c}/settings`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-nx-mode': 'parent' }, body: JSON.stringify({ ...s, music: { ...s.music, parent_locked: true, enabled: false } }) })).status, [childId, s0]);
  await parentApi.close();
  await page.reload({ waitUntil: 'networkidle' });
  ok('parent lock (backend setting) hides the toggle', put === 200 && (await toggle.count()) === 0, `put ${put}`);
  const unlock = await ctx.newPage();
  await unlock.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' });
  await unlock.evaluate(async ([c, s]) => fetch(`/api/v1/children/${c}/settings`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-nx-mode': 'parent' }, body: JSON.stringify(s) }), [childId, s0]);
  await unlock.close();

  // ── maintenance ──
  const oldMaint = await patchNs('maintenance', { enabled: true, level: 'warning', message: { fr: 'Entretien ce soir QA', en: 'Maintenance tonight QA' }, block_play: false });
  await page.reload({ waitUntil: 'networkidle' });
  ok('maintenance on: friendly banner with the admin text', (await page.getByText('Entretien ce soir QA').count()) > 0);
  await patchNs('maintenance', { enabled: true, block_play: true });
  await page.reload({ waitUntil: 'networkidle' });
  ok('maintenance block_play: friendly blocked screen', (await page.getByText(/petite pause/i).count()) > 0);
  await restore('maintenance', oldMaint);
  await page.reload({ waitUntil: 'networkidle' });
  ok('maintenance off: back to normal', (await page.getByText('Entretien ce soir QA').count()) === 0 && (await page.getByText(/petite pause/i).count()) === 0);

  // ── a real run: variant_history + scene_key, then scene switches ──
  async function runChapter(n) {
    const node = await page.evaluate(async ([c]) => (await (await fetch(`/api/v1/children/${c}/journey?world=nature`, { headers: { 'x-nx-mode': 'child' } })).json()).nodes.find((x) => x.state !== 'locked'), [childId]);
    const s = await page.evaluate(async ([c, k]) => (await (await fetch(`/api/v1/children/${c}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ world: 'nature', kind: 'chapter', skill_id: k }) })).json()), [childId, node?.skill_id ?? null]);
    if (!s.id) throw new Error(`session did not start ${JSON.stringify(s).slice(0, 100)}`);
    await page.goto(`${BASE}/play/session/${s.id}`, { waitUntil: 'domcontentloaded' });
    const scenes = [];
    for (let i = 0; i < n; i++) {
      const keypad = page.getByRole('group', { name: 'Clavier numérique' });
      const idle = page.locator('main button[data-state=idle]').first();
      const order = page.getByRole('group', { name: 'Cartes à placer' });
      const match = page.locator('ul[aria-label="Cartes de gauche"] button:not([disabled])');
      await Promise.any([keypad.waitFor({ timeout: 20000 }), idle.waitFor({ timeout: 20000 }), order.waitFor({ timeout: 20000 }), match.first().waitFor({ timeout: 20000 })]);
      const verify = () => page.getByRole('button', { name: /vérifier|suivant/i }).first().click({ timeout: 4000 }).catch(() => {});
      if (await keypad.count()) { await keypad.getByRole('button', { name: /^7$/ }).click(); await verify(); }
      else if (await order.count()) { while (await order.getByRole('button').count()) await order.getByRole('button').last().click(); await verify(); }
      else if (await match.count()) {
        const k = await match.count();
        for (let j = 0; j < k; j++) { await page.locator('ul[aria-label="Cartes de gauche"] button').nth(j).click(); await page.locator('ul[aria-label="Cartes de droite"] button').nth(k - 1 - j).click(); }
        await verify();
      } else await idle.click();
      const cont = page.getByRole('button', { name: /^continuer$/i });
      await cont.waitFor({ timeout: 15000 });
      await page.waitForTimeout(1200);
      scenes.push({ scene: await page.locator('[data-scene]').count(), settled: await page.locator('[data-scene][data-settled]').count() });
      await cont.click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await page.evaluate((id) => fetch(`/api/v1/sessions/${id}/finish`, { method: 'POST', headers: { 'x-nx-mode': 'child' } }), s.id);
    return scenes;
  }
  answers.length = 0;
  const base = await runChapter(3);
  ok('answers sent: 3', answers.length === 3, String(answers.length));
  ok('first answer carries no history (nothing seen yet)', !answers[0]?.variant_history?.length);
  ok('later answers send variant_history of scene ids already shown', Array.isArray(answers[2]?.variant_history) && answers[2].variant_history.length >= 1 && answers[2].variant_history.every((v) => /^[a-z]+\.[a-z]+\.(ko|ok)$/.test(v)), JSON.stringify(answers.map((a) => a.variant_history)));
  ok('a consequence scene is drawn for answers (physics scenes)', base.some((b) => b.scene > 0), JSON.stringify(base));

  const oldScenes = await patchNs('scenes', { physics_enabled: false });
  const still = await runChapter(1);
  ok('admin physics off: scene shows the resting picture at once', still[0].scene === 0 || still[0].settled > 0, JSON.stringify(still));
  await restore('scenes', oldScenes);

  const cur = await admin('GET', '/appconfig/scenes');
  const allOff = Object.fromEntries(['number', 'add_sub', 'mult_div', 'fractions', 'geometry', 'measure', 'data', 'time'].map((f) => [f, { enabled: false, disabled_variants: [] }]));
  await admin('PUT', '/appconfig/scenes', { value: { ...cur.value, families: allOff }, expected_version: cur.version });
  const none = await runChapter(1);
  ok('admin scene families off: no scene drawn, the chapter continues', none[0].scene === 0, JSON.stringify(none));
  await restore('scenes', oldScenes);
} catch (e) {
  fails++;
  console.log(`FAIL admin-effects crashed: ${String(e.stack ?? e).slice(0, 400)}`);
}
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all admin effects ok');
process.exit(fails ? 1 : 0);
