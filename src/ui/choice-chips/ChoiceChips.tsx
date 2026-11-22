import { Button } from '@/ui/button';
import { cn } from '@/shared/cn';

export type ChoiceChipsProps<T extends string | number> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
};

/** A segmented choice as a card, the same shape and width as a SwitchRow, so a column of settings reads as one grid. */
export function ChoiceChips<T extends string | number>({ label, value, options, onChange, className }: ChoiceChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn('flex min-h-12 w-full flex-col justify-center gap-2 rounded-[var(--radius-control)] border border-line bg-elevated px-3 py-2', className)}>
      <span className="font-display font-semibold text-fg">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button key={String(o.value)} size="sm" className="min-h-12" variant={o.value === value ? 'primary' : 'secondary'} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
