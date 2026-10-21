'use client';
import { memo, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useReducedMotion } from '@/platform/motion';
import type { StoryCard as StoryCardData } from '@/data/api/types';
import { IllustrationFrame } from '@/game/illustration-frame';
import { artFor, sourceOf, PAPERS, TAPES, type Art } from './art';
import { photosFor, type CardPhoto } from './card-photos';
import { metalGradient } from './CardArt';
import { Icon } from '@/ui/icon';
import { cardStyleFor, type CardSource } from './card-style';

export type StoryCardProps = {
  card: StoryCardData;
  onOpen?: (card: StoryCardData) => void;
  variant?: 'tile' | 'reveal';
  /** Chapter = storybook postcard, challenge = medal badge, gift = wrapped present. Inferred from the card id when omitted. */
  source?: CardSource;
  /** Photo picked for this card by the list (photosFor), so no two cards of one list share a picture. Picked from the card alone when omitted. */
  photo?: CardPhoto;
};

const FACE = '[grid-area:1/1] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]';
const NOTCH = 'polygon(14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px),0 14px)';
const SHIELD = 'polygon(50% 0,100% 12%,100% 58%,50% 100%,0 58%,0 12%)';
const HAND = "'Segoe Script','Bradley Hand',Georgia,serif";
const STICKER_SHAPE: Record<string, { cls: string; clip?: string }> = {
  stamp: { cls: 'size-11 [outline:3px_dotted_#c9b78b] [outline-offset:-3px]' },
  circle: { cls: 'size-12 rounded-full border-2 border-stone-700/40' },
  pill: { cls: 'h-6 w-16 rounded-full border-2 border-stone-700/40' },
  star: { cls: 'size-16', clip: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' },
  tag: { cls: 'h-7 w-16 ps-1', clip: 'polygon(0 0,82% 0,100% 50%,82% 100%,0 100%)' },
};
const STAMP_STYLE = {
  ring: 'rounded-full border-2 border-stone-500/60',
  box: 'rounded-none border-2 border-stone-500/60',
  double: 'rounded-sm border-4 border-double border-stone-500/60',
  solid: 'rounded bg-stone-500/20',
} as const;
const hsl = (h: number, s: number, l: number, a = 1) => `hsl(${h} ${s}% ${l}% / ${a})`;

/** Parallax layer: moves with the pointer, deeper layers move more and sit closer to the viewer. */
function Layer({ depth, className, children }: { depth: number; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn('absolute', className)}
      style={{ transform: `translate3d(calc(var(--px,0) * ${depth}px), calc(var(--py,0) * ${depth}px), ${depth * 2}px)` }}
    >
      {children}
    </span>
  );
}

function Sparkles({ art, reduced, n = 5, color = '#fff6c8' }: { art: Art; reduced: boolean; n?: number; color?: string }) {
  return (
    <>
      {art.stars.slice(0, n).map((s, i) => (
        <span
          key={i}
          aria-hidden
          className={cn('pointer-events-none absolute bg-current', !reduced && 'nx-twinkle')}
          style={{ left: `${s.x}%`, top: `${s.y}%`, color, width: `${8 + s.r * 6}px`, height: `${8 + s.r * 6}px`, clipPath: 'polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)', animationDelay: `${i * 0.43}s`, animationIterationCount: 'infinite' }}
        >
        </span>
      ))}
    </>
  );
}

function Foil({ hue, angle, className }: { hue: number; angle: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 mix-blend-color-dodge', className)}
      style={{
        background: `linear-gradient(${angle}deg, hsl(${hue} 90% 60% / 0) 15%, hsl(${(hue + 70) % 360} 90% 65% / 0.7) 40%, hsl(${(hue + 160) % 360} 90% 65% / 0.7) 60%, hsl(${hue} 90% 60% / 0) 85%)`,
      }}
    />
  );
}

/** Wrapped-present dressing: ribbon cross over the top corner with a bow and a bottom banner. */
function GiftDress({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 start-6 w-4 bg-red-600/85 shadow-1" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-10 h-4 bg-red-600/85 shadow-1" />
      <Layer depth={14} className="start-2 top-5">
        <span aria-hidden className="flex">
          <span className="size-7 -rotate-45 rounded-full rounded-br-none border-2 border-red-900 bg-red-500" />
          <span className="-ms-1 size-7 rotate-45 rounded-full rounded-bl-none border-2 border-red-900 bg-red-500" />
          <span className="absolute start-[0.85rem] top-2 size-3.5 rounded-full border-2 border-red-900 bg-red-700" />
        </span>
      </Layer>
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 bg-gradient-to-r from-amber-700 via-amber-300 to-amber-700 py-1 text-center font-display text-sm font-bold uppercase tracking-widest text-amber-950"
      >
        {label}
      </span>
    </>
  );
}

