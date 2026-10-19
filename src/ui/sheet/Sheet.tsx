'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog as D } from 'radix-ui';
import { cn } from '@/shared/cn';
import { useOpenCloseSound } from '@/platform/audio';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: 'bottom' | 'right';
  children?: ReactNode;
};

const SIDE = {
  bottom: 'nx-rise inset-x-0 bottom-0 max-h-[85dvh] rounded-t-lg border-t-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
  right: 'nx-rise inset-y-0 right-0 w-full max-w-sm border-l-2',
} as const;

/** Panel that slides in from a screen edge, for menus and forms. */
export function Sheet({ open, onOpenChange, title, side = 'bottom', children }: SheetProps) {
  const t = useTranslations('ui.sheet');
  useOpenCloseSound(open);
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-fg/50" />
        <D.Content
          aria-describedby={undefined}
          className={cn('fixed z-50 flex flex-col gap-4 overflow-y-auto border-line bg-elevated p-6 text-fg shadow-3', SIDE[side])}
        >
          <div className="flex items-start justify-between gap-3">
            <D.Title className="font-display text-xl font-semibold">{title}</D.Title>
            <D.Close asChild>
              <IconButton size="sm" tooltip={false} sound={null} label={t('close')} icon={<Icon name="x" />} />
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
