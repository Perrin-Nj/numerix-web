'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSessionStatus } from '@/data/hooks';
import { MascotBubble } from '@/game/mascot-bubble';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Reveal } from '@/ui/reveal';
import { ThemeToggle } from '@/ui/theme-toggle';

/** Two clear doors: kids play, grown-ups manage. Neither is hidden behind the other. */
export function WelcomeScreen() {
  const t = useTranslations('screens.welcome');
  const router = useRouter();
  const status = useSessionStatus();
  const hasParent = Boolean(status.data?.parent);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 px-4 py-10">
      <div className="fixed end-3 top-3 z-20">
        <ThemeToggle variant="icon" />
      </div>
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
        <div className="flex flex-col gap-4">
          <div>
            <Button size="xl" fullWidth iconLeft={<Icon name="play" size={28} />} onClick={() => router.push('/play')}>
              {t('kidButton')}
            </Button>
            <p className="mt-1 text-center text-sm text-muted">{t('kidHint')}</p>
          </div>
          <div>
            <Button size="lg" variant="secondary" fullWidth iconLeft={<Icon name="shield" />} onClick={() => router.push(hasParent ? '/parent' : '/parent/login')}>
              {t('adultButton')}
            </Button>
            <p className="mt-1 text-center text-sm text-muted">{t('adultHint')}</p>
          </div>
        </div>
      </Reveal>
    </main>
  );
}
