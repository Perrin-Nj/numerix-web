'use client';
import { useLocale, useTranslations } from 'next-intl';
import { appConfig } from '@/config/app';
import { useTheme, type DisplayMode, type ThemeChoice } from '@/platform/theme';
import { AccountSecurity } from './AccountSecurity';
import { ParentPage } from './ParentPage';
import { Panel } from '@/ui/panel';
import { Select } from '@/ui/select';
import { Switch } from '@/ui/switch';

/** Parent preferences and security: theme, language, reduced motion, passkeys and devices. */
export function AccountScreen() {
  const t = useTranslations('screens.parent.account');
  const locale = useLocale();
  const { theme, setTheme, reducedMotion, setReducedMotion, display, setDisplay } = useTheme();

  function changeLocale(value: string) {
    document.cookie = `NEXT_LOCALE=${value}; path=/; max-age=31536000; samesite=lax`;
    // a full reload also updates <html lang> and every cached server render, which router.refresh() can miss
    window.location.reload();
  }

  return (
    <ParentPage title={t('title')} backHref="/parent">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <Panel title={t('language')} icon="globe">
          <Select
            label={t('language')}
            value={locale}
            onValueChange={changeLocale}
            options={appConfig.locales.map((l) => ({ value: l, label: t(`locales.${l}`) }))}
          />
        </Panel>
        <Panel title={t('appearance')} icon="sun">
          <div className="flex flex-col gap-4">
            <Select
              label={t('theme')}
              value={theme}
              onValueChange={(v) => setTheme(v as ThemeChoice)}
              options={(['system', 'light', 'dark', 'hc'] as const).map((k) => ({ value: k, label: t(`themes.${k}`) }))}
            />
            <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} label={t('reducedMotion')} description={t('reducedMotionHint')} />
            {(appConfig.features.tv || appConfig.features.kiosk) && (
              <Select
                label={t('display')}
                value={display}
                onValueChange={(v) => setDisplay(v as DisplayMode)}
                options={(['auto', 'tv', 'kiosk'] as const)
                  .filter((k) => k === 'auto' || appConfig.features[k])
                  .map((k) => ({ value: k, label: t(`displays.${k}`) }))}
              />
            )}
          </div>
        </Panel>
        <AccountSecurity />
      </div>
    </ParentPage>
  );
}