type Parts = { photo: string; art: Art; title: string; date: string; rarity: string; hue: number; angle: number; reduced: boolean; image: ReactNode; gift: string; giftBack: string };

function PostcardFront({ art, title, date, rarity, reduced, image }: Parts) {
  const corner = ['end-4 top-3', 'start-4 top-3', 'end-4 bottom-3', 'start-4 bottom-3'][art.corner];
  const { look } = art;
  const paper = PAPERS[look.paper];
  const sticker = STICKER_SHAPE[look.sticker.shape];
  return (
    <span
      className={cn(FACE, 'relative flex flex-col gap-2 rounded-md p-2.5 text-stone-900')}
      style={{
        backgroundColor: paper.bg,
        backgroundImage: 'repeating-linear-gradient(0deg, rgb(120 90 40 / 0.05) 0 1px, transparent 1px 3px), radial-gradient(circle at 20% 10%, rgb(255 255 255 / 0.7), transparent 60%)',
        boxShadow: `inset 0 0 0 1px ${paper.edge}, inset 0 0 0 5px ${paper.bg}, inset 0 0 0 6px ${paper.edge}`,
      }}
    >
      {look.tapes.map((t, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute -top-2 z-10 h-4 opacity-80 shadow-1"
          style={{ [t.side === 'start' ? 'insetInlineStart' : 'insetInlineEnd']: `${t.off}%`, width: t.w, rotate: `${t.rot}deg`, backgroundColor: t.color }}
        />
      ))}
      <span className="relative mt-1 block aspect-[5/6] overflow-hidden rounded-sm" style={{ boxShadow: 'inset 0 0 0 2px rgb(0 0 0 / 0.15)' }}>
        {image}
        <Sparkles art={art} reduced={reduced} />
        <Layer depth={14} className={corner}>
          <span
            className={cn('flex flex-col items-center justify-center text-[0.6rem] font-bold uppercase leading-none text-stone-900 shadow-2', sticker.cls)}
            style={{ backgroundColor: TAPES[look.sticker.tone], rotate: `${look.sticker.rot}deg`, clipPath: sticker.clip }}
          >
            {rarity}
          </span>
        </Layer>
      </span>
      <span className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1 px-1 pb-1">
        <span className="min-w-[6rem] flex-1 text-lg font-bold leading-tight [overflow-wrap:anywhere]" style={{ fontFamily: HAND }}>
          {title}
        </span>
        <span aria-hidden className={cn('mb-0.5 max-w-[48%] shrink-0 text-center leading-tight px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-stone-600', STAMP_STYLE[look.stamp.style])} style={{ rotate: `${look.stamp.rot}deg` }}>
          {date}
        </span>
      </span>
    </span>
  );
}

function PostcardBack({ art, title, date, rarity }: Parts) {
  const paper = PAPERS[art.look.paper];
  return (
    <span
      className={cn(FACE, 'relative flex flex-col justify-between gap-3 rounded-md p-4 text-stone-900 ')}
      style={{
        backgroundColor: paper.bg,
        backgroundImage: `linear-gradient(90deg, transparent 49.5%, ${paper.edge} 49.5% 50.5%, transparent 50.5%), repeating-linear-gradient(0deg, transparent 0 22px, ${paper.edge} 22px 23px)`,
        boxShadow: `inset 0 0 0 1px ${paper.edge}`,
      }}
    >
      <span className="ms-auto flex size-12 flex-col items-center justify-center bg-[#fbf3e2] text-[0.6rem] font-bold uppercase [outline:3px_dotted_#c9b78b] [outline-offset:-3px]">
        {rarity}
      </span>
      <span className="text-2xl font-bold leading-snug" style={{ fontFamily: HAND }}>
        {title}
      </span>
      <span className="text-sm font-semibold">{date}</span>
    </span>
  );
}

