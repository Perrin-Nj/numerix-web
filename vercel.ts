import type { VercelConfig } from '@vercel/config/v1';

/**
 * Vercel project configuration as code (runs at build time). Tunable values come from environment
 * variables with safe defaults, so changing region, image hosts or the API origin never needs a code change.
 *
 * VERCEL_REGIONS   comma separated function regions (default yul1, Montreal)
 * IMAGE_HOSTS      comma separated hostnames allowed for remote images
 * CONNECT_ORIGINS  comma separated extra origins the browser may call (default none: the app proxies the API)
 */
const list = (value: string | undefined, fallback: string[] = []) =>
  value ? value.split(',').map((s) => s.trim()).filter(Boolean) : fallback;

const regions = list(process.env.VERCEL_REGIONS, ['yul1']);
const imageHosts = list(process.env.IMAGE_HOSTS).map((h) => `https://${h}`);
const connectOrigins = list(process.env.CONNECT_ORIGINS);

// ADR 0003: Next.js inlines small scripts and styles, so 'unsafe-inline' stays until nonces are wired in
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${imageHosts.join(' ')}`.trim(),
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${connectOrigins.join(' ')}`.trim(),
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const header = (key: string, value: string) => ({ key, value });

export const config: VercelConfig = {
  framework: 'nextjs',
  regions,
  headers: [
    {
      source: '/(.*)',
      headers: [
        header('Content-Security-Policy', csp),
        header('X-Content-Type-Options', 'nosniff'),
        header('X-Frame-Options', 'DENY'),
        header('Referrer-Policy', 'strict-origin-when-cross-origin'),
        header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()'),
      ],
    },
    {
      // The service worker must always be revalidated so updates reach users
      source: '/sw.js',
      headers: [
        header('Cache-Control', 'no-cache, no-store, must-revalidate'),
        header('Service-Worker-Allowed', '/'),
      ],
    },
    {
      source: '/(sounds|icons)/(.*)',
      headers: [header('Cache-Control', 'public, max-age=31536000, immutable')],
    },
  ],
};
