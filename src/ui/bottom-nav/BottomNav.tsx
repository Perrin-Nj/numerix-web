'use client';
import Link from 'next/link';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { Icon, type IconName } from '@/ui/icon';

export type BottomNavItem = { href: string; label: string; icon: IconName; active: boolean };
export type BottomNavProps = { items: BottomNavItem[]; ariaLabel: string };

/** Primary navigation outside of play. Never shown on the story screen. */
export function BottomNav({ items, ariaLabel }: BottomNavProps) {
  const { play } = useSound();
  return (
    <nav
      aria-label={ariaLabel}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-xl border-t-2 border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_rgb(0_0_0/0.07)] backdrop-blur supports-[not(backdrop-filter:blur(1px))]:bg-bg"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around gap-1 px-2">
        {items.map((it) => (
          <li key={it.href} className="flex-1">
            <Link
              href={it.href}
              onClick={() => play('switch')}
              aria-current={it.active ? 'page' : undefined}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 font-display text-sm font-semibold transition-[transform,background-color,color] duration-[var(--dur-1)] active:scale-95',
                it.active ? 'bg-brand-soft text-brand shadow-[inset_0_-3px_0_var(--brand)]' : 'text-muted hover:bg-sunken',
              )}
            >
              <Icon name={it.icon} size={26} />
              <span>{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
