import { cva } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const ART: Record<string, { emoji: string; disc: string }> = {
  fox: { emoji: '🦊', disc: 'bg-world-cuisine/25' },
  owl: { emoji: '🦉', disc: 'bg-world-science/25' },
  bear: { emoji: '🐻', disc: 'bg-world-construction/25' },
  cat: { emoji: '🐱', disc: 'bg-world-sport/25' },
  panda: { emoji: '🐼', disc: 'bg-world-echecs/25' },
  rabbit: { emoji: '🐰', disc: 'bg-world-espace/25' },
  lion: { emoji: '🦁', disc: 'bg-world-construction/25' },
  turtle: { emoji: '🐢', disc: 'bg-world-nature/25' },
};

const avatar = cva(
  'inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-semibold',
  {
    variants: { size: { sm: 'size-8 text-base', md: 'size-12 text-2xl', lg: 'size-20 text-5xl' } },
    defaultVariants: { size: 'md' },
  },
);

export type AvatarProps = { avatarId: string; name: string; size?: 'sm' | 'md' | 'lg' };

export function Avatar({ avatarId, name, size }: AvatarProps) {
  const art = ART[avatarId];
  return (
    <span role="img" aria-label={name} className={cn(avatar({ size }), art ? art.disc : 'bg-brand-soft text-brand')}>
      <span aria-hidden>{art ? art.emoji : name.trim().charAt(0).toUpperCase()}</span>
    </span>
  );
}
