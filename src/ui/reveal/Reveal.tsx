import type { ElementType, ReactNode } from 'react';

export type RevealProps = {
  delayMs?: number;
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

/** Fades and rises in on mount. Reduced motion zeroes the duration through tokens. */
export function Reveal({ delayMs = 0, as: Tag = 'div', className, children }: RevealProps) {
  return (
    <Tag className={className ? `nx-rise ${className}` : 'nx-rise'} style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}>
      {children}
    </Tag>
  );
}
