
// shortcut: in-memory per instance, resets on cold start and is not shared across serverless instances. Upgrade to Redis/Upstash for multi-instance hardening.
const hits = new Map<string, number[]>();
const WINDOW = 10 * 60 * 1000;
const MAX = 5;

/** Returns seconds to wait when blocked, else 0. Call only for failed tries via `fail`. */
export function blockedFor(key: string) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW);
  hits.set(key, list);
  return list.length >= MAX ? Math.ceil((WINDOW - (now - list[0])) / 1000) : 0;
}
export function fail(key: string) {
  hits.set(key, [...(hits.get(key) ?? []), Date.now()]);
}
export function clear(key: string) {
  hits.delete(key);
}
