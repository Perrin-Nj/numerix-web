'use client';
// Public API of the data hooks. Screens import from '@/data/hooks'; each concern lives in its own file.
import { appConfig } from '@/config/app';
import { setCardThresholdPct } from '@/domain/game/rules';

// The pass threshold is a platform setting (admin dashboard later, BE-22); the app seeds it from config once.
setCardThresholdPct(appConfig.cardThresholdPct);

export { keys, apiOn } from './keys';
export * from './session';
export * from './auth';
export * from './children';
export * from './sessions';
export * from './feed';
export * from './state';
