// Shared by play-tour and play-checks: signs the demo parent in, opens the kid door and enters with the child PIN.
// Needs the demo account of scripts/seed-dev.mjs (demo@numerix.dev, children Zoé 1234 and Noé 4321).
export const EMAIL = 'demo@numerix.dev';
export const PASSWORD = 'correct-horse-battery';
const T = { timeout: 20000 };

export async function parentLogin(page, base) {
  await page.goto(`${base}/parent/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/courriel|e-mail|email/i).first().fill(EMAIL);
  await page.getByLabel(/mot de passe|password/i).first().fill(PASSWORD);
  await page.getByRole('button', { name: /se connecter|log in|sign in/i }).first().click();
  await page.waitForURL('**/parent', T);
}

export async function kidEnter(page, base, name = 'Noé', pin = '4321') {
  await page.goto(`${base}/play`, { waitUntil: 'networkidle' });
  if (!/\/play\/home/.test(page.url())) {
    await page.getByRole('button', { name: new RegExp(name) }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor(T);
    for (const d of pin) await dialog.getByRole('button', { name: new RegExp(`^${d}$`) }).first().click();
    await page.waitForURL('**/play/home', T);
  }
  // the first-visit tour would cover the screen
  const skip = page.getByRole('button', { name: /passer la visite|skip the tour/i });
  if (await skip.count()) await skip.first().click().catch(() => {});
}
