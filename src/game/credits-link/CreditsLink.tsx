'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';

export type CreditsLinkProps = { className?: string };

/** Small footer-style link to the picture credits page (/credits). Safe to drop into any screen or footer. */
export function CreditsLink({ className }: CreditsLinkProps) {
  const t = useTranslations('game.creditsLink');
  return (
    <Link href="/credits" className={cn('inline-flex min-h-11 items-center px-2 text-sm font-semibold text-muted underline underline-offset-4 hover:text-fg', className)}>
      {t('label')}
    </Link>
  );
}
