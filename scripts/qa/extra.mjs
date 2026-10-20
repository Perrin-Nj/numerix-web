// Extra QA flows: fr/en switch on every route (no language leakage), quest lock states, parent logout, passkey panel with a virtual
// authenticator, credits page links. One line per check. Usage: node scripts/qa/extra.mjs [baseUrl]
import { chromium } from 'playwright';
import { parentLogin, kidEnter } from '../lib/kid.mjs';
const BASE = (process.argv[2] ?? 'http://localhost:3130').replace(/\/$/, '');
let fails = 0;
const ok = (n, c, x = '') => { console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${c ? '' : ' ' + x}`); if (!c) fails++; };
const FR = /\b(Je suis|Mes |Mon |Ton |Ta |Choisis|Continuer|Retour|Accueil|Défis|Cartes|Mondes|Suivant|Enregistrer|Supprimer|Se connecter|Mot de passe|enfant|abonnement|Déconnexion|Annuler)\b/;
const EN = /\b(Back|Home|Challenges|Cards|Worlds|Next|Save|Delete|Log in|Password|Subscription|Log out|Cancel|Sign in|Settings)\b/;
const browser = await chromium.launch();

async function routes(page) {
  const out = ['/', '/credits', '/offline', '/parent/login', '/parent/register'];
  await parentLogin(page, BASE);
  out.push('/parent', '/parent/account', '/parent/subscription', '/parent/children/new');
  const c = await page.$$eval('a[href*="/parent/children/"]', (a) => a.map((x) => x.getAttribute('href')).find((h) => /children\/[^/]+$/.test(h) && !/new/.test(h)));
  if (c) out.push(c, c + '/consent', c + '/report', c + '/settings');
  return out;
}
// 1. language switch on every route
for (const [loc, bad, name] of [['en-CA', FR, 'English'], ['fr-CA', EN, 'French']]) {
  const ctx = await browser.newContext({ locale: loc, viewport: { width: 390, height: 800 } });
  await ctx.addCookies([{ name: 'NEXT_LOCALE', value: loc, url: BASE }]);
  const page = await ctx.newPage();
  const list = await routes(page);
  await kidEnter(page, BASE);
  list.push('/play/home', '/play/worlds', '/play/feed', '/play/challenges', '/play/collection', '/play/me', '/play/quest');
  for (const r of list) {
    await page.goto(BASE + r, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(400);
    const lang = await page.evaluate(() => document.documentElement.lang);
    const text = await page.evaluate(() => document.body.innerText);
    const hit = text.match(bad)?.[0];
    ok(`${name} ${r.replace(/[0-9a-f-]{20,}/, ':id')}: html lang ${lang}, no ${loc === 'en-CA' ? 'French' : 'English'} UI text`, lang.startsWith(loc.slice(0, 2)) && !hit, `lang=${lang} leak="${hit}"`);
  }
  await ctx.close();
}
// 2. quest lock states: locked nodes never start a session, unlocked ones do
{
  const ctx = await browser.newContext({ locale: 'fr-CA' }); const page = await ctx.newPage();
  await parentLogin(page, BASE); await kidEnter(page, BASE);
  const childId = (await (await page.request.get(`${BASE}/api/session`)).json()).childId;
  let locked = 0, served = 0, probs = [];
  const worlds = await page.evaluate(async () => (await (await fetch('/api/v1/worlds', { headers: { 'x-nx-mode': 'child' } })).json()).items.map((w) => w.id));
  for (const w of worlds) {
    const j = await page.evaluate(async ([c, wd]) => (await (await fetch(`/api/v1/children/${c}/journey?world=${wd}`, { headers: { 'x-nx-mode': 'child' } })).json()), [childId, w]);
    for (const n of j.nodes ?? []) {
      const isLocked = n.locked === true || /lock/i.test(String(n.state ?? n.status ?? ''));
      if (!isLocked) continue;
      locked++;
      const r = await page.evaluate(async ([c, k, wd]) => { const x = await fetch(`/api/v1/children/${c}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ world: wd, kind: 'chapter', skill_id: k }) }); return x.status; }, [childId, n.skill_id, w]);
      if (r === 201) { served++; probs.push(`${w}/${n.skill_id}`); }
    }
  }
  ok(`quest locks: ${locked} locked nodes over ${worlds.length} worlds, none startable`, locked > 0 && served === 0, `${served} started: ${probs.slice(0, 3)}`);
  // QA-BE-006: what home suggests ("Continue l'aventure") and the daily quest must be startable, or the main Play button is dead
  await page.waitForTimeout(7000); // the start-session limiter cools down after the lock probes
  const home = await page.evaluate(async (c) => (await fetch(`/api/v1/children/${c}/home`, { headers: { 'x-nx-mode': 'child' } })).json(), childId);
  const start = (w, k) => page.evaluate(async ([c, wd, sk]) => { const x = await fetch(`/api/v1/children/${c}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nx-mode': 'child', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ world: wd, kind: 'chapter', skill_id: sk }) }); return `${x.status} ${(await x.text()).slice(0, 80)}`; }, [childId, w, k]);
  if (home.suggested?.skill_id) { const r = await start(home.suggested.world, home.suggested.skill_id); ok(`home suggestion ${home.suggested.skill_id} starts (Play button)`, r.startsWith('201'), r); }
  const q = home.quest;
  if (q?.skill_ids?.length && home.suggested?.world) { const r = await start(home.suggested.world, q.skill_ids[0]); ok(`daily quest ${q.skill_ids[0]} starts`, r.startsWith('201') || /409|session/.test(r), r); }
  await ctx.close();
}
// 3. logout
{
  const ctx = await browser.newContext({ locale: 'fr-CA' }); const page = await ctx.newPage();
  await parentLogin(page, BASE);
  await page.goto(`${BASE}/parent/account`, { waitUntil: 'networkidle' });
  const btn = page.getByRole('button', { name: /déconnecter|déconnexion|log out|sign out/i }).first();
  ok('parent logout button exists on account page', (await btn.count()) > 0);
  if (await btn.count()) {
    await btn.click(); await page.waitForTimeout(1500);
    const ck = (await ctx.cookies()).filter((c) => /nx_parent/.test(c.name) && c.value);
    await page.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
    ok('after logout: parent cookie gone and /parent asks to log in', ck.length === 0 && /login/.test(page.url()), `cookies=${ck.length} url=${page.url()}`);
  }
  await ctx.close();
}
// 4. passkey panel with a virtual authenticator
{
  const ctx = await browser.newContext({ locale: 'fr-CA' }); const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  await parentLogin(page, BASE);
  await page.goto(`${BASE}/parent/account`, { waitUntil: 'networkidle' });
  const panel = page.getByText(/clé d.accès|passkey|clés d.accès/i).first();
  ok('passkey panel is shown on the account page', (await panel.count()) > 0);
  const add = page.getByRole('button', { name: /ajouter.*(clé|passkey)|créer.*(clé|passkey)|add.*passkey|register.*passkey/i }).first();
  if (await add.count()) {
    await add.click(); await page.waitForTimeout(3000);
    const err = await page.getByRole('alert').allInnerTexts().catch(() => []);
    const body = await page.evaluate(() => document.body.innerText);
    ok('passkey registers with a virtual authenticator (no error alert)', !err.some((t) => t.trim()) && /(ajoutée|enregistrée|added|registered|1 clé|1 passkey|supprimer|remove)/i.test(body), `alerts=${err.join('|').slice(0, 100)}`);
  } else ok('passkey add button found', false, 'no add button');
  await ctx.close();
}
// 5. credits: every source/licence link is an https link, one entry per credited asset
{
  const ctx = await browser.newContext({ locale: 'fr-CA' }); const page = await ctx.newPage();
  await page.goto(`${BASE}/credits`, { waitUntil: 'networkidle' });
  const links = await page.$$eval('main a[href^="http"]', (a) => a.map((x) => x.getAttribute('href')));
  const bad = links.filter((h) => !/^https:\/\//.test(h));
  ok(`credits: ${links.length} external links, all https`, links.length > 100 && bad.length === 0, `bad=${bad.slice(0, 2)}`);
  const noRel = await page.$$eval('main a[target=_blank]', (a) => a.filter((x) => !/noopener/.test(x.rel)).length);
  ok('credits: external links open with noopener', noRel === 0, String(noRel));
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all pass');
process.exit(fails ? 1 : 0);
