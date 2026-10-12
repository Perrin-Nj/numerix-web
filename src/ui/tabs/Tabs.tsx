'use client';
import type { ReactNode } from 'react';
import { Tabs as T } from 'radix-ui';

export type TabItem = { value: string; label: string; content: ReactNode };
export type TabsProps = { items: TabItem[]; defaultValue?: string; ariaLabel?: string };

export function Tabs({ items, defaultValue, ariaLabel }: TabsProps) {
  return (
    <T.Root defaultValue={defaultValue ?? items[0]?.value} className="flex flex-col gap-4">
      <T.List aria-label={ariaLabel} className="flex gap-1 rounded-lg bg-sunken p-1">
        {items.map((it) => (
          <T.Trigger
            key={it.value}
            value={it.value}
            className="min-h-12 flex-1 rounded-md px-4 font-display font-semibold text-muted transition-colors data-[state=active]:bg-elevated data-[state=active]:text-fg data-[state=active]:shadow-1"
          >
            {it.label}
          </T.Trigger>
        ))}
      </T.List>
      {items.map((it) => (
        <T.Content key={it.value} value={it.value} className="nx-rise">
          {it.content}
        </T.Content>
      ))}
    </T.Root>
  );
}
