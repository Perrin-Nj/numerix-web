'use client';
import type { ReactNode } from 'react';
import { Tooltip as T } from 'radix-ui';

export type TooltipProps = {
  content: ReactNode;
  /** A single focusable element. */
  children: ReactNode;
};

/** Short hint shown on hover and focus of its child. */
export function Tooltip({ content, children }: TooltipProps) {
  return (
    <T.Provider delayDuration={300}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            sideOffset={6}
            className="nx-pop z-50 max-w-64 rounded-md border border-line bg-elevated px-3 py-2 text-sm text-fg shadow-2"
          >
            {content}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
