import type { ReactNode } from 'react';
import { cn } from '@/shared/cn';

export type AppHeaderProps = {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

/** Sticky screen header. Title is centered; empty slots leave no hole. */
export function AppHeader({ title, left, right, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b-2 border-line bg-bg pt-[env(safe-area-inset-top)]',
        className,
      )}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        {left && <div className="flex shrink-0 items-center gap-2">{left}</div>}
        <h1 className="min-w-0 flex-1 truncate font-display text-xl font-semibold text-fg">{title}</h1>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}
