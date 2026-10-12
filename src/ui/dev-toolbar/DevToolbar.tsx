'use client';
import { useTranslations } from 'next-intl';
import { Select } from '@/ui/select';

export type DevToolbarProps = {
  scenario: string;
  onScenarioChange: (value: string) => void;
  /** `above-nav` keeps it clear of the bottom navigation. */
  placement?: 'bottom' | 'above-nav';
};

const SCENARIOS = [
  'none',
  'network-error',
  'unauthorized',
  'rate-limited',
  'server-error',
  'daily-limit',
  'narration-fallback',
  'narration-slow',
] as const;

/**
 * Shown while the app runs on demo data. Names the mode so nobody mistakes it for real progress,
 * and lets testers trigger failure scenarios to see every error state.
 */
export function DevToolbar({ scenario, onScenarioChange, placement = 'bottom' }: DevToolbarProps) {
  const t = useTranslations('ui.devToolbar');
  return (
    <details
      className={`fixed start-2 z-40 max-w-xs rounded-md border-2 border-line bg-elevated text-xs text-fg opacity-90 shadow-2 ${placement === 'above-nav' ? 'bottom-24' : 'bottom-2'}`}
    >
      <summary className="cursor-pointer select-none px-2 py-1 font-display font-semibold">{t('badge')}</summary>
      <div className="flex flex-col gap-2 p-3">
        <p className="text-muted">{t('explain')}</p>
        <Select
          label={t('scenario')}
          value={scenario}
          onValueChange={onScenarioChange}
          options={SCENARIOS.map((s) => ({ value: s, label: t(`options.${s}`) }))}
        />
      </div>
    </details>
  );
}
