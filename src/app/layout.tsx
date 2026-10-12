import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Atkinson_Hyperlegible_Next, Baloo_2 } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import { Providers } from './providers';
import type { DisplayMode, ThemeChoice } from '@/lib/theme';

const display = Baloo_2({ subsets: ['latin'], variable: '--font-display-family', display: 'swap' });
const body = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--font-body-family', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Numerix', template: '%s | Numerix' },
  description: 'Math adventures for kids, with progress for parents.',
  applicationName: 'Numerix',
  appleWebApp: { capable: true, title: 'Numerix', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff9f0' },
    { media: '(prefers-color-scheme: dark)', color: '#14111f' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const jar = await cookies();
  const theme = (jar.get('nx_theme')?.value ?? 'system') as ThemeChoice;
  const displayMode = (jar.get('nx_display')?.value ?? 'auto') as DisplayMode;
  const reduced = jar.get('nx_motion')?.value === 'reduced';

  return (
    <html
      lang={locale}
      data-theme={theme}
      data-display={displayMode}
      data-motion={reduced ? 'reduced' : undefined}
      className={`${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers theme={theme} reducedMotion={reduced} display={displayMode}>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
