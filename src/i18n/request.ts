import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { appConfig } from '@/config/app';
import { negotiateLocale } from './negotiate';

/** Locale order: saved cookie, then device language (Accept-Language), then the configured default. */
export default getRequestConfig(async () => {
  const jar = await cookies();
  const saved = jar.get('NEXT_LOCALE')?.value;
  const accept = (await headers()).get('accept-language');
  const locale = negotiateLocale(saved, accept, appConfig.locales, appConfig.defaultLocale);
  return {
    locale,
    messages: (await import(`./generated/${locale}.json`)).default,
  };
});
