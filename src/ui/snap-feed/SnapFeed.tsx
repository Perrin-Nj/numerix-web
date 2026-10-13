'use client';
import { Children, isValidElement, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/motion';

export type SnapFeedProps = {
  ariaLabel: string;
  /** One card per child. */
  children: ReactNode;
  className?: string;
  /** Extra classes for each card wrapper, e.g. a full-height card. */
  itemClassName?: string;
  /** Called when a card becomes the one mostly in view (scroll, swipe or keys). */
  onActiveChange?: (index: number) => void;
  /** `box` scrolls inside the list. `page` uses the page scroll (one scrollbar) and snaps the document. */
  scroll?: 'box' | 'page';
};

const STEP_KEYS = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 } as const;
const TEXT_TARGETS = 'input, textarea, select, [contenteditable="true"]';

/** Vertical scroll-snap feed. Arrow and page keys move focus card to card (TV remote friendly). */
export function SnapFeed({ ariaLabel, children, className, itemClassName, onActiveChange, scroll = 'box' }: SnapFeedProps) {
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const items = Children.toArray(children);

  const count = items.length;
  useEffect(() => {
    const list = listRef.current;
    if (!onActiveChange || !list || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) onActiveChange(Array.prototype.indexOf.call(list.children, e.target));
        }
      },
      { root: scroll === 'page' ? null : list, threshold: 0.6 },
    );
    Array.from(list.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [onActiveChange, count, scroll]);

  // Page mode: the document itself snaps, so there is exactly one scrollbar
  useEffect(() => {
    if (scroll !== 'page') return;
    const root = document.documentElement;
    const before = root.style.scrollSnapType;
    root.style.scrollSnapType = 'y proximity';
    return () => {
      root.style.scrollSnapType = before;
    };
  }, [scroll]);

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
        'm-0 list-none p-0',
        scroll === 'box' && 'h-full max-h-dvh snap-y snap-proximity overflow-y-auto overscroll-contain scroll-smooth [:root[data-motion=reduced]_&]:scroll-auto motion-reduce:scroll-auto',
        className,
      )}
    >
      {items.map((child, i) => (
        <li
          key={isValidElement(child) && child.key != null ? child.key : i}
          tabIndex={i === active ? 0 : -1}
          onFocus={() => setActive(i)}
          className={cn('snap-start scroll-mt-2 rounded-lg py-2', itemClassName)}
        >
          {child}
        </li>
      ))}
    </ul>
  );
}
