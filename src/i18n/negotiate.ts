/** Pure locale negotiation: saved choice, then Accept-Language, then the default. */
export function negotiateLocale(
  saved: string | undefined | null,
  acceptLanguage: string | undefined | null,
  supported: readonly string[],
  fallback: string,
): string {
  if (saved && supported.includes(saved)) return saved;
  const wanted = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.trim(), q: q ? Number(q) : 1 };
    })
    .filter((x) => x.tag)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    const exact = supported.find((s) => s.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const lang = tag.split('-')[0].toLowerCase();
    const sameLang = supported.find((s) => s.split('-')[0].toLowerCase() === lang);
    if (sameLang) return sameLang;
  }
  return fallback;
}