function BadgeFront({ art, title, date, reduced, image }: Parts) {
  const clip = art.shape === 'shield' ? SHIELD : 'circle(50%)';
  return (
    <span className={cn(FACE, 'relative flex flex-col items-center pb-5 text-white')}>
      <span
        aria-hidden
        className={cn('absolute inset-x-[-6%] -top-[6%] aspect-square rounded-full blur-xl', !reduced && 'nx-badge-glow')}
        style={{ background: hsl(art.hue, 95, 62, 0.65) }}
      />
      <span className="relative block aspect-square w-full" style={{ clipPath: clip, background: metalGradient(art.metal) }}>
        <Layer depth={6} className="inset-[7%]">
          <span className="block size-full overflow-hidden" style={{ clipPath: clip, width: '100%', height: '100%' }}>
            {image}
          </span>
        </Layer>
        <Sparkles art={art} reduced={reduced} n={4} />
      </span>
      <span className="relative z-10 -mt-6 w-[112%]">
        <span aria-hidden className="absolute -bottom-3 start-[2%] h-5 w-7 -rotate-6" style={{ background: hsl(art.hue2, 60, 20), clipPath: 'polygon(0 0,100% 0,100% 100%,50% 70%,0 100%)' }} />
        <span aria-hidden className="absolute -bottom-3 end-[2%] h-5 w-7 rotate-6" style={{ background: hsl(art.hue2, 60, 20), clipPath: 'polygon(0 0,100% 0,100% 100%,50% 70%,0 100%)' }} />
        <span
          className="relative flex flex-col items-center px-4 py-1.5 text-center shadow-2"
          style={{ background: `linear-gradient(180deg, ${hsl(art.hue2, 65, 40)}, ${hsl(art.hue2, 70, 28)})`, clipPath: 'polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%)' }}
        >
          <span className="font-display text-base font-bold leading-tight">{title}</span>
          <span className="text-xs">{date}</span>
        </span>
      </span>
    </span>
  );
}

function BadgeBack({ art, title, date, rarity }: Parts) {
  const clip = art.shape === 'shield' ? SHIELD : 'circle(50%)';
  return (
    <span className={cn(FACE, 'flex items-center justify-center text-white ')} style={{ clipPath: clip, background: metalGradient(art.metal) }}>
      <span
        className="m-[7%] flex size-[86%] flex-col items-center justify-center gap-1 p-6 text-center"
        style={{ clipPath: clip, background: `radial-gradient(circle, ${hsl(art.hue, 70, 32)}, ${hsl(art.hue, 75, 18)})` }}
      >
        <span className="font-display text-lg font-bold leading-tight">{title}</span>
        <span className="text-xs">{date}</span>
        <span className="text-[0.65rem] font-bold uppercase tracking-widest">{rarity}</span>
      </span>
    </span>
  );
}

function PresentFront({ art, title, date, hue, angle, reduced, image, gift }: Parts) {
  return (
    <span
      className={cn(FACE, 'relative flex flex-col overflow-hidden rounded-sm border-2 p-3 pb-9 text-stone-900')}
      style={{
        clipPath: NOTCH,
        borderColor: '#f6c945',
        backgroundColor: '#f6c945',
        backgroundImage: 'linear-gradient(135deg,#fff3b0,#f6c945 30%,#c98a12 55%,#ffe58a 80%,#f6c945)',
        boxShadow: 'inset 0 0 0 4px #7a4f00, inset 0 0 0 6px #fff3b0',
      }}
    >
      <span className="relative block aspect-[5/6] overflow-hidden rounded-sm" style={{ boxShadow: '0 0 0 2px #7a4f00' }}>
        {image}
        <Sparkles art={art} reduced={reduced} n={4} color="#fff" />
      </span>
      <span className="mt-2 flex flex-col gap-0.5 text-center">
        <span className="font-display text-lg font-bold leading-tight">{title}</span>
        <span className="text-sm">{date}</span>
      </span>
      <GiftDress label={gift} />
      <Foil hue={hue} angle={angle} className={cn('opacity-45', !reduced && 'nx-gift-holo')} />
    </span>
  );
}

function PresentBack({ title, date, giftBack }: Parts) {
  return (
    <span
      className={cn(FACE, 'relative flex flex-col items-center justify-center gap-3 overflow-hidden border-2 p-6 text-center text-white ')}
      style={{ clipPath: NOTCH, borderColor: '#f6c945', backgroundImage: 'linear-gradient(135deg,#5a1f3a,#2b1a52)', boxShadow: 'inset 0 0 0 4px #f6c945' }}
    >
      <Icon name="gift" size={56} />
      <span className="font-display text-xl font-bold">{title}</span>
      <span className="text-base">{giftBack}</span>
      <span className="text-sm">{date}</span>
    </span>
  );
}

