'use client';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { animate } from 'motion/mini';

export type NumaPose = 'idle' | 'wave' | 'think' | 'cheer' | 'sad' | 'sleepy';
export type NumaProps = {
  pose: NumaPose;
  /** Where the eyes look, -1..1 on each axis. Without it the owl follows the pointer and the focused control. */
  look?: { x: number; y: number };
  /** Beak moves while the mascot talks. */
  speaking?: boolean;
  reduced: boolean;
};

type Def = {
  head: string; body: string; lid: number; shut: 'up' | 'down' | null; gaze: [number, number]; track: boolean;
  wl: string; wr: string; bl: string; br: string; tl: string; tr: string; beak: number;
  extra: 'dots' | 'sparks' | 'zzz' | null;
};
const R0 = 'rotate(0deg)';
const BASE: Def = {
  head: R0, body: 'translateY(0px)', lid: -34, shut: null, gaze: [0, 0], track: true,
  wl: R0, wr: R0, bl: R0, br: R0, tl: R0, tr: R0, beak: 0, extra: null,
};
const POSES: Record<NumaPose, Def> = {
  idle: BASE,
  wave: { ...BASE, head: 'rotate(4deg)', wr: 'rotate(-126deg)', bl: 'translateY(-3px)', br: 'translateY(-3px)', beak: 2 },
  think: {
    ...BASE, head: 'rotate(8deg)', lid: -30, gaze: [-7, -7], track: false,
    wl: 'translate(2px,4px) rotate(-84deg) scale(.7)', br: 'translateY(-7px) rotate(-10deg)', extra: 'dots',
  },
  cheer: {
    ...BASE, shut: 'up', track: false, wl: 'rotate(138deg)', wr: 'rotate(-138deg)',
    bl: 'translateY(-5px)', br: 'translateY(-5px)', beak: 5, extra: 'sparks',
  },
  sad: {
    ...BASE, head: 'translateY(5px) rotate(-6deg)', body: 'translateY(4px) scale(1,.97)', lid: -13, gaze: [0, 6], track: false,
    wl: 'translateY(4px) rotate(5deg)', wr: 'translateY(4px) rotate(-5deg)', bl: 'rotate(-20deg)', br: 'rotate(20deg)',
    tl: 'rotate(-14deg)', tr: 'rotate(14deg)',
  },
  sleepy: {
    ...BASE, head: 'translateY(4px) rotate(6deg)', body: 'translateY(3px) scale(1,.98)', shut: 'down', track: false,
    bl: 'translateY(3px)', br: 'translateY(3px)', tl: 'rotate(-6deg)', tr: 'rotate(6deg)', extra: 'zzz',
  },
};

const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const post = (t: string, o = '100px 120px', extra?: CSSProperties): CSSProperties => ({
  transform: t, transformOrigin: o,
  transition: 'transform var(--nd) cubic-bezier(.34,1.45,.6,1), opacity var(--nd) ease',
  ...extra,
});
const fade = (on: boolean): CSSProperties => ({ opacity: on ? 1 : 0, transition: 'opacity var(--nd) ease' });
const mid: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };

