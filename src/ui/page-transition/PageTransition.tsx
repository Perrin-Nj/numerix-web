'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export type PageTransitionProps = { children: ReactNode };

/** Replays a 200ms fade and slight rise whenever the route changes. CSS only. */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="nx-rise [animation-duration:var(--dur-2)]">
      {children}
    </div>
  );
}
