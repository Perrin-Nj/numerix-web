'use client';
/** Query keys. */

/** Query keys in one place so invalidation stays consistent. */
export const keys = {
  session: ['session-status'] as const,
  children: ['children'] as const,
  settings: (id: string) => ['settings', id] as const,
  worlds: ['worlds'] as const,
  home: (id: string) => ['home', id] as const,
  journey: (id: string, world: string) => ['journey', id, world] as const,
  collection: (id: string) => ['collection', id] as const,
  engagement: (id: string) => ['engagement', id] as const,
  challenges: (id: string) => ['challenges', id] as const,
  growth: (id: string) => ['growth', id] as const,
  quest: (id: string) => ['quest', id] as const,
  progress: (id: string) => ['progress', id] as const,
  sessions: (id: string) => ['sessions', id] as const,
  summary: (sid: string) => ['summary', sid] as const,
  weekly: (id: string) => ['weekly', id] as const,
  session_one: (sid: string) => ['session', sid] as const,
};