const Star = ({ x, y, s }: { x: number; y: number; s: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path fill="url(#nm-gold)" d="M0-10Q1.6-1.6 10 0Q1.6 1.6 0 10Q-1.6 1.6-10 0Q-1.6-1.6 0-10Z" />
  </g>
);

export default function Numa({ pose, look, speaking, reduced }: NumaProps) {
  const uid = useId().replace(/\W/g, '');
  const ref = useRef<SVGSVGElement>(null);
  const P = POSES[pose];
  const [seen, setSeen] = useState({ x: 0, y: 0 });
  const [dart, setDart] = useState({ x: 0, y: 0 });
  const eyes = look ?? seen;
  const gx = P.track ? clamp(eyes.x * 8 + dart.x, 9) : P.gaze[0];
  const gy = P.track ? clamp(eyes.y * 6 + dart.y, 7) : P.gaze[1];

  // Pupils follow the pointer and the focused control, loosely (small travel, eased).
  useEffect(() => {
    if (reduced || look || !P.track) return;
    let raf = 0;
    const aim = (x: number, y: number) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const k = Math.max(240, r.height * 1.6);
      const nx = Math.round(clamp((x - r.left - r.width / 2) / k, 1) * 10) / 10;
      const ny = Math.round(clamp((y - r.top - r.height * 0.4) / k, 1) * 10) / 10;
      setSeen((s) => (s.x === nx && s.y === ny ? s : { x: nx, y: ny }));
    };
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => aim(e.clientX, e.clientY));
    };
    const focus = (e: FocusEvent) => {
      if (!(e.target instanceof Element) || ref.current?.contains(e.target)) return;
      const b = e.target.getBoundingClientRect();
      aim(b.left + b.width / 2, b.top + b.height / 2);
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('focusin', focus);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('focusin', focus);
    };
  }, [reduced, look, P.track]);

  // Loops for the current pose and the randomised idle micro motions.
  useEffect(() => {
    const root = ref.current;
    if (reduced || !root) return;
    const stops: Array<() => void> = [];
    const timers: number[] = [];
    const el = (k: string) => root.querySelectorAll<SVGElement>(`[data-p="${k}"]`);
    const run = (k: string, kf: Record<string, string[] | number[]>, o: Record<string, unknown>) =>
      el(k).forEach((n, i) => {
        const a = animate(n, kf, { ...o, delay: ((o.delay as number) ?? 0) + (o.stagger ? i * (o.stagger as number) : 0) } as never);
        stops.push(() => a.cancel());
      });
    const every = (min: number, max: number, fn: () => void) => {
      const go = () => timers.push(window.setTimeout(() => { fn(); go(); }, rand(min, max)));
      go();
    };
    const loop = { repeat: Infinity, ease: 'easeInOut' };
    const rot = (...d: number[]) => d.map((v) => `rotate(${v}deg)`);
    const breath = (amt: number, secs: number) =>
      run('life', { transform: ['scale(1,1)', `scale(${1 + amt / 2},${1 + amt})`] }, { ...loop, repeatType: 'reverse', duration: secs });
    if (pose === 'cheer') {
      run('life', { transform: ['translateY(0px)', 'translateY(-26px)', 'translateY(0px)', 'translateY(0px)'] }, { ...loop, duration: 1.1, times: [0, 0.3, 0.55, 1] });
      run('shadow', { transform: ['scale(1)', 'scale(.72)', 'scale(1)', 'scale(1)'] }, { ...loop, duration: 1.1, times: [0, 0.3, 0.55, 1] });
      run('wl', { transform: rot(0, 9, 0) }, { ...loop, repeatType: 'reverse', duration: 0.35 });
      run('wr', { transform: rot(0, -9, 0) }, { ...loop, repeatType: 'reverse', duration: 0.35 });
      run('tl', { transform: rot(-7, 7) }, { ...loop, repeatType: 'reverse', duration: 0.3 });
      run('tr', { transform: rot(7, -7) }, { ...loop, repeatType: 'reverse', duration: 0.3 });
      run('sp', { transform: ['scale(.2) rotate(0deg)', 'scale(1) rotate(45deg)', 'scale(.2) rotate(90deg)'], opacity: [0, 1, 0] }, { repeat: Infinity, duration: 1.2, stagger: 0.28, ease: 'easeInOut' });
    } else {
      breath(pose === 'sleepy' ? 0.03 : pose === 'sad' ? 0.01 : 0.02, pose === 'sleepy' ? 4.4 : 3.6);
    }
    if (pose === 'wave') {
      run('wr', { transform: rot(0, -16, 10, -16, 10, -16, 0, 0) }, { repeat: Infinity, duration: 4.2, ease: 'easeInOut', times: [0, 0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 1] });
    }
    if (pose === 'think') {
      run('dot', { transform: ['scale(.5)', 'scale(1)', 'scale(1)', 'scale(.5)'], opacity: [0.2, 1, 1, 0.2] }, { repeat: Infinity, duration: 1.8, stagger: 0.25, ease: 'easeInOut' });
    }
    if (pose === 'sleepy') {
      run('zz', { transform: ['translate(0px,0px)', 'translate(5px,-14px)'], opacity: [0, 1, 0] }, { repeat: Infinity, duration: 2.8, stagger: 0.9, ease: 'easeOut' });
    }
    if (speaking && pose !== 'sleepy') {
      run('jaw', { transform: ['translateY(0px)', 'translateY(4px)', 'translateY(0px)', 'translateY(2px)', 'translateY(0px)'] }, { repeat: Infinity, duration: 0.7 });
    }
    if (pose !== 'cheer' && pose !== 'sleepy') {
      const blink = () => {
        const f = ['translateY(-34px)', 'translateY(20px)', 'translateY(-34px)'];
        run('blink', { transform: f }, { duration: 0.16 });
        if (Math.random() < 0.18) timers.push(window.setTimeout(() => run('blink', { transform: f }, { duration: 0.16 }), 280));
      };
      every(2200, 6000, blink);
    }
    if (pose === 'idle') {
      every(5000, 9000, () => {
        const d = Math.random() < 0.5 ? -4 : 4;
        run('headm', { transform: rot(0, d, d, 0) }, { duration: 2.2, times: [0, 0.25, 0.75, 1], ease: 'easeInOut' });
      });
      every(8000, 14000, () => run(Math.random() < 0.5 ? 'tl' : 'tr', { transform: rot(0, -7, 4, 0) }, { duration: 0.5 }));
      every(3500, 7000, () => {
        setDart({ x: rand(-5, 5), y: rand(-3, 3) });
        timers.push(window.setTimeout(() => setDart({ x: 0, y: 0 }), 1200));
      });
    }
    return () => {
      timers.forEach(clearTimeout);
      stops.forEach((s) => s());
      setDart({ x: 0, y: 0 });
    };
  }, [pose, speaking, reduced]);

  const id = (n: string) => `${n}${uid}`;
  const lidShape = (
    <g>
      <path d="M-32-70H32V0Q0 14-32 0Z" fill="#EFD3A0" />
      <path d="M-27 0Q0 13 27 0Q0 8-27 0Z" fill="#4A2F1B" />
    </g>
  );
  const eye = (cx: number) => (
    <g transform={`translate(${cx} 92)`}>
      <g style={fade(!P.shut)}>
        <g clipPath={`url(#${id('clip')})`}>
          <circle r="25" fill="url(#nm-ball)" />
          <g style={{ transform: `translate(${gx}px,${gy}px)`, transition: 'transform var(--gd) ease-out' }}>
            <circle r="15" fill="url(#nm-iris)" />
            <circle r="8.5" fill="#241913" />
          </g>
          <circle cx="-8" cy="-9" r="4.6" fill="#fff" opacity=".95" />
          <circle cx="7" cy="8" r="2.1" fill="#fff" opacity=".75" />
          <circle r="25" fill="url(#nm-edge)" />
          <g style={{ transform: `translateY(${P.lid}px)`, transition: 'transform var(--nd) cubic-bezier(.34,1.45,.6,1)' }}>
            <use href={`#${id('lid')}`} />
          </g>
          <g data-p="blink" style={{ transform: 'translateY(-34px)' }}>
            <use href={`#${id('lid')}`} />
          </g>
        </g>
      </g>
      <g style={fade(!!P.shut)}>{P.shut === 'down' ? down : up}</g>
    </g>
  );
  const up = <path d="M-19 7Q0-17 19 7Q0-6-19 7Z" fill="#3B2415" />;
  const down = <path d="M-19-3Q0 17 19-3Q0 7-19-3Z" fill="#3B2415" />;
  const brow = (cx: number, t: string) => (
    <g style={post(t, `${cx}px 62px`)}>
      <ellipse cx={cx} cy="62" rx="13" ry="4" fill="#5B3A22" />
    </g>
  );
  const wing = (side: 'l' | 'r') => {
    const l = side === 'l';
    const o = l ? '44px 118px' : '156px 118px';
    const d = l
      ? 'M44 116C26 124 20 160 30 196C34 208 50 206 52 192C56 166 54 134 44 116Z'
      : 'M156 116C174 124 180 160 170 196C166 208 150 206 148 192C144 166 146 134 156 116Z';
    const f = l ? 'M30 196C34 206 46 204 48 192C42 196 36 196 30 196Z' : 'M170 196C166 206 154 204 152 192C158 196 164 196 170 196Z';
    return (
      <g style={post(l ? P.wl : P.wr, o)}>
        <g data-p={`w${side}`} style={{ transformOrigin: o }}>
          <path d={d} fill="url(#nm-wing)" />
          <path d={l ? 'M34 150C32 168 36 184 40 190C44 176 44 160 34 150Z' : 'M166 150C168 168 164 184 160 190C156 176 156 160 166 150Z'} fill="#9A6D47" opacity=".5" />
          <path d={f} fill="#A57750" opacity=".45" />
        </g>
      </g>
    );
  };
  const tuft = (side: 'l' | 'r') => {
    const l = side === 'l';
    const o = l ? '66px 70px' : '134px 70px';
    return (
      <g style={post(l ? P.tl : P.tr, o)}>
        <g data-p={`t${side}`} style={{ transformOrigin: o }}>
          <path d={l ? 'M46 80C34 42 44 24 50 22C70 32 84 52 86 66Z' : 'M154 80C166 42 156 24 150 22C130 32 116 52 114 66Z'} fill="url(#nm-body)" />
          <path d={l ? 'M52 62C46 44 49 34 52 30C62 38 70 48 72 58Z' : 'M148 62C154 44 151 34 148 30C138 38 130 48 128 58Z'} fill="#C99466" opacity=".55" />
        </g>
      </g>
    );
  };

  return (
    <svg
      ref={ref}
      aria-hidden
      focusable="false"
      viewBox="-20 -14 240 254"
      width="100%"
      height="100%"
      style={{ '--nd': reduced ? '0ms' : '520ms', '--gd': reduced ? '0ms' : '200ms', overflow: 'visible' } as CSSProperties}
    >
      <defs>
        <linearGradient id="nm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B27C54" />
          <stop offset=".55" stopColor="#8F6240" />
          <stop offset="1" stopColor="#74502F" />
        </linearGradient>
        <radialGradient id="nm-gloss" cx=".32" cy=".2" r=".55">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nm-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF3D6" />
          <stop offset="1" stopColor="#EFCD94" />
        </linearGradient>
        <radialGradient id="nm-face" cx=".5" cy=".4" r=".7">
          <stop offset="0" stopColor="#FFF6E2" />
          <stop offset="1" stopColor="#EDCF9C" />
        </radialGradient>
        <radialGradient id="nm-ball" cx=".45" cy=".4" r=".7">
          <stop offset=".6" stopColor="#fff" />
          <stop offset="1" stopColor="#EFE8DC" />
        </radialGradient>
        <radialGradient id="nm-edge" cx=".5" cy=".5" r=".5">
          <stop offset=".72" stopColor="#3B2415" stopOpacity="0" />
          <stop offset="1" stopColor="#3B2415" stopOpacity=".22" />
        </radialGradient>
        <radialGradient id="nm-iris" cx=".4" cy=".35" r=".75">
          <stop offset="0" stopColor="#F6BC55" />
          <stop offset=".7" stopColor="#C4721F" />
          <stop offset="1" stopColor="#8A4A14" />
        </radialGradient>
        <linearGradient id="nm-wing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#85583A" />
          <stop offset="1" stopColor="#5D3C25" />
        </linearGradient>
        <linearGradient id="nm-beak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC25A" />
          <stop offset="1" stopColor="#EC8719" />
        </linearGradient>
        <linearGradient id="nm-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE9A0" />
          <stop offset="1" stopColor="#F5AE3C" />
        </linearGradient>
        <clipPath id={id('clip')}>
          <circle r="25" />
        </clipPath>
        <g id={id('lid')}>{lidShape}</g>
      </defs>

      <ellipse data-p="shadow" cx="100" cy="233" rx="58" ry="6" fill="#000" opacity=".16" style={{ transformOrigin: '100px 233px' }} />
      {[-1, 1].map((s) => (
        <g key={s} fill="url(#nm-beak)">
          <ellipse cx={100 + s * 20 - 9} cy="224" rx="5.5" ry="8" transform={`rotate(-14 ${100 + s * 20 - 9} 224)`} />
          <ellipse cx={100 + s * 20} cy="226" rx="5.5" ry="8" />
          <ellipse cx={100 + s * 20 + 9} cy="224" rx="5.5" ry="8" transform={`rotate(14 ${100 + s * 20 + 9} 224)`} />
        </g>
      ))}

      <g style={post(P.body, '100px 222px')}>
        <g data-p="life" style={{ transformOrigin: '100px 222px' }}>
          <path d="M100 46C150 46 172 90 172 140C172 190 148 222 100 222C52 222 28 190 28 140C28 90 50 46 100 46Z" fill="url(#nm-body)" />
          <path d="M100 46C150 46 172 90 172 140C172 190 148 222 100 222C52 222 28 190 28 140C28 90 50 46 100 46Z" fill="url(#nm-gloss)" />
          <path d="M100 98C132 98 150 130 150 165C150 198 130 216 100 216C70 216 50 198 50 165C50 130 68 98 100 98Z" fill="url(#nm-belly)" />
          <g fill="#D4A55F" opacity=".3">
            {[[78, 150], [100, 150], [122, 150], [66, 175], [89, 175], [111, 175], [134, 175], [78, 200], [100, 200], [122, 200]].map(([x, y]) => (
              <path key={`${x}${y}`} d={`M${x - 9} ${y}a9 9 0 0 0 18 0Z`} />
            ))}
          </g>

          <g style={post(P.head)}>
            <g data-p="headm" style={{ transformOrigin: '100px 120px' }}>
              {tuft('l')}
              {tuft('r')}
              <circle cx="70" cy="96" r="34" fill="url(#nm-face)" />
              <circle cx="130" cy="96" r="34" fill="url(#nm-face)" />
              {eye(72)}
              {eye(128)}
              {brow(72, P.bl)}
              {brow(128, P.br)}
              <ellipse cx="100" cy="114" rx="5" ry="3" fill="#5A2A12" />
              <g style={post(`translateY(${P.beak}px)`)}>
                <g data-p="jaw">
                  <path d="M94 111Q100 127 106 111Z" fill="#D9741A" />
                </g>
              </g>
              <path d="M93 103Q100 96 107 103Q106 116 100 122Q94 116 93 103Z" fill="url(#nm-beak)" />
              <path d="M96 103Q100 100 104 103Q100 105 96 103Z" fill="#fff" opacity=".5" />
            </g>
          </g>
          {wing('l')}
          {wing('r')}
        </g>
      </g>

      <g style={fade(P.extra === 'dots')}>
        {[176, 192, 208].map((x, i) => (
          <circle key={x} data-p="dot" cx={x} cy={26 - i * 3} r={5 + i} fill="url(#nm-gold)" style={mid} />
        ))}
      </g>
      <g style={fade(P.extra === 'sparks')}>
        <g data-p="sp" style={mid}><Star x={6} y={52} s={1} /></g>
        <g data-p="sp" style={mid}><Star x={198} y={44} s={1.2} /></g>
        <g data-p="sp" style={mid}><Star x={2} y={6} s={.8} /></g>
        <g data-p="sp" style={mid}><Star x={194} y={0} s={.9} /></g>
      </g>
      <g style={fade(P.extra === 'zzz')} fill="#6F8BC4">
        {[[148, 40, 0.8], [164, 24, 1], [182, 6, 1.25]].map(([x, y, s]) => (
          <g key={x} data-p="zz" style={mid}>
            <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 0H11V3L4 11H11V14H0V11L7 3H0Z" />
          </g>
        ))}
      </g>
    </svg>
  );
}
