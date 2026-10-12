'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { reportError } from '@/lib/errors/bridge';
import { Banner } from '@/ui/banner';

/**
 * Registers the service worker (production only, so development never serves stale files) and offers
 * updates. An update never reloads the page during a chapter.
 */
export function PwaManager() {
  const t = useTranslations('screens.pwa');
  const pathname = usePathname();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (reg.waiting) setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker);
          });
        });
      })
      .catch((e) => reportError(e));
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);

  const inStory = /^\/play\/session\//.test(pathname);
  if (!waiting || inStory) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <Banner
        tone="info"
        title={t('updateTitle')}
        description={t('updateText')}
        action={{ label: t('updateAction'), onClick: () => waiting.postMessage('SKIP_WAITING') }}
        onDismiss={() => setWaiting(null)}
      />
    </div>
  );
}
