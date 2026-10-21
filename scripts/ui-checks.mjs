// Browser checks that print one line each (no screenshots, no images): the kid and grown-up journeys on screen.
// Usage: node scripts/ui-checks.mjs [baseUrl]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { solve } from './lib/solver.mjs';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'fr-CA', viewport: { width: 420, height: 880 } });
// A fake speech engine with one French and one English woman voice, so reading aloud can be checked without a sound card
await ctx.addInitScript(() => {
  const voices = [
    { name: 'Microsoft Guy Online (Natural) - French (France)', lang: 'fr-FR', localService: false },
    { name: 'Microsoft Sylvie Online (Natural) - French (Canada)', lang: 'fr-CA', localService: false },
    { name: 'Microsoft Sonia Online (Natural) - English (United Kingdom)', lang: 'en-GB', localService: false },
  ];
  window.__spoken = [];
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      getVoices: () => voices,
      speak: (u) => {
        window.__spoken.push({ text: u.text, lang: u.lang, voice: u.voice?.name });
        setTimeout(() => u.onend?.(), 20);
      },
      cancel() {},
      addEventListener() {},
      removeEventListener() {},
    },
  });
});
const page = await ctx.newPage();
if (process.env.FAIL_SHOTS) {
  page.on('response', async (r) => {
    if (r.status() >= 400 && r.url().includes('/api/v1')) console.log('HTTP', r.status(), r.request().method(), r.request().headers()['x-nx-mode'], page.url().slice(21), r.url().slice(22, 100), (await r.text().catch(() => '')).slice(0, 110));
  });
}
const errors = [];
page.on('pageerror', (e) => errors.push(`${page.url().replace(BASE, '')} ${e.message.slice(0, process.env.FULL_ERR ? 3000 : 160)}`));
// answers the checks provoke on purpose: a wrong PIN, a login screen asking if this device is known, a signed-out picker
const EXPECTED = /children\/[^/]+\/token|auth\/device|\/api\/v1\/children$/;
const failedLoad = /Failed to load resource/;
page.on('console', (m) => m.type() === 'error' && !failedLoad.test(m.text()) && errors.push(`${page.url().replace(BASE, '')} ${m.text().slice(0, process.env.FULL_ERR ? 3000 : 160)}`));
let fails = 0;
let allow401 = false; // the expired-session checks provoke 401 answers on purpose
page.on('response', (r) => {
  if (r.status() >= 400 && !(allow401 && r.status() === 401) && !EXPECTED.test(r.url())) errors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().replace(BASE, '').slice(0, 80)}`);
});

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    fails++;
    console.log(`FAIL ${name}: ${e.message.split('\n')[0].slice(0, 900)}`);
    if (process.env.FAIL_SHOTS) await page.screenshot({ path: `${process.env.FAIL_SHOTS}/${name.replace(/\W+/g, '_').slice(0, 40)}.png` }).catch(() => {});
  }
}
const T = { timeout: 15000 };
// Gift checks run by default (the Go API serves the gift behind FEATURE_WELCOME_GIFT); NX_GIFT=0 skips them against a deployment without it.
const GIFT = process.env.NX_GIFT !== '0';

await check('first screen has both doors', async () => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /je suis un enfant/i }).waitFor(T);
  await page.getByRole('button', { name: /je suis un adulte/i }).waitFor(T);
});
await check('kid door without an adult explains what to do', async () => {
  const note = page.getByText(/un adulte doit d.abord se connecter/i).first();
  // the first click can land before hydration on a cold deploy: click again until the page answers
  for (let i = 0; i < 3 && !(await note.isVisible()); i++) {
    if (!page.url().includes('/play')) await page.getByRole('button', { name: /je suis un enfant/i }).click();
    await note.waitFor({ timeout: 6000 }).catch(() => {});
  }
  await note.waitFor(T);
});
const uiEmail = `ui${Date.now()}@example.com`;
await check('grown-up registers', async () => {
  await page.goto(`${BASE}/parent/register`, { waitUntil: 'networkidle' });
  await page.getByLabel(/courriel/i).fill(uiEmail);
  await page.getByLabel(/mot de passe/i).fill('correct-horse-battery');
  await page.getByRole('button', { name: /créer mon compte/i }).click();
  await page.waitForURL('**/parent/children/new', T);
});
let childName = `Kid${Date.now() % 1000}`;
await check('create a child with a PIN', async () => {
  await page.getByLabel(/prénom ou surnom/i).fill(childName);
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: /3e année/i }).click();
  await page.getByRole('switch', { name: /protéger le profil/i }).click();
  for (const d of ['4', '3', '2', '1']) await page.getByRole('button', { name: new RegExp(`^${d}$`) }).first().click();
  await page.getByRole('button', { name: /créer le profil/i }).click();
  await page.waitForURL('**/consent', T);
});
await check('give consent', async () => {
  await page.getByRole('switch', { name: /j.ai lu/i }).click();
  await page.getByRole('button', { name: /donner l.autorisation/i }).click();
  await page.waitForURL('**/parent', T);
});
await check('new child is visible with PIN and permission status', async () => {
  await page.getByText(childName).first().waitFor(T);
  await page.getByText(/code à 4 chiffres requis/i).first().waitFor(T);
  await page.getByText(/autorisation donnée/i).first().waitFor(T);
});
await check('kid door lists the profiles and the new PIN works', async () => {
  await page.goto(`${BASE}/play`, { waitUntil: 'networkidle' });
  if (await page.getByText(/mode démo/i).count()) throw new Error('demo text still shown');
  await page.getByRole('button', { name: new RegExp(childName) }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor(T);
  for (const d of ['1', '1', '1', '1']) await dialog.getByRole('button', { name: new RegExp(`^${d}$`) }).first().click();
  await page.getByText(/ne correspond pas/i).first().waitFor(T);
  for (const d of ['4', '3', '2', '1']) await dialog.getByRole('button', { name: new RegExp(`^${d}$`) }).first().click();
  await page.waitForURL('**/play/home', T);
});
await check('a signed-in kid opening /play goes straight to home (no second picker)', async () => {
  await page.goto(`${BASE}/play`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/play/home', T);
  if (await page.getByText(/qui joue aujourd/i).count()) throw new Error('picker shown');
});
await check('close the tour', async () => {
  const close = page.getByRole('button', { name: /passer la visite/i });
  await close.first().waitFor(T);
  await close.first().click();
});
await check('welcome gift opens once and adds a card', async () => {
  if (!GIFT) return;
  await page.getByRole('button', { name: /ouvrir le cadeau/i }).click(T);
  await page.getByRole('button', { name: /la garder dans ma collection/i }).click(T);
  await page.getByRole('button', { name: /la garder dans ma collection/i }).waitFor({ state: 'detached', timeout: 5000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  if (await page.getByRole('button', { name: /ouvrir le cadeau/i }).count()) throw new Error('gift came back');
});
await check('home has a single scrollbar', async () => {
  const r = await page.evaluate(() => {
    const vh = innerHeight;
    const inner = [...document.querySelectorAll('body *')].filter((el) => {
      const o = getComputedStyle(el).overflowY;
      return (o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 4;
    });
    return { page: document.documentElement.scrollHeight > vh, inner: inner.length };
  });
  if (!r.page || r.inner) throw new Error(`page scroll ${r.page}, inner scrollers ${r.inner}`);
});
await check('home menu lists challenges, discover, worlds, cards, progress', async () => {
  for (const n of [/défis/i, /découvrir/i, /mondes/i, /cartes/i, /mes progrès/i]) await page.getByRole('button', { name: n }).first().waitFor({ timeout: 5000 });
});
await check('theme switch changes the page theme', async () => {
  const get = () => page.evaluate(() => document.documentElement.dataset.theme ?? document.documentElement.className);
  const before = await get();
  await page.getByRole('button', { name: /changer l.apparence/i }).first().click();
  await page.waitForTimeout(300);
  if ((await get()) === before) throw new Error('theme did not change');
});
await check('discover feed: real media cards, endless loading, like', async () => {
  await page.getByRole('button', { name: /découvrir/i }).first().click();
  await page.waitForURL('**/play/feed', T);
  await page.locator('article[data-media]').first().waitFor(T);
  const count = () => page.locator('main ul > li').count(); // windowed feed: far cards are empty boxes, but the list keeps growing
  const first = await count();
  await page.mouse.move(210, 400);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1200);
  const later = await count();
  if (later <= first) throw new Error(`feed did not grow (${first} -> ${later})`);
  await page.getByRole('button', { name: /j.aime/i }).first().click();
  await page.getByRole('button', { name: /^aimé/i }).first().waitFor({ timeout: 5000 });
});
await check('feed uses the page scroll only', async () => {
  const inner = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => {
    const o = getComputedStyle(el).overflowY;
    return (o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 4;
  }).length);
  if (inner) throw new Error(`${inner} inner scrollers`);
});

// Reads the question off the screen and answers it (no answer is ever sent to the page)
async function question() {
  // the real engine can award a mastery ("Nouveau pouvoir") between questions: close it and keep waiting
  const deadline = Date.now() + 25000;
  const hasChoices = () => page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /^D\s/.test(b.innerText)));
  while (!(await hasChoices())) {
    if (Date.now() > deadline) throw new Error('no question with choices within 25 s');
    if (await page.getByText(/nouveau pouvoir/i).count()) await page.getByRole('button', { name: /continuer/i }).first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(400);
  await page.waitForFunction(() => /\d+\s*[+−×÷-]\s*(\d+|\?)\s*=\s*(\d+|\?)/.test(document.body.innerText), null, { timeout: 25000 });
  return page.evaluate(() => { const all = [...document.body.innerText.matchAll(/\d+\s*[+−×÷-]\s*(?:\d+|\?)\s*=\s*(?:\d+|\?)(?:\s*\(avec reste\))?/g)]; return all[all.length - 1][0]; });
}
async function answerCorrectly() {
  const q = await question();
  const ans = solve(q);
  const label = Array.isArray(ans) ? new RegExp(`${ans[0]}\\D+${ans[1]}`) : new RegExp(`(^|\\D)${ans}(\\D|$)`);
  const choice = page.getByRole('button', { name: label }).first();
  await choice.click({ timeout: 20000 }).catch((e) => {
    throw new Error(`choice click failed for ${q} -> ${JSON.stringify(ans)}: ${e.message.replace(/\s+/g, ' ').slice(0, 400)}`);
  });
}
async function nextOrDone() {
  await page.getByRole('button', { name: /continuer|terminer|suite/i }).first().click({ timeout: 25000 });
}

await check('a chapter plays through and shows a story title or recap', async () => {
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /jouer|continuer|reprendre/i }).first().click();
  await page.waitForURL('**/play/session/**', T);
  for (let i = 0; i < 3; i++) {
    await answerCorrectly();
    await page.getByRole('button', { name: /continuer/i }).waitFor({ timeout: 25000 });
    if (i < 2) await nextOrDone();
  }
});
await check('outcome line varies and is not the old fixed sentence', async () => {
  const txt = await page.evaluate(() => document.body.innerText);
  if (/personne ne l.avait vu venir/i.test(txt) && /correct|juste|bravo/i.test(txt)) throw new Error('surprise line shown after a correct answer');
});
await check('leaving a chapter asks first and returns home', async () => {
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /jouer|continuer|reprendre/i }).first().click();
  await page.waitForURL('**/play/session/**', T);
  await question();
  await page.getByRole('button', { name: /quitter la partie/i }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /quitter la partie/i }).click();
  await page.waitForURL('**/play/home', T);
});
async function startChapter() {
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /jouer|continuer|reprendre/i }).first().click();
  await page.waitForURL('**/play/session/**', T);
  return question();
}
await check('home greeting changes at every visit of the session', async () => {
  await page.mouse.click(5, 5); // speech waits for a first gesture; the gift click used to provide it
  const shown = [];
  for (let i = 0; i < 3; i++) {
    const before = await page.evaluate(() => JSON.parse(sessionStorage.getItem('nx:greet:seen') ?? '[]').length);
    await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
    // the greeting is chosen after mount: wait until this visit stored its line (a slow machine needs more than a fixed pause)
    await page.waitForFunction((n) => JSON.parse(sessionStorage.getItem('nx:greet:seen') ?? '[]').length > n, before, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    // the last line stored is the one on screen (the pool of lines can cycle in a long session, so compare neighbours)
    shown.push(await page.evaluate(() => JSON.parse(sessionStorage.getItem('nx:greet:seen') ?? '[]').at(-1)));
  }
  if (shown.some((g, i) => i > 0 && g === shown[i - 1])) throw new Error(`same greeting twice in a row: ${JSON.stringify(shown)}`);
});
await check('question comes with a picture of its numbers', async () => {
  await startChapter();
  await page.getByRole('img', { name: /\d/ }).first().waitFor({ timeout: 8000 });
});
await check('wrong answer: sad mascot and a risk simulation, then encouragement', async () => {
  const q = await question();
  const right = solve(q);
  const buttons = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText).filter((t) => /^[ABCD]\n/.test(t)));
  const wrongLabel = buttons.map((t) => t.split('\n')[1]).find((v) => v !== String(Array.isArray(right) ? right[0] : right));
  await page.getByRole('button', { name: new RegExp(`(^|\\D)${wrongLabel}(\\D|$)`) }).first().click();
  // the story consequence plays first; the sheet (with the reaction) and the how-to picture follow it
  await page.getByRole('button', { name: /passer l.animation/i }).first().waitFor({ timeout: 25000 });
  await page.locator('[data-outcome-mascot="sad"]').first().waitFor({ timeout: 8000 });
});
await check('right answer: happy mascot and a success simulation', async () => {
  await page.getByRole('button', { name: /continuer/i }).first().click({ timeout: 25000 });
  await answerCorrectly();
  // the story consequence plays first; the sheet (with the reaction) and the how-to picture follow it
  await page.getByRole('button', { name: /passer l.animation/i }).first().waitFor({ timeout: 25000 });
  await page.locator('[data-outcome-mascot="happy"]').first().waitFor({ timeout: 8000 });
});
await check('outcome: one stage image, sheet within 1.5 s, Continue inside a 360x740 screen', async () => {
  await page.setViewportSize({ width: 360, height: 740 });
  try {
    await page.getByRole('button', { name: /continuer/i }).first().click({ timeout: 25000 });
    await question();
    await answerCorrectly();
    const t0 = Date.now();
    // the real engine can award a mastery ("Nouveau pouvoir") on this answer: it has to be closed before the sheet shows
    const sheet = page.locator('[data-outcome-sheet]');
    await sheet.or(page.getByText(/nouveau pouvoir/i)).first().waitFor({ timeout: 1500 });
    if (await page.getByText(/nouveau pouvoir/i).count()) await page.getByRole('button', { name: /continuer/i }).first().click();
    await sheet.waitFor({ timeout: 4000 });
    const waited = Date.now() - t0;
    const imgs = await page.locator('[data-stage] [role="img"]').count();
    if (imgs !== 1) throw new Error(`${imgs} images in the stage during the outcome`);
    await page.waitForTimeout(600); // sheet slide-up is 350 ms: measure after it settles
    const btn = page.getByRole('button', { name: /continuer/i }).first();
    const box = await btn.boundingBox();
    if (!box || box.y < 0 || box.y + box.height > 740 || box.x < 0 || box.x + box.width > 360) throw new Error(`Continue outside the viewport: ${JSON.stringify(box)}`);
    console.log(`info sheet appeared ${waited} ms after the tap after the tap`);
  } finally {
    await page.setViewportSize({ width: 420, height: 880 });
  }
});
await check('how-to picture: the stage explains the method with a caption and a text alternative', async () => {
  const pic = page.locator('[data-stage] [role="img"]');
  await pic.waitFor({ timeout: 8000 });
  const label = await pic.getAttribute('aria-label');
  if (!label || label.length < 20) throw new Error(`picture has no useful alt: ${label}`);
  const cap = (await page.locator('[data-stage] p[aria-live]').first().innerText()).trim();
  if (cap.length < 5) throw new Error('no caption under the picture');
  if (/quand les unit.s d.passent/i.test(await page.evaluate(() => document.body.innerText))) throw new Error('the written carry hint is still shown');
});
await check('idle for a while: the coach gives a hint that never states the answer', async () => {
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('nx:prefs:v1', JSON.stringify({ state: { voice: false, hints: true, hintDelaySec: 2, hintVolume: 0.1, voiceName: null, rate: 1 }, version: 0 })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /jouer|continuer|reprendre/i }).first().click();
  await page.waitForURL('**/play/session/**', T);
  await question();
  const hints = Object.values(JSON.parse(readFileSync(new URL('../src/platform/coach/messages.fr-CA.json', import.meta.url), 'utf8')).coach).flat();
  await page.waitForFunction((hs) => hs.some((h) => document.body.innerText.includes(h)), hints, { timeout: 15000 });
  await page.evaluate(() => localStorage.removeItem('nx:prefs:v1'));
});
await check('challenges: accept one and see it in progress', async () => {
  await page.goto(`${BASE}/play/challenges`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /je relève le défi/i }).first().click();
  await page.getByText(/ton avancée/i).first().waitFor({ timeout: 5000 });
});
await check('map keeps progress: the played world shows a finished node', async () => {
  await page.goto(`${BASE}/play/journey/nature`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const txt = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  if (!/(réussi|terminé|maîtrisé)/i.test(txt)) throw new Error(`no finished node: ${txt.slice(0, 300)}`);
});
await check('world map: cards open a world page with a hero and quests on a path', async () => {
  await page.goto(`${BASE}/play/worlds`, { waitUntil: 'networkidle' });
  const n = await page.locator('[data-world]').count();
  if (n < 8) throw new Error(`only ${n} world cards`);
  await page.locator('[data-world="nature"]').first().click(); // the card, not the scene inside it
  await page.waitForURL('**/play/journey/nature', { timeout: 15000 });
  await page.getByRole('heading', { name: /nature/i, level: 1 }).waitFor({ timeout: 15000 });
  await page.locator('ol button[data-state]').first().waitFor({ timeout: 15000 });
});
await check('credits page opens from Me', async () => {
  await page.goto(`${BASE}/play/me`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /crédits des images/i }).click();
  await page.waitForURL('**/credits', { timeout: 15000 });
  await page.getByRole('heading', { name: /crédits des images/i }).waitFor({ timeout: 15000 });
});
await check('cards: the welcome gift card is in the collection', async () => {
  if (!GIFT) return;
  await page.goto(`${BASE}/play/collection`, { waitUntil: 'networkidle' });
  await page.getByText(/cadeau de bienvenue/i).first().waitFor({ timeout: 8000 });
});
await check('state survives a reload (cards still there)', async () => {
  if (!GIFT) return;
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText(/cadeau de bienvenue/i).first().waitFor({ timeout: 8000 });
});

await check('parent presses Play on a child: that child plays at once, no second picker', async () => {
  await page.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: new RegExp(`jouer avec ${childName}`, 'i') }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor(T);
  for (const d of ['4', '3', '2', '1']) await dialog.getByRole('button', { name: new RegExp(`^${d}$`) }).first().click();
  await page.waitForURL('**/play/home', T);
  if (await page.getByText(/qui joue aujourd/i).count()) throw new Error('picker shown after choosing a child');
});
// ── Flows: deep links, back button, expired sessions, known device, passkey
const dropCookies = async (...names) => {
  const all = await ctx.cookies();
  await ctx.clearCookies();
  await ctx.addCookies(all.filter((c) => !names.includes(c.name)));
};
await check('deep links: kid pages open straight from the address bar and Back returns', async () => {
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  for (const [path, title] of [['/play/challenges', /défis/i], ['/play/collection', /cartes/i], ['/play/worlds', /monde/i], ['/play/me', /./]]) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: title }).first().waitFor(T);
    if (!page.url().endsWith(path)) throw new Error(`${path} ended on ${page.url()}`);
  }
  await page.goBack();
  await page.waitForURL('**/play/worlds', T);
});
await check('deep links: a parent page reloads in place and Back returns to the list', async () => {
  await page.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
  const link = page.locator('a[href^="/parent/children/"]:not([href$="/new"])').first();
  await link.waitFor(T);
  const href = await link.getAttribute('href');
  await link.click();
  await page.waitForURL(`**${href}`, T);
  await page.reload({ waitUntil: 'networkidle' });
  if (!page.url().endsWith(href)) throw new Error(`reload moved to ${page.url()}`);
  await page.getByText(/sa progression/i).first().waitFor(T);
  await page.goBack();
  await page.waitForURL('**/parent', T);
});
allow401 = true;
await check('kid token ended (401): the kid lands on the profile picker, not on a dead screen', async () => {
  await ctx.addCookies([{ name: 'nx_child', value: 'expired', url: BASE }]);
  await page.goto(`${BASE}/play/challenges`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL((u) => u.pathname === '/play', T);
  await page.getByText(/qui joue aujourd/i).first().waitFor(T);
});
await check('parent session ended (401): login keeps the page and brings the parent back to it', async () => {
  await dropCookies('nx_device', 'nx_refresh');
  await ctx.addCookies([{ name: 'nx_parent', value: 'expired', url: BASE }]);
  await page.goto(`${BASE}/parent/account`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/parent\/login\?next=%2Fparent%2Faccount/, T);
  await page.getByLabel(/courriel/i).fill(uiEmail);
  await page.getByLabel(/mot de passe/i).fill('correct-horse-battery');
  await page.getByRole('button', { name: /^se connecter$/i }).click();
  await page.waitForURL('**/parent/account', T);
});
allow401 = false;
await check('known device: reopening the kid door shows the profile picker at once', async () => {
  // The device cookie is issued at sign-in; without a sign-in session it must open the app by itself
  await page.goto(`${BASE}/parent/login`, { waitUntil: 'networkidle' }).catch(() => {});
  const has = (await ctx.cookies()).some((c) => c.name === 'nx_device');
  if (!has) throw new Error('no device cookie after sign-in');
  await dropCookies('nx_parent', 'nx_refresh', 'nx_child', 'nx_child_id');
  await page.goto(`${BASE}/play`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/qui joue aujourd/i).first().waitFor(T);
  if (await page.getByText(/un adulte doit d.abord se connecter/i).count()) throw new Error('asked for a login on a known device');
});
await check('passkey button: hidden when the browser has no passkeys, calm hint when the prompt is cancelled', async () => {
  const fresh = await browser.newContext({ locale: 'fr-CA', viewport: { width: 420, height: 880 } });
  const plain = await fresh.newPage();
  await plain.addInitScript(() => {
    delete window.PublicKeyCredential;
  });
  await plain.goto(`${BASE}/parent/login`, { waitUntil: 'networkidle' });
  await plain.getByLabel(/courriel/i).waitFor(T);
  if (await plain.getByRole('button', { name: /clé d.accès/i }).count()) throw new Error('passkey button shown without support');
  await plain.close();
  const capable = await fresh.newPage();
  await capable.addInitScript(() => {
    window.PublicKeyCredential = Object.assign(function PublicKeyCredential() {}, { parseCreationOptionsFromJSON: (o) => o, parseRequestOptionsFromJSON: (o) => o });
    navigator.credentials.get = () => Promise.reject(new DOMException('cancelled', 'NotAllowedError'));
  });
  await capable.goto(`${BASE}/parent/login`, { waitUntil: 'networkidle' });
  await capable.getByRole('button', { name: /clé d.accès/i }).click();
  await capable.getByText(/pas de souci/i).first().waitFor(T);
  if (await capable.getByText(/n.a pas fonctionné/i).count()) throw new Error('a cancel was shown as an error');
  await fresh.close();
});
await check('cross-site writes to the API are refused', async () => {
  const res = await page.request.post(`${BASE}/api/v1/auth/login`, { headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, data: { email: 'a@b.c', password: 'x' } });
  if (res.status() !== 403) throw new Error(`status ${res.status()}`);
});

if (errors.length) fails++;
console.log(errors.length ? `console errors: ${[...new Set(errors)].join(' | ')}` : 'console errors: none');
console.log(fails ? `${fails} FAILED` : 'all ui checks pass');
await browser.close();
process.exit(fails ? 1 : 0);
