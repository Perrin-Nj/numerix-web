'use client';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

export type TooltipProps = {
  content: ReactNode;
  /** A single focusable element. */
  children: ReactNode;
};

/**
 * Short hint on hover of its child. Uses the native `title` hint: the Radix tooltip cost about 30 KB of JavaScript on
 * every route for a hint touch screens never show. Every icon button also carries an aria-label, so nothing is lost
 * for screen readers. shortcut: unstyled hint, upgrade to a lazy Radix tooltip if a designed hint is needed.
 */
export function Tooltip({ content, children }: TooltipProps) {
  if (typeof content !== 'string' || !isValidElement(children)) return <>{children}</>;
  const child = children as ReactElement<{ title?: string }>;
  return cloneElement(child, { title: child.props.title ?? content });
}
