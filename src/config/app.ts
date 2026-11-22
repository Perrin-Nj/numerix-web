import { publicEnv } from './env';

export type MascotKind = 'image' | 'owl' | 'rive';

/**
 * Typed, read-only app settings built from the validated public environment: environment, state
 * source (local or api), card threshold, locales, mascot, feature flags and sound default. Import this, never
 * process.env.
 */
export const appConfig = {
  env: publicEnv.NEXT_PUBLIC_APP_ENV,
  /** local: progress is derived from the on-device event log. api: the server owns it (BE-21). */
  /** Share of right answers needed to win a card. Until the admin dashboard exists (BE-22) it comes from here. */
  locales: publicEnv.NEXT_PUBLIC_LOCALES,
  defaultLocale: publicEnv.NEXT_PUBLIC_DEFAULT_LOCALE,
  mascot: {
    enabled: publicEnv.NEXT_PUBLIC_MASCOT_ENABLED,
    kind: publicEnv.NEXT_PUBLIC_MASCOT_KIND as MascotKind,
  },
  features: {
    feed: publicEnv.NEXT_PUBLIC_FEATURE_FEED,
    kiosk: publicEnv.NEXT_PUBLIC_FEATURE_KIOSK,
    tv: publicEnv.NEXT_PUBLIC_FEATURE_TV,
    readAloud: publicEnv.NEXT_PUBLIC_FEATURE_READ_ALOUD,
    /** Subscription badge, pill and links for parents. Off until billing exists. */
    subscriptionUi: publicEnv.NEXT_PUBLIC_FEATURE_SUBSCRIPTION_UI,
    /** The one-time welcome gift on the kid home. Other gifts and cards are unaffected. */
    welcomeGift: publicEnv.NEXT_PUBLIC_FEATURE_WELCOME_GIFT,
    /** The illustrated scene stage on story questions. Off: the stage shows the question visual or the neutral stage. */
    scenes: publicEnv.NEXT_PUBLIC_FEATURE_SCENES,
  },
  defaults: {
    sound: publicEnv.NEXT_PUBLIC_SOUND_DEFAULT,
  },
  /** Where a parent can write when the server cannot send a reset email. Empty: the screen says to contact the team without an address. */
  supportEmail: publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL,
  analyticsEnabled: publicEnv.NEXT_PUBLIC_ANALYTICS_ENABLED,
} as const;

export type AppConfig = typeof appConfig;
