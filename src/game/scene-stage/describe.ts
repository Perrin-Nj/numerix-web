import type { Locale, ResolvedScene } from './spec';

/** The accessible label: the spec's alt with the resolved numbers filled in. Every quantity is stated; nothing only by motion. */
export function describeScene(r: ResolvedScene, locale: Locale): string {
  // {name} is the bound number, {name:pad2} the same padded to two digits (minutes)
  // {name:one|many} picks the singular word when the value is 1 ("1 pion", "2 pions"), so a label never says "1 pions"
  const fill = (t: string) =>
    t.replace(/\{(\w+)(?::([^}]+))?\}/g, (_, k: string, f?: string) => {
      const v = r.values[k];
      if (f === 'pad2') return String(v ?? '').padStart(2, '0');
      if (f?.includes('|')) {
        const [one, many] = f.split('|');
        return v === 1 ? one! : many!;
      }
      return String(v ?? '');
    });
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
