'use client';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { Button } from '@/ui/button';
import { CHOICE_STATE } from '@/game/choice-button';
import type { InputProps } from './kind';

/** Moves `id` to index `to` without changing the others. */
export function moveTo(list: string[], id: string, to: number): string[] {
  const from = list.indexOf(id);
  if (from < 0 || to < 0 || to >= list.length || from === to) return list;
  const next = list.slice();
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

/**
 * Ordering. Tap a card to put it in the next slot; tap a placed card to take it back. To fix the order, drag a card by
 * its handle (pointer events, works with a finger or a mouse) or focus it and press the arrow keys. No timer.
 */
export function OrderInput({ question, phase, chosen, outcome, onSubmit }: InputProps) {
  const t = useTranslations('game.questionInput');
  const { play } = useSound();
  const cards = question.items?.cards ?? [];
  const locked = phase !== 'question';
  const [placed, setPlaced] = useState<string[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const text = (id: string) => cards.find((c) => c.id === id)?.text ?? id;
  const shownIds = locked && Array.isArray(chosen) && chosen.every((x) => typeof x === 'string') ? (chosen as string[]) : placed;
  const pool = cards.filter((c) => !placed.includes(c.id));
  const done = placed.length === cards.length;
  const state = phase === 'question' ? 'idle' : phase === 'answering' ? 'selected' : outcome === 'correct' ? 'success' : 'miss';

  const place = (id: string) => {
    play('tap');
    setPlaced((p) => [...p, id]);
  };
  const take = (id: string) => {
    play('tap');
    setPlaced((p) => p.filter((x) => x !== id));
  };

  const onHandleMove = (e: PointerEvent<HTMLElement>, id: string) => {
    if (dragging !== id) return;
    // The row under the pointer is the new slot of the dragged card
    const entries = placed.map((pid) => [pid, rows.current.get(pid)?.getBoundingClientRect()] as const);
    const idx = entries.findIndex(([, r]) => r && e.clientY < r.bottom);
    setPlaced((p) => moveTo(p, id, idx < 0 ? p.length - 1 : idx));
  };
  const onRowKey = (e: KeyboardEvent<HTMLElement>, id: string) => {
    const i = placed.indexOf(id);
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setPlaced((p) => moveTo(p, id, i + (e.key === 'ArrowUp' ? -1 : 1)));
      requestAnimationFrame(() => rows.current.get(id)?.querySelector<HTMLElement>('[data-handle]')?.focus());
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      take(id);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <ol aria-label={t('yourOrder')} className="m-0 flex list-none flex-col gap-1.5 p-0">
        {cards.map((_, slot) => {
          const id = shownIds[slot];
          // Only the next free place is drawn: the list grows as cards are placed, which keeps the screen short
          if (!id && slot > shownIds.length) return null;
          if (!id) {
            return (
              <li key={`s${slot}`} aria-label={t('emptySlot', { n: slot + 1 })} className="flex min-h-11 items-center gap-3 rounded-md border-2 border-dashed border-line px-3 text-muted">
                <span aria-hidden className="flex size-8 items-center justify-center rounded-full border-2 border-line text-base font-bold">
                  {slot + 1}
                </span>
              </li>
            );
          }
          return (
            <li
              key={id}
              ref={(el) => {
                if (el) rows.current.set(id, el);
                else rows.current.delete(id);
              }}
              className={cn(
                'flex min-h-12 items-center gap-1 rounded-md border ps-1 font-display text-lg font-semibold transition-shadow',
                CHOICE_STATE[state === 'idle' ? 'selected' : state],
                dragging === id && 'shadow-3',
              )}
            >
              <button
                type="button"
                data-handle=""
                disabled={locked}
                aria-label={t('move', { text: text(id), n: slot + 1 })}
                onKeyDown={(e) => onRowKey(e, id)}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging(id);
                }}
                onPointerMove={(e) => onHandleMove(e, id)}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
                className="flex size-11 shrink-0 touch-none items-center justify-center rounded-full bg-sunken text-base font-bold text-fg"
              >
                {slot + 1}
              </button>
              <button type="button" disabled={locked} onClick={() => take(id)} aria-label={t('takeBack', { text: text(id) })} className="min-h-12 min-w-0 flex-1 px-2 text-start">
                {text(id)}
              </button>
            </li>
          );
        })}
      </ol>
      {!locked && (
        <div role="group" aria-label={t('cards')} className="flex flex-wrap gap-2">
          {pool.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => place(c.id)}
              className={cn('lift min-h-12 rounded-md border px-3 font-display text-lg font-semibold', CHOICE_STATE.idle)}
            >
              {c.text}
            </button>
          ))}
        </div>
      )}
      {!locked && (
        <Button size="lg" fullWidth disabled={!done} onClick={() => onSubmit(placed)}>
          {t('check')}
        </Button>
      )}
    </div>
  );
}
