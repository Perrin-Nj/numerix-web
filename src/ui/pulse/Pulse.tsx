import type { ReactNode } from 'react';

export type PulseProps = { active?: boolean; className?: string; children: ReactNode };

/** Gentle looping pulse to draw the eye. Stops when `active` is false. */
export function Pulse({ active = true, className, children }: PulseProps) {
  const cls = ['inline-block', active ? 'nx-pulse' : '', className].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}
