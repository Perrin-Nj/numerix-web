'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFormatAnswer } from '@/platform/format';
import { Button } from '@/ui/button';
import { Dialog } from '@/ui/dialog';
import { Icon } from '@/ui/icon';
import type { AnswerValue } from '@/data/api/types';

export type PreviousRevealData = {
  question: string;
  correctAnswer: AnswerValue | null;
  explain?: string | null;
  feedback?: string | null;
  text?: string;
};

export type PreviousRevealProps = {
  reveal: PreviousRevealData;
  /** Stories only: start with the dialog open. */
  defaultOpen?: boolean;
  /** Lets the screen ignore answer shortcuts while the dialog is open. */
  onOpenChange?: (open: boolean) => void;
};

/** A quiet button that reopens the last question's answer in a read-only dialog. Memory only, Escape closes. */
export function PreviousReveal({ reveal, defaultOpen = false, onOpenChange }: PreviousRevealProps) {
  const t = useTranslations('game.previousReveal');
  const format = useFormatAnswer();
  const [open, setOpenState] = useState(defaultOpen);
  const setOpen = (o: boolean) => {
    setOpenState(o);
    onOpenChange?.(o);
  };
  return (
    <>
      <Button variant="secondary" size="sm" iconLeft={<Icon name="info" />} onClick={() => setOpen(true)}>
        {t('button')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={t('title')} footer={<Button onClick={() => setOpen(false)}>{t('close')}</Button>}>
        <div data-previous-reveal="" className="flex flex-col gap-3 text-base">
          <p className="font-display text-lg font-semibold">{reveal.question}</p>
          {reveal.correctAnswer != null && (
            <p>
              <span className="text-muted">{t('answer')} </span>
              <strong className="font-display text-xl">{format(reveal.correctAnswer)}</strong>
            </p>
          )}
          {reveal.text && <p className="text-muted">{reveal.text}</p>}
          {reveal.feedback && <p>{reveal.feedback}</p>}
          {reveal.explain && <p className="rounded-md bg-sunken p-3">{reveal.explain}</p>}
        </div>
      </Dialog>
    </>
  );
}
