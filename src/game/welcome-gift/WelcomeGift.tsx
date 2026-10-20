'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog as D } from 'radix-ui';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { usePickLine } from '@/platform/lines';
import { useReducedMotion } from '@/platform/motion';
import type { WorldId } from '@/data/api/types';
import { MascotBubble } from '@/game/mascot-bubble';
import { StoryCard } from '@/game/story-card';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';

export type WelcomeGiftProps = { open: boolean; card: { id: string; world: WorldId; title: string }; onClaim: () => void; onLater?: () => void };

/** Full-screen first-card gift. Cannot be dismissed by mistake: the only way out is the claim button. */
export function WelcomeGift({ open, card, onClaim, onLater }: WelcomeGiftProps) {
  // Remounting on open resets the gift to closed with a fresh welcome line.
  return open ? <Gift card={card} onClaim={onClaim} onLater={onLater} /> : null;
}

/** Real photo of a wrapped gift. On open it lifts and melts away so the card can rise from the same spot. */
function Box({ opened, reduced }: { opened: boolean; reduced: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/gift/welcome-gift.webp"
      alt=""
      aria-hidden
      width={420}
      height={405}
      decoding="async"
      fetchPriority="high"
      className={cn(
        'size-full rounded-3xl object-cover shadow-3',
        !opened && !reduced && 'nx-gift-invite',
        opened && (reduced ? 'opacity-0' : 'nx-gift-lid'),
      )}
    />
  );
}

function Gift({ card, onClaim, onLater }: Omit<WelcomeGiftProps, 'open'>) {
  const t = useTranslations('game.welcomeGift');
  const { play } = useSound();
  const pick = usePickLine();
  const reduced = useReducedMotion();
  const [opened, setOpened] = useState(false);
  const [ready, setReady] = useState(false); // claim button shows once the card has settled
  const [line, setLine] = useState(() => pick('mascot.welcome'));
  const [earnedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (!opened) return;
    const timers = [
      setTimeout(() => play('card_earned'), reduced ? 0 : 1000),
      setTimeout(() => setReady(true), reduced ? 300 : 2000),
    ];
    return () => {
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
        <D.Overlay className="fixed inset-0 z-40 bg-bg/95" />
        <D.Content
          onEscapeKeyDown={stop}
          onPointerDownOutside={stop}
          onInteractOutside={stop}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center text-fg"
        >
          <D.Title className="font-display text-3xl font-bold md:text-4xl">{t('title')}</D.Title>
          <D.Description className="text-lg text-muted">{opened ? t('opened') : t('hint')}</D.Description>

          <div className="relative flex h-[19rem] w-64 items-end justify-center [perspective:900px]">
            {opened && !reduced && (
              <span aria-hidden className="nx-gift-rays pointer-events-none absolute bottom-6 left-1/2 size-96 -translate-x-1/2" />
            )}
            {opened && (
              <div
                className={cn(
                  'absolute bottom-20 left-1/2 w-36 -translate-x-1/2 drop-shadow-xl',
                  reduced ? 'nx-gift-fade' : 'nx-gift-card',
                )}
              >
                <StoryCard
                  source="gift"
                  card={{ id: card.id, world: card.world, title: card.title, image_url: '', earned_at: earnedAt }}
                />
              </div>
            )}
            {opened ? (
              <div className="relative h-52 w-56">
                <Box opened reduced={reduced} />
              </div>
            ) : (
              <button
                type="button"
                aria-label={t('open')}
                onClick={openGift}
                className="lift group relative h-52 w-56 rounded-3xl"
              >
                <Box opened={false} reduced={reduced} />
              </button>
            )}
          </div>

          {!opened && onLater && (
            <Button variant="ghost" onClick={onLater}>
              {t('later')}
            </Button>
          )}

          {ready && (
            <Button className="nx-gift-fade" size="xl" sound={null} iconLeft={<Icon name="check" size={24} />} onClick={claim}>
              {t('claim')}
            </Button>
          )}

          <a
            className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-4"
            href="https://commons.wikimedia.org/wiki/File:Brown_gift_box_with_red_ribbon_and_bow.jpg"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('credit')}
          </a>

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
