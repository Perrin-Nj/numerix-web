import { cva } from 'class-variance-authority';
import { cn } from '@/shared/cn';

// Old animal ids keep a fixed tint, so profiles saved earlier look the same every time. No drawn faces: a monogram only.
const SEED: Record<string, { disc: string }> = {
  fox: { disc: 'bg-world-cuisine/25' },
  owl: { disc: 'bg-world-science/25' },
  bear: { disc: 'bg-world-construction/25' },
  cat: { disc: 'bg-world-sport/25' },
  panda: { disc: 'bg-world-echecs/25' },
  rabbit: { disc: 'bg-world-espace/25' },
  lion: { disc: 'bg-world-construction/25' },
  turtle: { disc: 'bg-world-nature/25' },
};

const avatar = cva(
  'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-display font-semibold',
  {
    variants: { size: { sm: 'size-8 text-base', md: 'size-12 text-2xl', lg: 'size-20 text-5xl' } },
    defaultVariants: { size: 'md' },
  },
);

export type AvatarProps = { avatarId: string; name: string; size?: 'sm' | 'md' | 'lg' };

/** Round avatar of a child, drawn from the avatar id with the name as the accessible label. */
export function Avatar({ avatarId, name, size }: AvatarProps) {
  const art = SEED[avatarId];
  return (
    <span role="img" aria-label={name} className={cn(avatar({ size }), art ? cn(art.disc, 'text-fg') : 'bg-brand-soft text-brand')}>
      <span aria-hidden>{name.trim().charAt(0).toUpperCase()}</span>
    </span>
  );
}
