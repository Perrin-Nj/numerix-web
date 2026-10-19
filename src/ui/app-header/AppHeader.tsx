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
        'sticky top-0 z-20 border-b-2 border-line bg-bg/90 pt-[env(safe-area-inset-top)] shadow-1 backdrop-blur supports-[not(backdrop-filter:blur(1px))]:bg-bg',
        className,
      )}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-1 px-4 sm:gap-3 sm:px-6 lg:px-8">
        {left && <div className="flex shrink-0 items-center gap-2">{left}</div>}
        <h1 className="min-w-0 flex-1 line-clamp-2 font-display text-lg font-semibold leading-tight text-fg sm:text-xl">{title}</h1>
        {right && <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">{right}</div>}
      </div>
    </header>
  );
}
