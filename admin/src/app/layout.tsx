import type { Metadata } from 'next';
import { Atkinson_Hyperlegible_Next, Baloo_2 } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const display = Baloo_2({ subsets: ['latin'], variable: '--font-display-family', display: 'swap' });
const body = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--font-body-family', display: 'swap' });

export const metadata: Metadata = {
  title: 'Numerix Admin',
  robots: { index: false, follow: false },
  icons: { icon: '/icon.svg' },
};

// Sets the theme before first paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem('nx_theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;var l=localStorage.getItem('nx_locale');if(l)document.documentElement.lang=l}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="light" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
