/** Pure playback decision, no DOM: human clip first, else captions only, computer voice only on opt-in. */
export type VoiceManifest = { schema: 1; base?: string; lines: Record<string, { file: string; locale?: string }> };
export type Plan = { kind: 'clip'; url: string } | { kind: 'computer' } | { kind: 'captions' };

/** 'fr' / 'fr-CA' / 'fr_CA' -> 'fr'. Anything that is not English is French (the app has two languages). */
export const primary = (l: string): 'fr' | 'en' => (l.toLowerCase().startsWith('en') ? 'en' : 'fr');
/** The Canadian locale of a UI language. */
export const canonLocale = (l: string): 'fr-CA' | 'en-CA' => (primary(l) === 'en' ? 'en-CA' : 'fr-CA');

/** Clip url for a line in the UI language, or null. A clip of the other language is never returned. */
export function clipFor(m: VoiceManifest | null, lineId: string | undefined, lang: string): string | null {
  if (!m || !lineId) return null;
  const e = m.lines[`${lineId}@${primary(lang)}`];
  if (!e || (e.locale && primary(e.locale) !== primary(lang))) return null;
  return `${m.base ?? '/voice/'}${e.file}`;
}

export function planLine(a: {
  lineId?: string;
  lang: string;
  manifest: VoiceManifest | null;
  prefs: { voice: boolean; computerVoice: boolean };
  soundOn: boolean;
  ttsSupported: boolean;
}): Plan {
  if (!a.prefs.voice || !a.soundOn) return { kind: 'captions' };
  const url = clipFor(a.manifest, a.lineId, a.lang);
  if (url) return { kind: 'clip', url };
  return a.prefs.computerVoice && a.ttsSupported ? { kind: 'computer' } : { kind: 'captions' };
}
