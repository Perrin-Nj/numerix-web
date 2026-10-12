import type { ReactNode } from 'react';

export type PopProps = { className?: string; children: ReactNode };

/** Scales in on mount. */
export function Pop({ className, children }: PopProps) {
  return <span className={className ? `nx-pop inline-block ${className}` : 'nx-pop inline-block'}>{children}</span>;
}
