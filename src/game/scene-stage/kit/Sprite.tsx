import type { CSSProperties, ReactNode } from 'react';

type Num = number | string;
const v = (o: Record<string, Num | undefined>) => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined)) as CSSProperties;

/**
 * An absolutely placed HTML box in art units (--u). `x`, `y` are offsets from the stage centre, `w` the width, `anchor` how the box hangs
 * ('center' by default, 'feet' puts the bottom edge on y). An animated sprite is its own compositor layer (`anim`), so moving it never repaints its neighbours.
 */
export function Sprite({ x = 0, y = 0, w = 10, anchor = 'center', anim, i, z, className = '', style, children }: { x?: Num; y?: Num; w?: Num; anchor?: 'center' | 'feet' | 'top'; anim?: boolean; i?: number; z?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  const st = { ...v({ '--x': x, '--y': y, '--w': w, '--anchor': anchor === 'feet' ? '-100%' : anchor === 'top' ? '0%' : '-50%', '--i': i, zIndex: z }), ...style } as CSSProperties;
  return (
    <div className={`nx-sprite ${anim ? 'nx-anim' : ''} ${className}`} style={st}>
      {children}
    </div>
  );
}

/** A soft contact shadow that sways with the scene lamp (all shadows share one 11 s cycle, so light and shadow agree). */
export function Shadow({ x, y, w, h = 2, sw = 1.2, strength = 0.4, className = '' }: { x: Num; y: Num; w: Num; h?: Num; sw?: Num; strength?: Num; className?: string }) {
  return <div aria-hidden className={`nx-shadow ${className}`} style={v({ left: `calc(50% + ${x} * var(--u))`, top: `calc(50% + ${y} * var(--u))`, width: `calc(${w} * var(--u))`, height: `calc(${h} * var(--u))`, translate: '-50% -50%', '--sw': sw, '--sh': strength })} />;
}

/** A few drifting light motes (CSS only). `n` dots spread over the box, each with its own period. */
export function Motes({ n = 8, colour, className = '' }: { n?: number; colour?: string; className?: string }) {
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <i key={k} aria-hidden className={`nx-mote ${className}`} style={v({ '--mx': ((k * 37 + 11) % 90) + 4, '--my': ((k * 53 + 29) % 70) + 22, '--r': 0.5 + (k % 3) * 0.3, '--md': `${8 + (k % 4) * 2.5}s`, '--d': `${(k * 1.7) % 9}s`, '--mc': colour })} />
      ))}
    </>
  );
}
