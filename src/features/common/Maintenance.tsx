'use client';
import { useLocale, useTranslations } from 'next-intl';
import { usePublicConfig } from '@/data/hooks';
import { Banner } from '@/ui/banner';

/** The admin's maintenance notice in the visitor's language, or null when there is none (or the config could not be read). */
export function useMaintenance() {
  const m = usePublicConfig().data?.maintenance;
  const lang = useLocale().startsWith('fr') ? 'fr' : 'en';
  if (!m?.enabled) return null;
  return { level: m.level, blockPlay: m.block_play, message: m.message[lang] };
}

/** Friendly notice at the top of a screen while the admin has maintenance on. */
export function MaintenanceBanner() {
  const m = useMaintenance();
  const t = useTranslations('maintenance');
  if (!m) return null;
  return <Banner tone={m.level === 'info' ? 'info' : 'warning'} title={m.message || t('title')} description={m.message ? undefined : t('text')} />;
}

/** Replaces the game while maintenance blocks play: calm, no blame, and it clears itself when the admin turns it off. */
export function MaintenanceBlock() {
  const m = useMaintenance();
  const t = useTranslations('maintenance');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center" role="status">
      <h1 className="font-display text-2xl font-bold">{t('blockedTitle')}</h1>
      <p className="text-lg text-muted">{m?.message || t('blockedText')}</p>
      <p className="text-muted">{t('blockedHint')}</p>
    </main>
  );
}
