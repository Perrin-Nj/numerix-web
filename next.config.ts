import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Config first: allowed remote image hosts come from IMAGE_HOSTS (comma separated), empty by default
const imageHosts = (process.env.IMAGE_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean);

// Images of the question bank live in the Go API (CR-16/17). The browser asks /assets/..., Next forwards it, so the
// immutable cache headers of the API reach the browser and the CDN.
const apiBase = (process.env.API_URL ?? 'http://localhost:8081/v1').replace(/\/$/, '');

// Self-hosting (Oracle VM behind Caddy): NEXT_OUTPUT=standalone builds a small server folder (node server.js).
// On Vercel nothing is set, so Vercel keeps its own output and reads vercel.ts for headers.
const selfHost = process.env.NEXT_OUTPUT === 'standalone';
const list = (v: string | undefined) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
// Same policy as vercel.ts (ADR 0003). Kept in sync by scripts/smoke-web.sh, which checks these headers on the live host.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${list(process.env.IMAGE_HOSTS).map((h) => `https://${h}`).join(' ')}`.trim(),
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${list(process.env.CONNECT_ORIGINS).join(' ')}`.trim(),
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  ...(selfHost ? { output: 'standalone' as const, outputFileTracingRoot: process.cwd() } : {}),
  // A second copy of the app (another port, another API) needs its own build folder
  distDir: process.env.NX_DIST ?? '.next',
  // Screens load their data on the client, so a page's server payload is only a shell. Reusing it for 30 s makes a
  // tab change instant instead of waiting for the server each time.
  experimental: { staleTimes: { dynamic: 30, static: 180 } },
  async rewrites() {
    return [
      { source: '/assets/:path*', destination: `${apiBase}/assets/:path*` },
      // Discover photos, clips and captions: the same immutable headers and Range support reach the browser
      { source: '/feed-media/:path*', destination: `${apiBase}/feed-media/:path*` },
    ];
  },
  // Old links, typed URLs and locale-prefixed guesses land on the real screens, never a dead end
  async redirects() {
    const L = ':locale(fr|en|fr-CA|en-CA|fr-ca|en-ca)';
    const to = (source: string, destination: string) => ({ source, destination, permanent: true });
    return [
      ...['/feed', '/feeds', '/discover', '/play/feeds', '/play/discover', `/${L}/feed`, `/${L}/feeds`, `/${L}/discover`].map((s) => to(s, '/play/feed')),
      to(`/${L}/play/:path*`, '/play/:path*'),
      to(`/${L}/parent/:path*`, '/parent/:path*'),
      to(`/${L}`, '/'),
    ];
  },
  // Security and cache headers for the self-hosted build (vercel.ts does this job on Vercel)
  async headers() {
    if (!selfHost) return [];
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      { source: '/(sounds|icons)/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
  allowedDevOrigins: ['192.168.68.55'],
  // Self-host: the build runs on an x64 runner and the VM is ARM, so the native image resizer (sharp) would not match.
  // Pictures are already sized and cached for a year by the Go API, so they are served as they are. Vercel keeps resizing.
  images: { unoptimized: selfHost, remotePatterns: imageHosts.map((hostname) => ({ protocol: 'https' as const, hostname })) },
  // ADR 0002: Cache Components is off. The app is cookie-authenticated and client driven;
  // static generation is used for public pages. Revisit after the playtest.
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default withNextIntl(nextConfig);
