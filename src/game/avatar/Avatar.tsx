import { cva } from 'class-variance-authority';
import { cn } from '@/shared/cn';
import { HumanAvatar } from '@/game/human-avatar';

// Old animal ids keep a fixed person, so profiles saved earlier look the same every time.
const SEED: Record<string, { seed: string; disc: string }> = {
  fox: { seed: 'Pip', disc: 'bg-world-cuisine/25' },
  owl: { seed: 'Ada', disc: 'bg-world-science/25' },
  bear: { seed: 'Bao', disc: 'bg-world-construction/25' },
  cat: { seed: 'Jade', disc: 'bg-world-sport/25' },
  panda: { seed: 'Elia', disc: 'bg-world-echecs/25' },
  rabbit: { seed: 'Nova', disc: 'bg-world-espace/25' },
  lion: { seed: 'Sam', disc: 'bg-world-construction/25' },
  turtle: { seed: 'Mira', disc: 'bg-world-nature/25' },
};

const PX = { sm: 32, md: 48, lg: 80 } as const;

const avatar = cva(
  'inline-flex shrink-0 select-none items-end justify-center overflow-hidden rounded-full font-display font-semibold',
  {
    variants: { size: { sm: 'size-8 text-base', md: 'size-12 text-2xl', lg: 'size-20 text-5xl' } },
    defaultVariants: { size: 'md' },
  },
);

export type AvatarProps = { avatarId: string; name: string; size?: 'sm' | 'md' | 'lg' };

export function Avatar({ avatarId, name, size }: AvatarProps) {
  const art = SEED[avatarId];
  return (
    <span role="img" aria-label={name} className={cn(avatar({ size }), art ? art.disc : 'items-center bg-brand-soft text-brand')}>
      {art ? <HumanAvatar seed={art.seed} size={PX[size ?? 'md']} /> : <span aria-hidden>{name.trim().charAt(0).toUpperCase()}</span>}
    </span>
  );
}
