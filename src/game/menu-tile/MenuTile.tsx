'use client';
import { memo } from 'react';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { Icon, type IconName } from '@/ui/icon';

export type MenuTileTone = 'brand' | 'success' | 'warning' | 'info' | 'world';
export type MenuTileProps = {
  icon: IconName;
  label: string;
  hint?: string;
  badge?: number | string;
  tone?: MenuTileTone;
  onSelect: () => void;
  className?: string;
};

// Static class names so Tailwind can see them.
const TONE: Record<MenuTileTone, { disc: string; edge: string }> = {
  brand: { disc: 'bg-brand text-brand-fg', edge: 'hover:border-brand' },
  success: { disc: 'bg-success text-brand-fg', edge: 'hover:border-success' },
  warning: { disc: 'bg-warning text-brand-fg', edge: 'hover:border-warning' },
  info: { disc: 'bg-info text-brand-fg', edge: 'hover:border-info' },
  world: { disc: 'bg-world-nature text-white', edge: 'hover:border-world-nature' },
};

function MenuTileBase({ icon, label, hint, badge, tone = 'brand', onSelect, className }: MenuTileProps) {
  const { play } = useSound();
  const hasBadge = badge !== undefined && badge !== 0 && badge !== '';
  return (
    <button
      type="button"
      onClick={() => {
        play('select');
        onSelect();
      }}
      className={cn(
        'lift lift-tilt group relative flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-lg bg-elevated p-4 text-center text-fg shadow-1',
        TONE[tone].edge,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-16 items-center justify-center rounded-full shadow-1 transition-transform duration-(--dur-3) ease-(--ease-spring) group-hover:-rotate-6 group-hover:scale-110 group-focus-visible:scale-110',
          TONE[tone].disc,
          hasBadge && 'nx-wobble',
        )}
      >
        <Icon name={icon} size={32} />
      </span>
      <span className="font-display text-xl font-bold">{label}</span>
      {hint && <span className="text-sm text-muted">{hint}</span>}
      {hasBadge && (
        <span className="nx-pop absolute end-3 top-3 flex min-w-7 items-center justify-center rounded-full bg-danger px-2 py-0.5 text-sm font-bold text-brand-fg shadow-1">
          {badge}
        </span>
      )}
    </button>
  );
}

/** Memoized big tile for the home menu (icon, label, optional badge). */
export const MenuTile = memo(MenuTileBase);
