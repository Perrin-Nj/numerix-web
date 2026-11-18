// Password reset flows against a local stack: Go API, parent app and admin app.
// Usage: WEB=http://localhost:3201 API=http://localhost:8091 ADMIN_URL=http://localhost:3101 ADMIN_TOKEN=... ADMIN_PASSWORD=... node scripts/qa/password-reset.mjs
// One line per check; screenshots go to specs/002-password-reset/evidence.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const WEB = (process.env.WEB ?? 'http://localhost:3201').replace(/\/$/, '');
const API = (process.env.API ?? 'http://localhost:8091').replace(/\/$/, '');
const ADMIN_URL = (process.env.ADMIN_URL ?? 'http://localhost:3101').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'dev-admin-token-1234';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'test-password-123';
const SHOTS = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../specs/002-password-reset/evidence');
mkdirSync(SHOTS, { recursive: true });

let fails = 0;
const ok = (n, c, x = '') => {
  console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${c ? '' : ' ' + x}`);
  if (!c) fails++;
};
const run = Date.now();
let ipN = 0;
const nextIp = () => `10.${(run >>> 8) % 250}.${run % 250}.${++ipN}`; // each scenario is its own visitor for the API limits
const OLD = 'old-password-123';
const NEW = 'brand-new-password-456';

async function register(email) {
  const r = await fetch(`${API}/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': nextIp() },
    body: JSON.stringify({ email, password: OLD, locale: 'en-CA' }),
  });
  if (!r.ok) throw new Error(`register ${r.status} ${await r.text()}`);
}
const adminHeaders = { authorization: `Bearer ${ADMIN_TOKEN}`, 'x-admin-actor': 'qa' };
async function parentId(email) {
  const r = await fetch(`${API}/admin/v1/parents?q=${encodeURIComponent(email)}`, { headers: adminHeaders });
  return (await r.json()).items[0].id;
}
async function mkCode(id) {
  const r = await fetch(`${API}/admin/v1/parents/${id}/password-reset`, { method: 'POST', headers: adminHeaders });
  const j = await r.json();
  return { status: r.status, ...j };
}
async function newParent(tag) {
  const email = `pw-${tag}-${run}@example.com`;
  await register(email);
  return { email, id: await parentId(email) };
}

