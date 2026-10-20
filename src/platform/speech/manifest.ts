import type { VoiceManifest } from './plan';

let cached: VoiceManifest | null = null;
let loading: Promise<VoiceManifest> | null = null;

/** The manifest already loaded, or null before the first load finishes. */
export const getManifest = () => cached;

/** Loads /voice/manifest.json once. Any failure gives an empty manifest (captions only), never an error. */
export function loadManifest(): Promise<VoiceManifest> {
  if (cached) return Promise.resolve(cached);
  loading ??= fetch('/voice/manifest.json')
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((m: VoiceManifest | null) => (cached = m && typeof m.lines === 'object' ? m : { schema: 1, lines: {} }));
  return loading;
}
