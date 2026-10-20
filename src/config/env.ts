/**
 * The only place that reads public process.env. Everything else imports from `@/config/app`.
 * NEXT_PUBLIC_* values must be referenced statically so Next.js can inline them in the client bundle.
 * Hand-written parsing (no zod) keeps the validator out of every route's JavaScript; the server variables
 * live in `server-env.ts`.
 */
const problems: string[] = [];
const TRUE = ['true', '1', 'yes', 'on', 'y', 'enabled'];
const FALSE = ['false', '0', 'no', 'off', 'n', 'disabled'];

function bool(name: string, raw: string | undefined, def: boolean): boolean {
  if (raw === undefined || raw === '') return def;
  const v = raw.trim().toLowerCase();
  if (TRUE.includes(v)) return true;
  if (FALSE.includes(v)) return false;
  problems.push(`  ${name}: expected true or false, got "${raw}"`);
  return def;
}
function pick<T extends string>(name: string, raw: string | undefined, allowed: readonly T[], def: T): T {
  if (raw === undefined || raw === '') return def;
  if ((allowed as readonly string[]).includes(raw)) return raw as T;
  problems.push(`  ${name}: expected one of ${allowed.join(', ')}, got "${raw}"`);
  return def;
}

const publicEnvParsed = {
  NEXT_PUBLIC_APP_ENV: pick('NEXT_PUBLIC_APP_ENV', process.env.NEXT_PUBLIC_APP_ENV, ['development', 'preview', 'production'], 'development'),
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'fr-CA',
  NEXT_PUBLIC_LOCALES: (process.env.NEXT_PUBLIC_LOCALES ?? 'fr-CA,en-CA').split(',').map((s) => s.trim()).filter(Boolean),
  NEXT_PUBLIC_MASCOT_ENABLED: bool('NEXT_PUBLIC_MASCOT_ENABLED', process.env.NEXT_PUBLIC_MASCOT_ENABLED, true),
  NEXT_PUBLIC_MASCOT_KIND: pick('NEXT_PUBLIC_MASCOT_KIND', process.env.NEXT_PUBLIC_MASCOT_KIND, ['image', 'owl', 'rive'], 'owl'),
  NEXT_PUBLIC_FEATURE_FEED: bool('NEXT_PUBLIC_FEATURE_FEED', process.env.NEXT_PUBLIC_FEATURE_FEED, true),
  NEXT_PUBLIC_FEATURE_KIOSK: bool('NEXT_PUBLIC_FEATURE_KIOSK', process.env.NEXT_PUBLIC_FEATURE_KIOSK, true),
  NEXT_PUBLIC_FEATURE_TV: bool('NEXT_PUBLIC_FEATURE_TV', process.env.NEXT_PUBLIC_FEATURE_TV, true),
  NEXT_PUBLIC_FEATURE_READ_ALOUD: bool('NEXT_PUBLIC_FEATURE_READ_ALOUD', process.env.NEXT_PUBLIC_FEATURE_READ_ALOUD, true),
  NEXT_PUBLIC_FEATURE_SUBSCRIPTION_UI: bool('NEXT_PUBLIC_FEATURE_SUBSCRIPTION_UI', process.env.NEXT_PUBLIC_FEATURE_SUBSCRIPTION_UI, false),
  NEXT_PUBLIC_FEATURE_WELCOME_GIFT: bool('NEXT_PUBLIC_FEATURE_WELCOME_GIFT', process.env.NEXT_PUBLIC_FEATURE_WELCOME_GIFT, false),
  NEXT_PUBLIC_SOUND_DEFAULT: bool('NEXT_PUBLIC_SOUND_DEFAULT', process.env.NEXT_PUBLIC_SOUND_DEFAULT, true),
  NEXT_PUBLIC_ANALYTICS_ENABLED: bool('NEXT_PUBLIC_ANALYTICS_ENABLED', process.env.NEXT_PUBLIC_ANALYTICS_ENABLED, true),
};
if (problems.length) throw new Error(`Invalid public configuration. Fix .env or Vercel variables:\n${problems.join('\n')}`);

/** Validated NEXT_PUBLIC_* values with defaults. Parsing throws at startup on a bad value. Only config/app.ts should use it directly. */
export const publicEnv = publicEnvParsed;
