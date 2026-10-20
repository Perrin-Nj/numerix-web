'use client';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { useTheme, type ThemeChoice } from '@/platform/theme';
import { IconButton } from '@/ui/icon-button';
import { Icon, type IconName } from '@/ui/icon';

export type ThemeToggleProps = { variant?: 'icon' | 'row'; className?: string };

const ORDER: ThemeChoice[] = ['system', 'light', 'dark', 'hc'];
const ICON: Record<ThemeChoice, IconName> = { system: 'monitor', light: 'sun', dark: 'moon', hc: 'contrast' };

/** `icon` cycles through the four choices; `row` shows them all as a radio group. */
export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const t = useTranslations('ui.themeToggle');
  const { theme, setTheme } = useTheme();
  const { play } = useSound();

  if (variant === 'icon') {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    return (
      <IconButton
        label={t('change', { current: t(theme) })}
        sound="switch"
        variant="secondary"
        className={className}
        icon={<Icon name={ICON[theme]} size={24} />}
        onClick={() => setTheme(next)}
      />
    );
  }

  return (
    <div role="radiogroup" aria-label={t('group')} className={cn('flex flex-wrap gap-2', className)}>
      {ORDER.map((choice) => {
        const on = choice === theme;
        return (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              play('switch');
              setTheme(choice);
            }}
            className={cn(
              'lift inline-flex min-h-12 items-center gap-2 rounded-md border px-4 font-display font-semibold',
              on ? 'border-brand bg-brand-soft text-fg' : 'border-line bg-elevated text-fg',
            )}
          >
            <Icon name={ICON[choice]} size={20} />
            {t(choice)}
            {on && <Icon name="check" size={18} />}
          </button>
        );
      })}
    </div>
  );
}
