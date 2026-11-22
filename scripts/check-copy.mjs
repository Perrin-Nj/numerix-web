// Copy policy: no em dashes in product text, messages or components; no stock AI phrasing.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src', import.meta.url));
const banned = [/—/, /\bas an ai\b/i, /\bdelve\b/i, /\bcertainly!/i, /fast-paced world/i];
const errors = [];
// keys whose text is legitimately the same sentence in both languages
const ALLOW_SAME = new Set([
  'screens.parent.settings.limitOption', // "{count} minutes" is spelled the same
  'screens.parent.account.locales.fr-CA', // a language is named in its own language
  'screens.parent.account.locales.en-CA',
  'screens.parent.subscription.method.card.hint', // card brand names
  'screens.parent.subscription.method.apple_pay.name',
  'screens.parent.subscription.method.google_pay.name',
  'game.scenePicture.item.musique', // "note" is the same word in both languages
]);
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (p.includes(join('i18n', 'generated')) || name === 'schema.d.ts') continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|json|mdx?)$/.test(name)) {
      readFileSync(p, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          for (const re of banned) if (re.test(line)) errors.push(`${p}:${i + 1} matches ${re}`);
        });
    }
  }
}
walk(root);

// Both languages: every message key exists in fr-CA and en-CA, and a sentence is not the same text in both.
const gen = (l) => JSON.parse(readFileSync(join(root, 'i18n', 'generated', `${l}.json`), 'utf8'));
const flat = (o, p = '', out = {}) => {
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'object' && v !== null) flat(v, `${p}${k}.`, out);
    else out[`${p}${k}`] = v;
  }
  return out;
};
const fr = flat(gen('fr-CA'));
const en = flat(gen('en-CA'));
for (const k of Object.keys(fr)) if (!(k in en)) errors.push(`message ${k} exists in fr-CA only`);
for (const k of Object.keys(en)) if (!(k in fr)) errors.push(`message ${k} exists in en-CA only`);
for (const k of Object.keys(fr)) {
  if (typeof fr[k] !== 'string' || !(k in en)) continue;
  // a single word or no letters at all (brand, unit, number) may be the same in both languages
  const text = fr[k].trim();
  if (fr[k] === en[k] && /\s/.test(text) && /[a-zA-ZÀ-ÿ]{3}/.test(text) && !ALLOW_SAME.has(k)) errors.push(`message ${k} is identical in fr-CA and en-CA (untranslated?): ${text.slice(0, 60)}`);
}
// Parents and children never read trial or free wording (owner decision 3). Admin bundles live in admin/, outside src.
// "essai" alone also means "try", so only the trial phrases are banned in French.
const NO_TRIAL = /\b(trial|free(?!dom)|gratuit\w*)\b|(mois|jours?|semaines?) offert\w*|essai gratuit|p[ée]riode d['’]essai|version d['’]essai|\bessayez numerix/i;
for (const [k, v] of [...Object.entries(fr), ...Object.entries(en)]) {
  if (typeof v === 'string' && NO_TRIAL.test(v)) errors.push(`message ${k} has trial or free wording: ${v.slice(0, 60)}`);
}
function walkSrc(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkSrc(p);
    else if (/\.tsx$/.test(name) && !/\.stories\./.test(name) && /(?<!\$)\{\s*(sub|subscription|s)\.plan\s*\}/.test(readFileSync(p, 'utf8'))) errors.push(`${p} prints the raw plan id`);
  }
}
walkSrc(root);

if (errors.length) {
  console.error('Copy check failed:\n' + errors.slice(0, 30).join('\n'));
  process.exit(1);
}
console.log('Copy check passed');
