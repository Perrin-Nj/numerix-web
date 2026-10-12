'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSessionStatus } from '@/features/api/hooks';
import { MascotBubble } from '@/game/mascot-bubble';
import { Button } from '@/ui/button';
import { Reveal } from '@/ui/reveal';
import { Skeleton } from '@/ui/skeleton';

export function WelcomeScreen() {
  const t = useTranslations('screens.welcome');
  const router = useRouter();
  const status = useSessionStatus();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 px-4 py-10">
      <Reveal>
        <h1 className="font-display text-5xl font-extrabold leading-tight text-brand">Numerix</h1>
        <p className="mt-2 text-xl text-muted">{t('tagline')}</p>
      </Reveal>
      <Reveal delayMs={120}>
        <MascotBubble pose="greet" size="lg">
          {t('mascot')}
        </MascotBubble>
      </Reveal>
      <Reveal delayMs={220}>
        {status.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton height={72} />
            <Skeleton height={56} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(status.data?.parent || status.data?.child) && (
              <Button size="xl" fullWidth onClick={() => router.push(status.data?.child ? '/play/home' : '/play')}>
                {t('play')}
              </Button>
            )}
            <Button
              size={status.data?.parent ? 'lg' : 'xl'}
              variant={status.data?.parent ? 'secondary' : 'primary'}
              fullWidth
              onClick={() => router.push(status.data?.parent ? '/parent' : '/parent/login')}
            >
              {status.data?.parent ? t('parentArea') : t('grownUp')}
            </Button>
          </div>
        )}
      </Reveal>
    </main>
  );
}
