import { useTranslations } from 'next-intl';
import { MascotBubble } from '@/game/mascot-bubble';

export const metadata = { title: 'Offline' };

// Served by the service worker when a page cannot be loaded without a connection
export default function OfflinePage() {
  const t = useTranslations('errors.offline');
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4">
      <h1 className="font-display text-3xl font-bold">{t('title')}</h1>
      <MascotBubble pose="rest">{t('description')}</MascotBubble>
    </main>
  );
}
