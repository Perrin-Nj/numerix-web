'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Banner } from '@/ui/banner';

/** Visible whenever the device is offline. Explains what still works. */
export function OfflineBanner() {
  const t = useTranslations('errors.offline');
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (online) return null;
  return <Banner tone="warning" title={t('title')} description={t('description')} />;
}
