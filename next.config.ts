import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Config first: allowed remote image hosts come from IMAGE_HOSTS (comma separated), empty by default
const imageHosts = (process.env.IMAGE_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean);

// Images of the question bank live in the Go API (CR-16/17). The browser asks /assets/..., Next forwards it, so the
// immutable cache headers of the API reach the browser and the CDN.
const apiBase = (process.env.API_URL ?? 'http://localhost:8081/v1').replace(/\/$/, '');

const nextConfig: NextConfig = {
  // A second copy of the app (another port, another API) needs its own build folder
  distDir: process.env.NX_DIST ?? '.next',
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
  allowedDevOrigins: ['192.168.68.55'],
  images: { remotePatterns: imageHosts.map((hostname) => ({ protocol: 'https' as const, hostname })) },
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
