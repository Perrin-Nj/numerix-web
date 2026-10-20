'use client';
import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAudioSettings } from '@/platform/audio';
import { useChildSettings, usePublicConfig, useSessionStatus } from '@/data/hooks';
import { MusicController } from '@/platform/music/MusicController';
import { MusicToggle } from './MusicToggle';
import { useServerPrefsSync } from './useServerPrefs';
import { MaintenanceBanner, MaintenanceBlock, useMaintenance } from '@/features/common/Maintenance';
import { OfflineBanner } from '@/features/common/OfflineBanner';
import { BottomNav } from '@/ui/bottom-nav';

/** Frame for child screens. The story screen gets no navigation at all. */
export function PlayShell({ children }: { children: ReactNode }) {
  const t = useTranslations('screens.play.nav');
  const pathname = usePathname();
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const settings = useChildSettings(childId ?? '');
  const { setEnabled } = useAudioSettings();
  const maintenance = useMaintenance();
  const discoverOn = usePublicConfig().data?.feed.discover_enabled ?? true;
  useServerPrefsSync();

  // Follow the parent's sound choice
  useEffect(() => {
    if (settings.data) setEnabled(settings.data.sound);
  }, [settings.data, setEnabled]);

  const inStory = /^\/play\/session\//.test(pathname);
  const showNav = !inStory && pathname !== '/play';
  const is = (p: string) => pathname === p || pathname.startsWith(`${p}/`);

  if (maintenance?.blockPlay) return <MaintenanceBlock />;
  return (
    <>
      <OfflineBanner />
      <MaintenanceBanner />
      <MusicController />
      <MusicToggle lifted={showNav} />
      <div className={showNav ? 'pb-24' : undefined}>{children}</div>
      {showNav && (
        <BottomNav
          ariaLabel={t('label')}
          items={[
            { href: '/play/home', label: t('home'), icon: 'home', active: is('/play/home') },
            { href: '/play/worlds', label: t('worlds'), icon: 'map', active: is('/play/worlds') || is('/play/journey') },
            ...(discoverOn ? [{ href: '/play/feed', label: t('discover'), icon: 'sparkles' as const, active: is('/play/feed') }] : []),
            { href: '/play/collection', label: t('cards'), icon: 'star', active: is('/play/collection') },
            { href: '/play/me', label: t('me'), icon: 'user', active: is('/play/me') },
          ]}
        />
      )}
    </>
  );
}
