import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Config first: allowed remote image hosts come from IMAGE_HOSTS (comma separated), empty by default
const imageHosts = (process.env.IMAGE_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean);

const nextConfig: NextConfig = {
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
