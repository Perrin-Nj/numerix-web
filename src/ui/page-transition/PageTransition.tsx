'use client';
import { ViewTransition, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export type PageTransitionProps = { children: ReactNode };

/**
 * Route change: View Transitions API (cross-fade plus a short rise) where the browser has it, otherwise a 200ms CSS
 * fade and rise. Reduced motion switches both off (globals.css).
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} name="nx-page" default="auto">
      <div
        key={pathname}
        className="nx-rise nx-page-fallback"
        // backwards fill: a lingering transform would trap position:fixed children (nav, pause button)
        style={{ animationDuration: 'var(--dur-2)', animationFillMode: 'backwards' }}
      >
        {children}
      </div>
    </ViewTransition>
  );
}