const browser = await chromium.launch();
async function ctx(width = 390, height = 800, scheme = 'light') {
  const c = await browser.newContext({ locale: 'en-CA', viewport: { width, height }, colorScheme: scheme, extraHTTPHeaders: { 'x-forwarded-for': nextIp() } });
  await c.addCookies([{ name: 'NEXT_LOCALE', value: 'en-CA', url: WEB }]);
  return c;
}
async function fillReset(page, { email, code, pw, confirm }) {
  await page.locator('#reset-email').fill(email);
  await page.locator('#reset-code').fill(code);
  await page.locator('#new-password').fill(pw);
  await page.locator('#confirm-password').fill(confirm ?? pw);
}
const submit = (page) => page.getByRole('button', { name: /save my new password/i }).click();
async function signIn(page, email, pw) {
  await page.goto(`${WEB}/parent/login`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(pw);
  await page.getByRole('button', { name: /^log in$/i }).click();
  return Promise.race([
    page.waitForURL(/\/parent(\/children.*)?$/, { timeout: 15000 }).then(() => true),
    page.getByText(/wrong email or password/i).waitFor({ timeout: 15000 }).then(() => false),
  ]).catch(() => null);
}

try {
  // 1. login link, page meta
  {
    const c = await ctx();
    const page = await c.newPage();
    await page.goto(`${WEB}/parent/login`, { waitUntil: 'networkidle' });
    const link = page.getByRole('link', { name: /forgot your password/i });
    ok('login shows the forgot link under the password field', (await link.count()) === 1);
    await link.click();
    await page.waitForURL('**/parent/reset');
    ok('link opens /parent/reset', /\/parent\/reset$/.test(page.url()));
    ok('reset page is noindex', (await page.locator('meta[name=robots]').getAttribute('content'))?.includes('noindex'));
    ok('reset page sends no referrer', (await page.locator('meta[name=referrer]').getAttribute('content')) === 'no-referrer');
    ok('how it works and support contact are shown', (await page.getByText(/ask the numerix team for a reset code/i).count()) === 1 && (await page.getByRole('link', { name: /@/ }).count()) === 1);
    const attrs = await page.evaluate(() => ({ p: document.getElementById('new-password').autocomplete, c: document.getElementById('confirm-password').autocomplete, m: document.getElementById('reset-code').inputMode }));
    ok('password managers: new-password on both fields, numeric code keypad', attrs.p === 'new-password' && attrs.c === 'new-password' && attrs.m === 'numeric', JSON.stringify(attrs));
    await c.close();
  }

  // 2. happy path, old fails, new works, code reuse fails
  {
    const { email, id } = await newParent('happy');
    const code = await mkCode(id);
    const digits = code.code.replace(/\D/g, '');
    ok('admin endpoint gives an 8 digit code valid 1 hour', code.status === 201 && /^\d{4}-?\d{4}$/.test(code.code) && code.expires_in_seconds === 3600 && code.parent.email === email, JSON.stringify(code));
    const c = await ctx();
    const page = await c.newPage();
    await page.goto(`${WEB}/parent/reset`, { waitUntil: 'networkidle' });
    await page.locator('#reset-code').fill(`${digits.slice(0, 4)} ${digits.slice(4)}`);
    ok('code field shows NNNN-NNNN', (await page.locator('#reset-code').inputValue()) === `${digits.slice(0, 4)}-${digits.slice(4)}`);
    await fillReset(page, { email, code: code.code, pw: NEW });
    await page.screenshot({ path: `${SHOTS}/form-filled-390.png` });
    await submit(page);
    await page.getByRole('heading', { name: /password changed/i }).waitFor({ timeout: 15000 }).catch(async (e) => { console.log(await page.locator('main').innerText()); throw e; });
    ok('success screen "Password changed"', true);
    ok('no auto login: no parent cookie after reset', !(await c.cookies()).some((k) => k.name === 'nx_parent'));
    ok('nothing stored in the browser', await page.evaluate(() => !JSON.stringify({ ...localStorage, ...sessionStorage }).match(/\d{4}-?\d{4}|brand-new/)));
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.waitForURL('**/parent/login');
    ok('success goes to login', true);
    ok('OLD password no longer works', (await signIn(page, email, OLD)) === false);
    ok('NEW password works', (await signIn(page, email, NEW)) === true);
    await c.close();

    // reuse
    const c2 = await ctx();
    const p2 = await c2.newPage();
    await p2.goto(`${WEB}/parent/reset`, { waitUntil: 'networkidle' });
    await fillReset(p2, { email, code: code.code, pw: 'another-password-789' });
    await submit(p2);
    await p2.getByText(/this code is not valid/i).waitFor({ timeout: 15000 });
    ok('reusing the code shows the friendly error', true);
    ok('error text mentions 5 wrong tries', (await p2.getByText(/after 5 wrong tries/i).count()) === 1);
    await c2.close();
  }

  // 3. wrong code, then 5 wrong tries burn the real code
  {
    const { email, id } = await newParent('burn');
    const { code } = await mkCode(id);
    const wrong = code === '00000000' ? '11111111' : '00000000';
    const c = await ctx();
    const page = await c.newPage();
    await page.goto(`${WEB}/parent/reset`, { waitUntil: 'networkidle' });
    for (let i = 0; i < 5; i++) {
      await fillReset(page, { email, code: wrong, pw: NEW });
      await submit(page);
      await page.getByText(/this code is not valid/i).waitFor({ timeout: 15000 });
      if (i === 0) {
        ok('wrong code shows the friendly error', true);
        await page.screenshot({ path: `${SHOTS}/wrong-code-390.png` });
      }
      await page.waitForTimeout(250);
    }
    await fillReset(page, { email, code, pw: NEW });
    await submit(page);
    await page.getByText(/this code is not valid/i).waitFor({ timeout: 15000 });
    ok('after 5 wrong tries the right code is burned', true);
    ok('and the password did not change', (await signIn(page, email, OLD)) === true);
    // a new code from the admin works again
    const again = await mkCode(id);
    await page.goto(`${WEB}/parent/reset`, { waitUntil: 'networkidle' });
    await fillReset(page, { email, code: again.code, pw: NEW });
    await submit(page);
    await page.getByRole('heading', { name: /password changed/i }).waitFor({ timeout: 15000 });
    ok('a new code from the team works after a burn', true);
    await c.close();
  }

  // 4. client checks: short password, mismatch, incomplete code, bad email. No request leaves the page.
  {
    const c = await ctx();
    const page = await c.newPage();
    let posts = 0;
    page.on('request', (r) => r.url().includes('/auth/password/reset') && posts++);
    await page.goto(`${WEB}/parent/reset`, { waitUntil: 'networkidle' });
    await fillReset(page, { email: 'a@example.com', code: '1234-5678', pw: 'short' });
    await submit(page);
    ok('short password: inline error', (await page.getByText('The password needs at least 10 characters.').count()) >= 1);
    ok('live counter says 5 of 10', (await page.getByText('5 of 10 characters').count()) === 1);
    await page.locator('#new-password').fill('long-enough-password');
    await page.locator('#confirm-password').fill('different-password');
    await submit(page);
    ok('mismatched confirm: inline error', (await page.getByText('The two passwords are not the same.').count()) >= 1);
    await page.locator('#reset-code').fill('12');
    await page.locator('#reset-email').fill('nope');
    await submit(page);
    ok('bad email and short code: inline errors', (await page.getByText(/enter a valid email/i).count()) === 1 && (await page.getByText(/8 digits of your code/i).count()) === 1);
    ok('none of it reached the server', posts === 0, String(posts));
    await page.getByRole('button', { name: /show passwords/i }).click();
    ok('show passwords toggles the field type', (await page.locator('#new-password').getAttribute('type')) === 'text');
    await c.close();
  }

  // 5. server password policy keeps the code (422 shown inline)
  {
    const { email, id } = await newParent('policy');
    const { code } = await mkCode(id);
    const c = await ctx();
    const page = await c.newPage();
    await page.route('**/api/v1/auth/password/reset', (r) => r.fulfill({ status: 422, contentType: 'application/problem+json', body: JSON.stringify({ title: 'x', status: 422, code: 'validation_failed' }) }));
    await page.goto(`${WEB}/parent/reset`, { waitUntil: 'networkidle' });
    await fillReset(page, { email, code, pw: NEW });
    await submit(page);
    await page.getByText(/not accepted/i).waitFor({ timeout: 10000 });
    ok('policy error (422) shown inline', true);
    await c.close();
  }

  // 6. rate limited message, network error
  {
    const c = await ctx();
    const page = await c.newPage();
    await page.route('**/api/v1/auth/password/reset', (r) => r.fulfill({ status: 429, headers: { 'retry-after': '600' }, contentType: 'application/problem+json', body: JSON.stringify({ title: 'x', status: 429, code: 'rate_limited' }) }));
    await page.goto(`${WEB}/parent/reset`, { waitUntil: 'networkidle' });
    await fillReset(page, { email: 'a@example.com', code: '12345678', pw: NEW });
    await submit(page);
    await page.getByText(/try again in 10 minutes/i).waitFor({ timeout: 10000 });
    ok('rate limit (429) shows a calm message with the wait', true);
    await page.screenshot({ path: `${SHOTS}/rate-limited-390.png` });
    await page.unroute('**/api/v1/auth/password/reset');
    await page.route('**/api/v1/auth/password/reset', (r) => r.abort());
    await page.route('**/api/health', (r) => r.abort());
    await submit(page);
    await page.getByText(/no connection|network/i).first().waitFor({ timeout: 15000 });
    ok('network failure shows a retryable message', true);
    await c.close();
  }

  // 7. real per-IP limit from the API (10 attempts per 15 minutes) reaches the screen as the calm message
  {
    const c = await browser.newContext({ locale: 'en-CA', extraHTTPHeaders: { 'x-forwarded-for': nextIp() } });
    await c.addCookies([{ name: 'NEXT_LOCALE', value: 'en-CA', url: WEB }]);
    const page = await c.newPage();
    await page.goto(`${WEB}/parent/reset`, { waitUntil: 'networkidle' });
    let limited = false;
    for (let i = 0; i < 14 && !limited; i++) {
      await fillReset(page, { email: `nobody${i}@example.com`, code: '12345678', pw: NEW });
      await submit(page);
      limited = await page.getByText(/a lot of tries/i).waitFor({ timeout: 4000 }).then(() => true, () => false);
    }
    ok('real API rate limit shows the calm message', limited);
    await c.close();
  }

  // 8. screenshots at 320 and 1280, light and dark
  for (const [w, h] of [[320, 700], [1280, 800]]) {
    for (const scheme of ['light', 'dark']) {
      const c = await ctx(w, h, scheme);
      const page = await c.newPage();
      await page.goto(`${WEB}/parent/reset`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      ok(`no horizontal scroll at ${w}px ${scheme}`, !overflow);
      await page.screenshot({ path: `${SHOTS}/reset-${w}-${scheme}.png`, fullPage: true });
      await c.close();
    }
  }
  {
    const c = await ctx(320, 700);
    const page = await c.newPage();
    await page.goto(`${WEB}/parent/login`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${SHOTS}/login-320.png`, fullPage: true });
    await c.close();
  }

  // 9. keyboard only: tab through, submit with Enter
  {
    const { email, id } = await newParent('kbd');
    const { code } = await mkCode(id);
    const c = await ctx();
    const page = await c.newPage();
    await page.goto(`${WEB}/parent/reset`, { waitUntil: 'networkidle' });
    ok('email field has focus on load', (await page.evaluate(() => document.activeElement?.id)) === 'reset-email');
    await page.keyboard.type(email);
    await page.keyboard.press('Tab');
    await page.keyboard.type(code.replace(/\D/g, ''));
    await page.keyboard.press('Tab');
    await page.keyboard.type(NEW);
    await page.keyboard.press('Tab');
    await page.keyboard.type(NEW);
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: /password changed/i }).waitFor({ timeout: 15000 });
    ok('whole reset works with the keyboard only', true);
    ok('success button has focus', (await page.evaluate(() => document.activeElement?.textContent)) === 'Sign in');
    await c.close();
  }

  // 10. admin dialog smoke, then the parent spends the code the dialog showed
  {
    const { email, id } = await newParent('admin');
    const c = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'], extraHTTPHeaders: { 'x-forwarded-for': nextIp() } });
    const page = await c.newPage();
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^EN$|^FR$/ }).first().click().catch(() => {});
    await page.locator('input[type=password]').fill(ADMIN_PASSWORD);
    await page.locator('input:not([type=password])').first().fill('qa').catch(() => {});
    await page.locator('button[type=submit]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
    await page.goto(`${ADMIN_URL}/parents/${id}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /reset password|réinitialiser le mot de passe/i }).click();
    const confirm = page.getByRole('dialog');
    await confirm.waitFor();
    ok('admin asks for confirmation first and explains it', /1 hour|1 heure/.test(await confirm.innerText()) && (await page.getByTestId('reset-code').count()) === 0);
    await confirm.getByRole('button', { name: /create the code|créer le code/i }).click();
    const shown = page.getByTestId('reset-code');
    await shown.waitFor({ timeout: 15000 });
    const text = (await shown.innerText()).trim();
    ok('dialog shows the code as NNNN-NNNN', /^\d{4}-\d{4}$/.test(text), text);
    const dialogText = await page.getByRole('dialog').innerText();
    ok('dialog shows email, validity, warning and audit note', dialogText.includes(email) && /1 hour|1 heure/.test(dialogText) && /5 wrong tries|5 essais/.test(dialogText) && /audit/i.test(dialogText));
    await page.getByRole('button', { name: /^copy$|^copier$/i }).click();
    ok('Copy puts the code on the clipboard', (await page.evaluate(() => navigator.clipboard.readText())) === text);
    await page.screenshot({ path: `${SHOTS}/admin-dialog-1280.png` });
    await page.getByRole('button', { name: /^done$|^terminé$/i }).click();
    ok('closing the dialog removes the code from the page', (await page.getByText(text).count()) === 0);
    await c.close();

    const c2 = await ctx();
    const p2 = await c2.newPage();
    await p2.goto(`${WEB}/parent/reset`, { waitUntil: 'networkidle' });
    await fillReset(p2, { email, code: text, pw: NEW });
    await submit(p2);
    await p2.getByRole('heading', { name: /password changed/i }).waitFor({ timeout: 15000 });
    ok('parent resets with the code the admin dialog showed', true);
    await c2.close();
  }
} catch (e) {
  console.log('FAIL script error', e?.stack ?? e);
  fails++;
}
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all password reset checks pass');
process.exit(fails ? 1 : 0);
