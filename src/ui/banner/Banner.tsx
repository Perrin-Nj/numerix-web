'use client';
import { useTranslations } from 'next-intl';
import { cva } from 'class-variance-authority';
import { cn } from '@/shared/cn';
import { Icon, type IconName } from '@/ui/icon';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';

const banner = cva('flex w-full items-start gap-3 border-y-2 px-4 py-3 text-fg', {
  variants: {
    tone: {
      info: 'border-info bg-sunken',
      success: 'border-success bg-sunken',
      warning: 'border-warning bg-sunken',
      danger: 'border-danger bg-sunken',
    },
  },
  defaultVariants: { tone: 'info' },
});

const ICON: Record<BannerTone, { name: IconName; color: string }> = {
  info: { name: 'info', color: 'text-info' },
  success: { name: 'check', color: 'text-success' },
  warning: { name: 'alert', color: 'text-warning' },
  danger: { name: 'alert', color: 'text-danger' },
};

type BannerTone = 'info' | 'success' | 'warning' | 'danger';

export type BannerProps = {
  tone?: BannerTone;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
};

/** Inline message strip with a tone, optional action and dismiss button. */
export function Banner({ tone = 'info', title, description, action, onDismiss }: BannerProps) {
  const t = useTranslations('ui.banner');
  const icon = ICON[tone];
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={cn(banner({ tone }))}>
      <Icon name={icon.name} size={22} className={cn('mt-0.5', icon.color)} />
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold">{title}</p>
        {description && <p className="text-muted">{description}</p>}
      </div>
      {action && (
        <Button size="sm" variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {onDismiss && <IconButton size="sm" label={t('dismiss')} icon={<Icon name="x" />} onClick={onDismiss} sound="minimize" />}
    </div>
  );
}
