import { Icon } from '@/ui/icon';

export type InlineErrorProps = { message: string; recovery?: string; id?: string };

export function InlineError({ message, recovery, id }: InlineErrorProps) {
  return (
    <div id={id} role="alert" className="flex items-start gap-2 text-sm text-danger">
      <Icon name="alert" size={18} className="mt-0.5" />
      <p>
        <span className="font-semibold">{message}</span>
        {recovery && <span className="block text-fg">{recovery}</span>}
      </p>
    </div>
  );
}
