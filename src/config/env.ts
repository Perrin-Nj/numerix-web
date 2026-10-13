import { z } from 'zod';

/**
 * The only place that reads process.env. Everything else imports from
 * `@/config/app`. NEXT_PUBLIC_* values must be referenced statically so
 * Next.js can inline them in the client bundle.
 */
const bool = (def: boolean) => z.stringbool().default(def);
const list = z
  .string()
  .default('fr-CA,en-CA')
  .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean));

const publicSchema = z.object({
  NEXT_PUBLIC_USE_MOCK: bool(true),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'preview', 'production']).default('development'),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default('fr-CA'),
  NEXT_PUBLIC_LOCALES: list,
  NEXT_PUBLIC_STATE_SOURCE: z.enum(['local', 'api']).default('local'),
  NEXT_PUBLIC_CARD_THRESHOLD_PCT: z.coerce.number().int().min(0).max(100).default(70),
  NEXT_PUBLIC_MASCOT_ENABLED: bool(true),
  NEXT_PUBLIC_MASCOT_KIND: z.enum(['emoji', 'image', 'lottie', 'rive']).default('emoji'),
  NEXT_PUBLIC_MASCOT_EMOJI: z.string().min(1).default('🦊'),
  NEXT_PUBLIC_MASCOT_SRC: z.string().default(''),
  NEXT_PUBLIC_FEATURE_FEED: bool(true),
  NEXT_PUBLIC_FEATURE_KIOSK: bool(true),
  NEXT_PUBLIC_FEATURE_TV: bool(true),
  NEXT_PUBLIC_FEATURE_READ_ALOUD: bool(true),
  NEXT_PUBLIC_SOUND_DEFAULT: bool(true),
  NEXT_PUBLIC_ANALYTICS_ENABLED: bool(true),
});

const serverSchema = z.object({
  API_URL: z.url().default('http://localhost:8081/v1'),
});

function fail(scope: string, error: z.ZodError): never {
  const lines = error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid ${scope} configuration. Fix .env or Vercel variables:\n${lines}`);
}

const publicParsed = publicSchema.safeParse({
  NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  NEXT_PUBLIC_LOCALES: process.env.NEXT_PUBLIC_LOCALES,
  NEXT_PUBLIC_STATE_SOURCE: process.env.NEXT_PUBLIC_STATE_SOURCE,
  NEXT_PUBLIC_CARD_THRESHOLD_PCT: process.env.NEXT_PUBLIC_CARD_THRESHOLD_PCT,
  NEXT_PUBLIC_MASCOT_ENABLED: process.env.NEXT_PUBLIC_MASCOT_ENABLED,
  NEXT_PUBLIC_MASCOT_KIND: process.env.NEXT_PUBLIC_MASCOT_KIND,
  NEXT_PUBLIC_MASCOT_EMOJI: process.env.NEXT_PUBLIC_MASCOT_EMOJI,
  NEXT_PUBLIC_MASCOT_SRC: process.env.NEXT_PUBLIC_MASCOT_SRC,
  NEXT_PUBLIC_FEATURE_FEED: process.env.NEXT_PUBLIC_FEATURE_FEED,
  NEXT_PUBLIC_FEATURE_KIOSK: process.env.NEXT_PUBLIC_FEATURE_KIOSK,
  NEXT_PUBLIC_FEATURE_TV: process.env.NEXT_PUBLIC_FEATURE_TV,
  NEXT_PUBLIC_FEATURE_READ_ALOUD: process.env.NEXT_PUBLIC_FEATURE_READ_ALOUD,
  NEXT_PUBLIC_SOUND_DEFAULT: process.env.NEXT_PUBLIC_SOUND_DEFAULT,
  NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
});
if (!publicParsed.success) fail('public', publicParsed.error);
/**
 * Validated NEXT_PUBLIC_* values with defaults. Parsing throws at startup on a bad value. Only config/app.ts
 * should use it directly.
 */
export const publicEnv = publicParsed.data;

/** Server-only. Never import from a client component. */
export function serverEnv() {
  const parsed = serverSchema.safeParse({ API_URL: process.env.API_URL });
  if (!parsed.success) fail('server', parsed.error);
  return parsed.data;
}
