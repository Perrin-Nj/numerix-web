'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog as D } from 'radix-ui';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  tone?: 'default' | 'danger';
  dismissible?: boolean;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  tone = 'default',
  dismissible = true,
}: DialogProps) {
  const t = useTranslations('ui.dialog');
  const block = (e: Event) => {
    if (!dismissible) e.preventDefault();
  };
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-fg/50" />
        <D.Content
          onEscapeKeyDown={block}
          onPointerDownOutside={block}
          onInteractOutside={block}
          className={cn(
            'nx-pop fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-lg border-2 bg-elevated p-6 text-fg shadow-3',
            tone === 'danger' ? 'border-danger' : 'border-line',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <D.Title className={cn('font-display text-xl font-semibold', tone === 'danger' && 'text-danger')}>
              {title}
            </D.Title>
            {dismissible && (
              <D.Close asChild>
                <IconButton size="sm" tooltip={false} label={t('close')} icon={<Icon name="x" />} />
              </D.Close>
            )}
          </div>
          {description ? (
            <D.Description className="text-muted">{description}</D.Description>
          ) : (
            <D.Description className="sr-only">{title}</D.Description>
          )}
          {children}
          {footer && <div className="flex flex-wrap justify-end gap-3">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
