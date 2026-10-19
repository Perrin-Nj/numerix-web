'use client';
import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AnswerValue, FeedItem, Outcome } from '@/data/api/types';
import { AiBadge } from '@/game/ai-badge';
import { ChoiceButton, type ChoiceState } from '@/game/choice-button';
import { IllustrationFrame } from '@/game/illustration-frame';
import { WorldScene } from '@/game/world-scene';
import { MascotBubble } from '@/game/mascot-bubble';
import { NarrationText } from '@/game/narration-text';
import { OutcomeBeat } from '@/game/outcome-beat';
import { ReactionBar, type ReactionState } from '@/game/reaction-bar';
import { Button } from '@/ui/button';

export type FeedAnswerResult = { outcome: Outcome; message: string };
export type FeedCardProps = {
  item: FeedItem;
  onReact: (item: FeedItem, next: ReactionState) => void;
  /** Rejects when the answer could not be sent; the card then lets the child try again. */
  onAnswer: (item: FeedItem, answer: AnswerValue) => Promise<FeedAnswerResult>;
  onCta: (item: FeedItem) => void;
  /** True while this card is the one on screen. */
  active?: boolean;
};

function FeedCardBase({ item, onReact, onAnswer, onCta, active = false }: FeedCardProps) {
  const t = useTranslations('game.feedCard');
  const [picked, setPicked] = useState<AnswerValue | null>(null);
  const [result, setResult] = useState<FeedAnswerResult | null>(null);

  async function answer(value: AnswerValue) {
    if (picked !== null) return;
    setPicked(value);
    try {
      setResult(await onAnswer(item, value));
    } catch {
      setPicked(null); // the screen already showed the error
    }
  }

  const choiceState = (v: AnswerValue): ChoiceState => (picked === null ? 'idle' : v === picked ? 'selected' : 'locked');

  const author = item.author?.name ? (
    <p className="flex items-center gap-2 text-sm font-semibold text-muted">
      <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-lg">
        {item.author.emoji}
      </span>
      {t('author', { name: item.author.name })}
    </p>
  ) : null;

  return (
    <article
      data-active={active}
      aria-label={item.title}
      className="flex min-h-[calc(100dvh-7rem)] flex-col justify-between gap-4 rounded-lg border-2 border-line bg-elevated p-4 shadow-1 md:p-6"
    >
      <header className="flex items-center justify-between gap-3">
        <span className="font-display text-base font-bold text-muted">{t(`kind.${item.kind}`)}</span>
        <AiBadge />
      </header>

      <div className="flex flex-1 flex-col justify-center gap-4">
        {item.kind === 'fun_fact' ? (
          <>
            <span aria-hidden className="block h-32 overflow-hidden rounded-lg">
              <WorldScene world={item.world} variant="banner" />
            </span>
            {author}
            <h2 className="font-display text-3xl font-bold text-fg md:text-4xl">{item.title}</h2>
            <MascotBubble pose="think" size="lg">
              {item.text}
            </MascotBubble>
          </>
        ) : (
          <>
            <IllustrationFrame world={item.world} alt={item.title} />
            {author}
            <h2 className="font-display text-2xl font-bold text-fg md:text-3xl">{item.title}</h2>
            <p className="font-display text-xl text-fg">{item.text}</p>
          </>
        )}

        {item.kind === 'puzzle' && item.puzzle && (
          <section aria-label={t('puzzleLabel')} className="flex flex-col gap-3">
            <p className="font-display text-2xl font-bold text-fg">{item.puzzle.math_text}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {item.puzzle.choices.slice(0, 4).map((c, i) => (
                <ChoiceButton key={`${i}-${String(c)}`} value={c} index={i} state={choiceState(c)} onSelect={answer} />
              ))}
            </div>
            <div aria-live="polite">
              {picked !== null && !result && <NarrationText text={null} status="pending" />}
              {result && (
                <OutcomeBeat outcome={result.outcome}>
                  <NarrationText text={result.message} status="ready" />
                </OutcomeBeat>
              )}
            </div>
          </section>
        )}

        {item.cta && item.kind !== 'puzzle' && (
          <Button size="lg" className="self-start" onClick={() => onCta(item)}>
            {item.cta.label}
          </Button>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <ReactionBar liked={item.liked} saved={item.saved} onChange={(next) => onReact(item, next)} />
        {item.cta && item.kind === 'puzzle' && result && (
          <Button variant="secondary" onClick={() => onCta(item)}>
            {item.cta.label}
          </Button>
        )}
      </footer>
    </article>
  );
}

/** Memoized feed card: one question or story step in the vertical feed. */
export const FeedCard = memo(FeedCardBase);
