'use client';
import { useState } from 'react';
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

function Gift({ card, onClaim }: Omit<WelcomeGiftProps, 'open'>) {
  const t = useTranslations('game.welcomeGift');
  const { play } = useSound();
  const pick = usePickLine();
  const reduced = useReducedMotion();
  const [opened, setOpened] = useState(false);
  const [line, setLine] = useState(() => pick('mascot.welcome'));

  function openGift() {
    if (opened) return;
    setOpened(true);
    setLine(pick('mascot.amazed'));
    play('card_earned');
    if (reduced) return;
    import('canvas-confetti').then(({ default: confetti }) => {
      void confetti({ particleCount: 90, spread: 80, ticks: 120, origin: { y: 0.55 }, disableForReducedMotion: true });
    });
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
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto p-6 text-center text-fg"
        >
          <D.Title className="font-display text-3xl font-bold md:text-4xl">{t('title')}</D.Title>
          <D.Description className="text-lg text-muted">{opened ? t('opened') : t('hint')}</D.Description>

          {opened ? (
            <div className="flex w-full max-w-xs flex-col items-center gap-5">
              <StoryCard
                variant="reveal"
                card={{ id: card.id, world: card.world, title: card.title, image_url: '', earned_at: card.earnedAt }}
              />
              <Button size="xl" fullWidth sound={null} iconLeft={<Icon name="check" size={24} />} onClick={claim}>
                {t('claim')}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={t('open')}
              onClick={openGift}
              className="lift group relative h-48 w-48 rounded-lg"
            >
              <span aria-hidden className="nx-wobble relative block size-full">
                <span className="absolute inset-x-3 bottom-0 h-28 rounded-b-lg border-2 border-line bg-brand shadow-2" />
                <span className="absolute bottom-0 left-1/2 h-28 w-8 -translate-x-1/2 bg-warning" />
                <span
                  className={cn(
                    'absolute inset-x-0 top-14 h-14 rounded-lg border-2 border-line bg-brand shadow-1 transition-transform duration-(--dur-3) ease-(--ease-spring) group-hover:-translate-y-2 group-hover:-rotate-3',
                  )}
                >
                  <span className="absolute left-1/2 top-0 h-full w-8 -translate-x-1/2 bg-warning" />
                </span>
                <span className="nx-bounce absolute left-1/2 top-6 size-12 -translate-x-1/2 rounded-full border-4 border-warning" />
              </span>
            </button>
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
