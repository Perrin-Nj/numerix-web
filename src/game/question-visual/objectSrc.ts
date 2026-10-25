// Picture names inside question data come from the content files (and later from admins): only plain slugs may become a URL.
export function objectSrc(name: unknown): string | null {
  return typeof name === 'string' && /^[a-z0-9-]{1,40}$/.test(name) ? `/objects/${name}-256.webp` : null;
}
