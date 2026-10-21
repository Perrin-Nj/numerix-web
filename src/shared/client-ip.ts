/**
 * The visitor's IP address as the host in front of this server saw it (Caddy on the VM, or Vercel).
 * The web server forwards it to the Go API in X-Forwarded-For, because the API sees only this server's address
 * and would otherwise count every family as ONE visitor in its per-IP limits (600 requests and 5 sign-ups per hour).
 * Only the first entry is used. Returns undefined when the header is missing or does not look like an IP.
 */
export function clientIp(get: (name: string) => string | null): string | undefined {
  const raw = get('x-forwarded-for')?.split(',')[0]?.trim() || get('x-real-ip')?.trim();
  return raw && /^[0-9a-fA-F:.]{2,45}$/.test(raw) ? raw : undefined;
}
