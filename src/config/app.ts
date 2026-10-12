import { publicEnv } from './env';

export type MascotKind = 'emoji' | 'image' | 'lottie' | 'rive';

export const appConfig = {
  env: publicEnv.NEXT_PUBLIC_APP_ENV,
  useMock: publicEnv.NEXT_PUBLIC_USE_MOCK,
  /** local: progress is derived from the on-device event log. api: the server owns it (BE-21). */
  stateSource: publicEnv.NEXT_PUBLIC_STATE_SOURCE,
  /** Share of right answers needed to win a card. Until the admin dashboard exists (BE-22) it comes from here. */
  cardThresholdPct: publicEnv.NEXT_PUBLIC_CARD_THRESHOLD_PCT,
  locales: publicEnv.NEXT_PUBLIC_LOCALES,
  defaultLocale: publicEnv.NEXT_PUBLIC_DEFAULT_LOCALE,
  mascot: {
    enabled: publicEnv.NEXT_PUBLIC_MASCOT_ENABLED,
    kind: publicEnv.NEXT_PUBLIC_MASCOT_KIND as MascotKind,
    emoji: publicEnv.NEXT_PUBLIC_MASCOT_EMOJI,
    src: publicEnv.NEXT_PUBLIC_MASCOT_SRC,
  },
  features: {
    feed: publicEnv.NEXT_PUBLIC_FEATURE_FEED,
    kiosk: publicEnv.NEXT_PUBLIC_FEATURE_KIOSK,
    tv: publicEnv.NEXT_PUBLIC_FEATURE_TV,
    readAloud: publicEnv.NEXT_PUBLIC_FEATURE_READ_ALOUD,
  },
  defaults: {
    sound: publicEnv.NEXT_PUBLIC_SOUND_DEFAULT,
  },
  analyticsEnabled: publicEnv.NEXT_PUBLIC_ANALYTICS_ENABLED,
} as const;

export type AppConfig = typeof appConfig;
