import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui/icon';

export type AiBadgeProps = { className?: string };

/** Required on every feed item: the content is AI generated. */
export function AiBadge({ className }: AiBadgeProps) {
  const t = useTranslations('game.aiBadge');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-brand-soft px-3 py-1 text-sm font-semibold text-fg',
        className,
      )}
    >
      <Icon name="sparkles" size={16} />
      {t('label')}
    </span>
  );
}
