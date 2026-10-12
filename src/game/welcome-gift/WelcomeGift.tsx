'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog as D } from 'radix-ui';
import { cn } from '@/lib/cn';
import { useSound } from '@/lib/audio';
import { usePickLine } from '@/lib/lines';
import { useReducedMotion } from '@/lib/motion';
import type { CardView } from '@/lib/game/types';
import { MascotBubble } from '@/game/mascot-bubble';
import { StoryCard } from '@/game/story-card';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';

export type WelcomeGiftProps = { open: boolean; card: CardView; onClaim: () => void };

/** Full-screen first-card gift. Cannot be dismissed by mistake: the only way out is the claim button. */
export function WelcomeGift({ open, card, onClaim }: WelcomeGiftProps) {
  // Remounting on open resets the gift to closed with a fresh welcome line.
  return open ? <Gift card={card} onClaim={onClaim} /> : null;
}

/** The box stays on screen the whole time; on open the lid flies off and the rays burst. */
function Box({ opened, reduced }: { opened: boolean; reduced: boolean }) {
  return (
    <span aria-hidden className={cn('relative block size-full', !opened && !reduced && 'nx-gift-invite')}>
      <span className="absolute inset-x-3 bottom-0 h-28 rounded-b-lg border-2 border-line bg-brand shadow-2" />
      <span className="absolute bottom-0 left-1/2 h-28 w-8 -translate-x-1/2 bg-warning" />
      {!(opened && reduced) && (
        <span
          className={cn(
            'absolute inset-x-0 top-14 h-14 rounded-lg border-2 border-line bg-brand shadow-1',
            opened && 'nx-gift-lid',
            !opened && 'transition-transform duration-(--dur-3) ease-(--ease-spring) group-hover:-translate-y-2 group-hover:-rotate-3',
          )}
        >
          <span className="absolute left-1/2 top-0 h-full w-8 -translate-x-1/2 bg-warning" />
          <span className="absolute -top-6 left-1/2 size-12 -translate-x-1/2 rounded-full border-4 border-warning" />
        </span>
      )}
    </span>
  );
}

function Gift({ card, onClaim }: Omit<WelcomeGiftProps, 'open'>) {
  const t = useTranslations('game.welcomeGift');
  const { play } = useSound();
  const pick = usePickLine();
  const reduced = useReducedMotion();
  const [opened, setOpened] = useState(false);
  const [ready, setReady] = useState(false); // claim button shows once the card has settled
  const [line, setLine] = useState(() => pick('mascot.welcome'));

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    const timers = [
      setTimeout(() => play('card_earned'), reduced ? 0 : 1000),
      setTimeout(() => setReady(true), reduced ? 300 : 2000),
    ];
    if (!reduced) {
      import('canvas-confetti').then(({ default: confetti }) => {
        if (cancelled) return;
        const base = { ticks: 140, origin: { y: 0.55 }, disableForReducedMotion: true };
        void confetti({ ...base, particleCount: 80, spread: 90, shapes: ['circle', 'square'] });
        timers.push(setTimeout(() => void confetti({ ...base, particleCount: 45, spread: 120, startVelocity: 25, shapes: ['star'], scalar: 1.2 }), 650));
      });
    }
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [opened, reduced, play]);

  function openGift() {
    if (opened) return;
    setOpened(true);
    setLine(pick('mascot.amazed'));
    play('gift_open');
  }

  function claim() {
    play('chapter_complete');
    onClaim();
  }

  const stop = (e: Event) => e.preventDefault();
  return (
    <D.Root open>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-bg/90" />
        <D.Content
          onEscapeKeyDown={stop}
          onPointerDownOutside={stop}
          onInteractOutside={stop}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center text-fg"
        >
          <D.Title className="font-display text-3xl font-bold md:text-4xl">{t('title')}</D.Title>
          <D.Description className="text-lg text-muted">{opened ? t('opened') : t('hint')}</D.Description>

          <div className="relative flex h-[26rem] w-64 items-end justify-center [perspective:900px]">
            {opened && !reduced && (
              <span aria-hidden className="nx-gift-rays pointer-events-none absolute bottom-6 left-1/2 size-96 -translate-x-1/2" />
            )}
            {opened && (
              <div
                className={cn(
                  'absolute bottom-24 left-1/2 w-52 -translate-x-1/2 drop-shadow-xl',
                  reduced ? 'nx-gift-fade' : 'nx-gift-card',
                )}
              >
                <StoryCard
                  source="gift"
                  card={{ id: card.id, world: card.world, title: card.title, image_url: '', earned_at: card.earnedAt }}
                />
              </div>
            )}
            {opened ? (
              <div className="relative size-48">
                <Box opened reduced={reduced} />
              </div>
            ) : (
              <button
                type="button"
                aria-label={t('open')}
                onClick={openGift}
                className="lift group relative size-48 rounded-lg"
              >
                <Box opened={false} reduced={reduced} />
              </button>
            )}
          </div>

          {ready && (
            <Button className="nx-gift-fade" size="xl" sound={null} iconLeft={<Icon name="check" size={24} />} onClick={claim}>
              {t('claim')}
            </Button>
          )}

          {line && (
            <MascotBubble pose={opened ? 'amazed' : 'greet'} className="max-w-sm text-start">
              {line}
            </MascotBubble>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
