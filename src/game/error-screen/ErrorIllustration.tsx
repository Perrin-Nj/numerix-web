import { cn } from '@/shared/cn';
import type { ErrorKind } from './classify';

// Sway respects both the OS setting and the in-app reduced motion switch.
const CSS = `.nx-es-sway{transform-box:fill-box;transform-origin:50% 100%;animation:nx-es-sway 3.6s ease-in-out infinite}
@keyframes nx-es-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@media (prefers-reduced-motion:reduce){.nx-es-sway{animation:none}}
:root[data-motion='reduced'] .nx-es-sway{animation:none}`;

const STROKE = 'stroke-fg [stroke-width:3] [stroke-linejoin:round] [stroke-linecap:round]';

function Art({ kind }: { kind: ErrorKind }) {
  switch (kind) {
    case 'notfound': // lost fox
      return (
        <>
          <path className={cn('fill-warning', STROKE)} d="M38 72 L46 28 L68 48 Q80 45 92 48 L114 28 L122 72 Q80 112 38 72Z" />
          <path className={cn('fill-elevated', STROKE)} d="M62 92 Q80 108 98 92 Q80 82 62 92Z" />
          <circle cx="62" cy="68" r="4.5" className="fill-fg" />
          <circle cx="98" cy="68" r="4.5" className="fill-fg" />
          <circle cx="80" cy="86" r="4" className="fill-fg" />
          <text x="130" y="44" fontSize="38" className="fill-brand font-display font-bold">?</text>
        </>
      );
    case 'offline': // unplugged cable
      return (
        <>
          <rect x="10" y="44" width="38" height="32" rx="7" className={cn('fill-sunken', STROKE)} />
          <path className={cn('fill-none', STROKE)} d="M26 54 V62 M36 54 V62 M20 70 H42" />
          <rect x="96" y="44" width="34" height="32" rx="7" className={cn('fill-brand', STROKE)} />
          <path className={cn('fill-none', STROKE)} d="M96 54 H84 M96 66 H84" />
          <path className={cn('fill-none', STROKE)} d="M130 60 Q152 60 150 88 Q148 108 116 108" />
          <path className="fill-none stroke-warning [stroke-linecap:round] [stroke-width:3]" d="M60 50 L66 42 M62 60 H72 M60 70 L66 78" />
        </>
      );
    case 'timeout': // hourglass
      return (
        <>
          <path className={cn('fill-sunken', STROKE)} d="M50 22 H110 L84 60 L110 98 H50 L76 60Z" />
          <path className="fill-warning" d="M60 27 H100 L80 54Z" />
          <path className="fill-none stroke-warning [stroke-width:3]" d="M80 58 V88" />
          <path className="fill-warning" d="M62 95 Q80 76 98 95Z" />
          <rect x="44" y="12" width="72" height="9" rx="4" className={cn('fill-brand', STROKE)} />
          <rect x="44" y="99" width="72" height="9" rx="4" className={cn('fill-brand', STROKE)} />
        </>
      );
    case 'permission': // locked door
      return (
        <>
          <rect x="42" y="12" width="76" height="98" rx="9" className={cn('fill-brand-soft', STROKE)} />
          <rect x="62" y="60" width="36" height="30" rx="6" className={cn('fill-warning', STROKE)} />
          <path className={cn('fill-none', STROKE)} d="M69 60 V52 a11 11 0 0 1 22 0 V60" />
          <circle cx="80" cy="73" r="3.5" className="fill-fg" />
          <path className={STROKE} d="M80 75 V82" />
        </>
      );
    default: // a friendly cloud with a bandage
      return (
        <>
          <path className={cn('fill-elevated', STROKE)} d="M42 92 a20 20 0 0 1 2-38 a28 28 0 0 1 54-6 a24 24 0 0 1 16 44Z" />
          <circle cx="68" cy="68" r="4" className="fill-fg" />
          <circle cx="92" cy="68" r="4" className="fill-fg" />
          <path className={cn('fill-none', STROKE)} d="M70 80 Q80 86 90 80" />
          <rect x="94" y="46" width="22" height="9" rx="4" transform="rotate(-24 105 50)" className={cn('fill-warning', STROKE)} />
        </>
      );
  }
}

/** Decorative: the words carry the meaning. */
export function ErrorIllustration({ kind, className }: { kind: ErrorKind; className?: string }) {
  return (
    <svg viewBox="0 0 160 120" aria-hidden focusable="false" className={cn('h-auto w-full', className)}>
      <style>{CSS}</style>
      <g className="nx-es-sway">
        <Art kind={kind} />
      </g>
    </svg>
  );
}
