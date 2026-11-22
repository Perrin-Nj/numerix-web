'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { Avatar } from '@/game/avatar';
import { Icon } from '@/ui/icon';

export type ChildCardProps = {
  avatarId: string;
  name: string;
  /** Already translated, e.g. "Année 3". */
  gradeLabel: string;
  /** Status chips (consent, PIN). */
  badges?: ReactNode;
  /** Main actions: play as, overview. */
  actions?: ReactNode;
  /** When given, the card ends with a visible "Delete profile" action. The confirmation lives with the caller. */
  onDelete?: () => void;
  className?: string;
};

/**
 * A child's profile on the parent side. Calm and flat: a thin line, a small radius (--radius-card), no gradient bar and no
 * heavy shadow, so it reads like a form card, not a toy. The delete action is always on the card, in plain words.
 */
export function ChildCard({ avatarId, name, gradeLabel, badges, actions, onDelete, className }: ChildCardProps) {
  const t = useTranslations('game.childCard');
  return (
    <article data-child-card="" aria-label={name} className={cn('flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-elevated p-4 text-fg', className)}>
      <div className="flex items-center gap-3">
        <Avatar avatarId={avatarId} name={name} size="md" />
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-bold leading-tight">{name}</h2>
          <p className="text-muted">{gradeLabel}</p>
        </div>
      </div>
      {badges && <div className="mt-3 flex flex-wrap gap-2">{badges}</div>}
      {actions && <div className="mb-4 mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
      {onDelete && (
        <div className="mt-auto border-t border-line pt-3">
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('deleteFor', { name })}
            className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-2 font-semibold text-danger hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Icon name="trash" size={18} />
            {t('delete')}
          </button>
        </div>
      )}
    </article>
  );
}
