import type { Locale, ResolvedScene } from './spec';

/** The accessible label: the spec's alt with the resolved numbers filled in. Every quantity is stated; nothing only by motion. */
export function describeScene(r: ResolvedScene, locale: Locale): string {
  // {name} is the bound number, {name:pad2} the same padded to two digits (minutes)
  const fill = (t: string) => t.replace(/\{(\w+)(?::(\w+))?\}/g, (_, k: string, f?: string) => (f === 'pad2' ? String(r.values[k] ?? '').padStart(2, '0') : String(r.values[k] ?? '')));
  const base = fill(r.spec.alt[locale]);
  const extra = r.revealed && r.spec.alt.reveal ? ` ${fill(r.spec.alt.reveal[locale])}` : '';
  return (base + extra).replace(/\s+/g, ' ').trim();
}

/** Every number in an alt text must be a resolved value (validator rule, node runnable). Returns the strays. */
export function altNumbersAreBound(r: ResolvedScene, locale: Locale): string[] {
  const label = describeScene(r, locale);
  const known = new Set(Object.values(r.values).flatMap((v) => [String(v), String(v).padStart(2, '0')]));
  return (label.match(/\d+/g) ?? []).filter((n) => !known.has(n));
}
