'use client';
import { useUI } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { Button } from './ui';

export function Toggles() {
  const { locale, theme, setLocale, setTheme } = useUI();
  const t = useT();
  return (
    <div className="flex items-center gap-2">
      <Button small onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')} aria-label={t('toggle.lang')}>
        {locale === 'fr' ? 'EN' : 'FR'}
      </Button>
      <Button small onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t('toggle.theme')}>
        {theme === 'dark' ? t('toggle.light') : t('toggle.dark')}
      </Button>
    </div>
  );
}
