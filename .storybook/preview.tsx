import { useEffect } from 'react';
import type { Preview } from '@storybook/nextjs-vite';
import { NextIntlClientProvider } from 'next-intl';
import '../src/app/globals.css';
import frCA from '../src/i18n/generated/fr-CA.json';
import enCA from '../src/i18n/generated/en-CA.json';
import { AudioProvider, NullAudioPlayer } from '../src/lib/audio';
import { ThemeProvider } from '../src/lib/theme';

const messages = { 'fr-CA': frCA, 'en-CA': enCA } as const;
const player = new NullAudioPlayer();

function Frame({ theme, display, reduced, children }: { theme: string; display: string; reduced: boolean; children: React.ReactNode }) {
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    el.dataset.display = display;
    if (reduced) el.dataset.motion = 'reduced';
    else delete el.dataset.motion;
  }, [theme, display, reduced]);
  return <>{children}</>;
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: { title: 'Theme', icon: 'paintbrush', items: ['light', 'dark', 'hc', 'system'], dynamicTitle: true },
    },
    locale: {
      description: 'Locale',
      toolbar: { title: 'Locale', icon: 'globe', items: ['fr-CA', 'en-CA'], dynamicTitle: true },
    },
    display: {
      description: 'Display mode',
      toolbar: { title: 'Display', icon: 'browser', items: ['auto', 'tv', 'kiosk'], dynamicTitle: true },
    },
    motion: {
      description: 'Motion',
      toolbar: { title: 'Motion', icon: 'lightning', items: ['full', 'reduced'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light', locale: 'fr-CA', display: 'auto', motion: 'full' },
  decorators: [
    (Story, ctx) => {
      const { theme, locale, display, motion } = ctx.globals as Record<string, string>;
      const loc = (locale in messages ? locale : 'fr-CA') as keyof typeof messages;
      return (
        <NextIntlClientProvider locale={loc} messages={messages[loc]} timeZone="America/Toronto">
          <ThemeProvider initialTheme={theme as 'light'}>
            <AudioProvider player={player}>
              <Frame theme={theme} display={display} reduced={motion === 'reduced'}>
                <div style={{ background: 'var(--bg)', color: 'var(--fg)', padding: 16, minHeight: '100%' }}>
                  <Story />
                </div>
              </Frame>
            </AudioProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      );
    },
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: 'error' },
    viewport: {
      options: {
        phone: { name: 'Phone', styles: { width: '390px', height: '844px' } },
        tablet: { name: 'Tablet', styles: { width: '820px', height: '1180px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
        tv: { name: 'TV 1080p', styles: { width: '1920px', height: '1080px' } },
      },
    },
  },
};

export default preview;
