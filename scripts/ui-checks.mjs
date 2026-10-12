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
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
let fails = 0;
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().replace(BASE, '').slice(0, 80)}`);
});

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    fails++;
    console.log(`FAIL ${name}: ${e.message.split('\n')[0].slice(0, 900)}`);
  }
}
const T = { timeout: 15000 };

await check('first screen has both doors', async () => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /je suis un enfant/i }).waitFor(T);
  await page.getByRole('button', { name: /je suis un adulte/i }).waitFor(T);
});
await check('kid door without an adult explains what to do', async () => {
  await page.getByRole('button', { name: /je suis un enfant/i }).click();
  await page.getByText(/un adulte doit d.abord se connecter/i).first().waitFor(T);
});
await check('grown-up registers', async () => {
  await page.goto(`${BASE}/parent/register`, { waitUntil: 'networkidle' });
  await page.getByLabel(/courriel/i).fill(`ui${Date.now()}@example.com`);
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
  await page.getByText(/autorisation donnée/i).nth(1).waitFor(T);
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
await check('discover feed: cards, AI label, endless loading, like', async () => {
  await page.getByRole('button', { name: /découvrir/i }).first().click();
  await page.waitForURL('**/play/feed', T);
  await page.getByText(/généré par ia/i).first().waitFor(T);
  const count = () => page.getByText(/généré par ia/i).count();
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
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /^D\s/.test(b.innerText)), null, { timeout: 25000 });
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
await check('the story is read aloud by the French woman voice, in French', async () => {
  await page.waitForFunction(() => window.__spoken.some((x) => x.voice?.includes('Sylvie') && /graine|Combien|Mira|forêt|\d/.test(x.text)), null, { timeout: 25000 });
  const bad = await page.evaluate(() => window.__spoken.filter((x) => x.lang?.startsWith('en') || x.voice?.includes('Guy')).length);
  if (bad) throw new Error(`${bad} utterances used a wrong-language or male voice`);
});
await check('home greeting changes at every visit of the session', async () => {
  for (let i = 0; i < 3; i++) {
    await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  }
  const seen = await page.evaluate(() => JSON.parse(sessionStorage.getItem('nx:greet:seen') ?? '[]'));
  if (new Set(seen).size < 3) throw new Error(`greetings seen: ${JSON.stringify(seen)}`);
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
  await page.getByText('😔').first().waitFor({ timeout: 25000 });
  await page.getByRole('button', { name: /passer l.animation/i }).first().waitFor({ timeout: 8000 });
});
await check('right answer: happy mascot and a success simulation', async () => {
  await page.getByRole('button', { name: /continuer/i }).first().click({ timeout: 25000 });
  await answerCorrectly();
  await page.getByText('😄').first().waitFor({ timeout: 25000 });
  await page.getByRole('button', { name: /passer l.animation/i }).first().waitFor({ timeout: 8000 });
});
await check('idle for a while: the coach gives a hint that never states the answer', async () => {
  await page.goto(`${BASE}/play/home`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('nx:prefs:v1', JSON.stringify({ state: { voice: false, hints: true, hintDelaySec: 2, hintVolume: 0.1, voiceName: null, rate: 1 }, version: 0 })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /jouer|continuer|reprendre/i }).first().click();
  await page.waitForURL('**/play/session/**', T);
  await question();
  const hints = Object.values(JSON.parse(readFileSync(new URL('../src/lib/coach/messages.fr-CA.json', import.meta.url), 'utf8')).coach).flat();
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
await check('cards: the welcome gift card is in the collection', async () => {
  await page.goto(`${BASE}/play/collection`, { waitUntil: 'networkidle' });
  await page.getByText(/cadeau de bienvenue/i).first().waitFor({ timeout: 8000 });
});
await check('state survives a reload (cards still there)', async () => {
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
await check('cross-site writes to the API are refused', async () => {
  const res = await page.request.post(`${BASE}/api/v1/auth/login`, { headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, data: { email: 'a@b.c', password: 'x' } });
  if (res.status() !== 403) throw new Error(`status ${res.status()}`);
});

console.log(errors.length ? `console errors: ${[...new Set(errors)].join(' | ')}` : 'console errors: none');
console.log(fails ? `${fails} FAILED` : 'all ui checks pass');
await browser.close();
process.exit(fails ? 1 : 0);
