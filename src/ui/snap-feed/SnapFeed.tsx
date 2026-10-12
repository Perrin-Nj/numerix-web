'use client';
import { Children, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/motion';

export type SnapFeedProps = {
  ariaLabel: string;
  /** One card per child. */
  children: ReactNode;
  className?: string;
};

const STEP_KEYS = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 } as const;
const TEXT_TARGETS = 'input, textarea, select, [contenteditable="true"]';

/** Vertical scroll-snap feed. Arrow and page keys move focus card to card (TV remote friendly). */
export function SnapFeed({ ariaLabel, children, className }: SnapFeedProps) {
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const items = Children.toArray(children);

  function onKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const dir = STEP_KEYS[e.key as keyof typeof STEP_KEYS];
    if (!dir || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.target as HTMLElement).closest(TEXT_TARGETS)) return;
    const cards = Array.from(listRef.current?.children ?? []) as HTMLElement[];
    const current = cards.findIndex((c) => c.contains(e.target as Node));
    const next = Math.min(cards.length - 1, Math.max(0, (current < 0 ? active : current) + dir));
    e.preventDefault();
    setActive(next);
    cards[next]?.focus({ preventScroll: true });
    cards[next]?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }

  return (
    <ul
      ref={listRef}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        'm-0 h-full max-h-dvh snap-y snap-proximity list-none overflow-y-auto overscroll-contain p-0',
        'scroll-smooth [:root[data-motion=reduced]_&]:scroll-auto motion-reduce:scroll-auto',
        className,
      )}
    >
      {items.map((child, i) => (
        <li
          key={i}
          tabIndex={i === active ? 0 : -1}
          onFocus={() => setActive(i)}
          className="snap-start scroll-mt-2 rounded-lg py-2"
        >
          {child}
        </li>
      ))}
    </ul>
  );
}