const FRONT = { postcard: PostcardFront, badge: BadgeFront, present: PresentFront } as const;
const BACK = { postcard: PostcardBack, badge: BadgeBack, present: PresentBack } as const;

function StoryCardBase({ card, onOpen, variant = 'tile', source, photo }: StoryCardProps) {
  const t = useTranslations('game.storyCard');
  const format = useFormatter();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const [flipped, setFlipped] = useState(false);
  const date = format.dateTime(new Date(card.earned_at), { dateStyle: 'medium' });
  const reveal = variant === 'reveal';
  const src = source ?? sourceOf(card.id);
  const art = useMemo(() => artFor(card.id, card.world, src), [card.id, card.world, src]);
  const style = cardStyleFor(card.id, card.world, src);
  const pic = useMemo(() => photo ?? photosFor([card]).get(card.id)!, [photo, card]);
  const parts: Parts = {
    art,
    title: card.title,
    date,
    rarity: t(`rarity.${style.rarity}`),
    hue: style.hue,
    angle: style.foilAngle,
    reduced,
    photo: pic.id,
    image: card.image_url ? (
      <IllustrationFrame world={card.world} src={card.image_url} alt="" className="size-full" />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/cards/${pic.id}.webp`} alt="" data-photo={pic.id} draggable={false} loading={reveal ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 size-full object-cover" />
    ),
    gift: t('banner.gift'),
    giftBack: t('giftBack'),
  };
  const Front = FRONT[art.family];
  const Back = BACK[art.family];

  function track(e: PointerEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el || reduced) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${((px - 0.5) * 22).toFixed(1)}deg`);
    el.style.setProperty('--rx', `${((0.5 - py) * 22).toFixed(1)}deg`);
    el.style.setProperty('--px', ((px - 0.5) * 2).toFixed(2));
    el.style.setProperty('--py', ((py - 0.5) * 2).toFixed(2));
    el.style.setProperty('--gx', `${(px * 100).toFixed(0)}%`);
    el.style.setProperty('--gy', `${(py * 100).toFixed(0)}%`);
    el.style.setProperty('--glare', '1');
  }
  function rest() {
    const el = ref.current;
    if (!el) return;
    for (const k of ['--rx', '--ry', '--px', '--py', '--glare']) el.style.removeProperty(k);
  }

  const glare: CSSProperties = {
    background: 'radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgb(255 255 255 / 0.55), transparent 55%)',
    mixBlendMode: 'soft-light',
  };
  return (
    <span
      data-layout={art.look.sig}
      className={cn('block w-full [perspective:900px]', reveal ? 'max-w-[10.5rem] nx-card-enter' : 'nx-card-pop')}
      style={art.family === 'postcard' ? { rotate: `${art.look.tilt}deg` } : undefined}
    >
      <span className={cn('block', !reduced && 'nx-card-float')} style={{ animationDelay: `${(art.hue % 7) * -0.5}s` }}>
        <button
          ref={ref}
          type="button"
          aria-pressed={flipped}
          aria-label={t('flip', { title: card.title })}
          onClick={() => {
            setFlipped((f) => !f);
            onOpen?.(card);
          }}
          onPointerMove={track}
          onPointerLeave={rest}
          onPointerCancel={rest}
          className={cn(
            'relative block w-full rounded-lg text-start [transform-style:preserve-3d] [transform:perspective(700px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))_scale(var(--s,1))] hover:[--s:1.03] active:[--s:0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand',
            !reduced && 'transition-transform duration-150 ease-out',
            reveal ? 'shadow-3' : 'shadow-2',
          )}
        >
          <span
            className={cn(
              'grid [transform-style:preserve-3d]',
              !reduced && 'transition-transform duration-(--dur-4) ease-(--ease-spring)',
              flipped && '[transform:rotateY(180deg)]',
            )}
          >
            <span aria-hidden={flipped} className="relative grid [grid-area:1/1] [transform-style:preserve-3d] [backface-visibility:hidden]">
              <Front {...parts} />
              {!reduced && <span aria-hidden className="nx-card-sweep pointer-events-none absolute inset-0" />}
            </span>
            <span aria-hidden={!flipped} className="grid [grid-area:1/1] [transform-style:preserve-3d] [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <Back {...parts} />
            </span>
          </span>
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-lg opacity-(--glare,0) transition-opacity duration-150" style={glare} />
        </button>
      </span>
    </span>
  );
}

/** Memoized collectible story card with parallax, rarity dressing and flip. */
export const StoryCard = memo(StoryCardBase);
