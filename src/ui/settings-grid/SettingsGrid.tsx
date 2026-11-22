import type { ReactNode } from 'react';
import { cn } from '@/shared/cn';

export type SettingsGridProps = { children: ReactNode; className?: string };

/**
 * The one layout for a stack of setting cards (SwitchRow, ChoiceChips, Select): every card takes the full width of its container on a
 * phone, two equal columns once the container is 42 rem wide, and a lone last card spans the row. It follows the container, not the
 * screen, so the same markup is right in a 672 px parent panel and in a 4K child panel. Use `col-span-full` for a wide item.
 */
export function SettingsGrid({ children, className }: SettingsGridProps) {
  return (
    <div className="@container w-full">
      <div className={cn('grid grid-cols-1 gap-3 @2xl:grid-cols-2 @2xl:[&>:last-child:nth-child(odd)]:col-span-full', className)}>{children}</div>
    </div>
  );
}
