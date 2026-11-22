import type { CSSProperties } from 'react';

/** Echecs world kit: palettes, a pawn character rig and a flag. Pieces are small SVGs; each is a character, never a clone. */
export type PieceLook = { body: string; shade: string; rim: string; accent: string; hat?: 'cap' | 'bow' | 'none'; glasses?: boolean; brow: number; eye: number };

/** Six distinct black-piece looks (ebony family, each with its own scarf, accessory and eye shape). Index it with the piece index. */
export const PAWN_LOOKS: readonly PieceLook[] = [
  { body: '#3a3a6e', shade: '#1d1d42', rim: '#9a9be0', accent: '#ffb347', hat: 'none', brow: 0, eye: 1.9 },
  { body: '#4a2f5e', shade: '#26163a', rim: '#d3a2e8', accent: '#59d0c4', hat: 'cap', brow: 1, eye: 2.1 },
  { body: '#244a52', shade: '#112a31', rim: '#82d6d9', accent: '#ff8fa3', hat: 'none', glasses: true, brow: 0, eye: 1.7 },
  { body: '#5a2c44', shade: '#33152a', rim: '#f0a0bb', accent: '#ffd36b', hat: 'bow', brow: -1, eye: 2.2 },
  { body: '#2f4a3a', shade: '#16291f', rim: '#9be0b0', accent: '#ff7a59', hat: 'none', brow: 1, eye: 1.8 },
  { body: '#3d3f52', shade: '#1c1d2c', rim: '#b9bdd8', accent: '#6bb8ff', hat: 'cap', glasses: true, brow: 0, eye: 2 },
];

/**
 * A friendly pawn (about 13 nodes). Moods come from the stage phase in CSS: eyes open at rest, happy arcs on a right answer,
 * a raised brow and a glance toward the free places on a gentle miss (`--lx` is how far the pupils look, px of the svg).
 */
export function Pawn({ i, look = PAWN_LOOKS[i % PAWN_LOOKS.length]!, tall = 1 }: { i: number; look?: PieceLook; tall?: number }) {
  const st = { '--pb': look.body, '--ps': look.shade, '--pr': look.rim, '--pa': look.accent } as CSSProperties;
  const ey = 22 + look.brow * 0;
  return (
    <svg viewBox="0 0 40 60" className="pw" style={st} data-mood="idle" aria-hidden>
      <g style={{ transform: `scaleY(${tall})`, transformOrigin: '50% 100%' } as CSSProperties}>
        <path d="M5 58 Q5 51 10 50 L30 50 Q35 51 35 58 Z M11 50 C12 40 15 33 16 28 L24 28 C25 33 28 40 29 50 Z" fill="var(--pb)" />
        <path d="M11 50 C12 40 15 33 16 28 L18 28 C17 36 15 44 14 50 Z" fill="var(--pr)" opacity=".42" />
        <path d="M24 28 C25 33 28 40 29 50 L26 50 C25.5 42 24.5 35 22.5 28 Z M5 58 Q5 55 7 54 L33 54 Q35 55 35 58 Z" fill="var(--ps)" opacity=".7" />
        <ellipse cx="20" cy="28" rx="8.6" ry="2.8" fill="var(--pa)" />
        <circle cx="20" cy="19" r="11.5" fill="var(--pb)" />
        <path d="M12 12 Q17 7 24 8" fill="none" stroke="var(--pr)" strokeWidth="1.8" strokeLinecap="round" opacity=".75" />
        <ellipse cx="14.6" cy="12.4" rx="3.6" ry="2" fill="#fff" opacity=".4" transform="rotate(-30 14.6 12.4)" />
        {look.hat === 'cap' && <path d="M9.5 15 Q10 6 20 6 Q30 6 30.5 15 Q20 11 9.5 15Z M24 11 L36 12 Q34 15 26 14Z" fill="var(--pa)" />}
        {look.hat === 'bow' && <path d="M20 7 L12 3 L12 11 Z M20 7 L28 3 L28 11 Z" fill="var(--pa)" />}
        <g className="nx-blink pw-open" style={{ '--d': `${2 + i * 0.83}s`, '--bd': `${4.6 + (i % 3) * 0.9}s` } as CSSProperties}>
          <path d={`M12.2 ${ey}a2.7 ${look.eye + 0.8} 0 1 0 5.4 0a2.7 ${look.eye + 0.8} 0 1 0 -5.4 0M22.4 ${ey}a2.7 ${look.eye + 0.8} 0 1 0 5.4 0a2.7 ${look.eye + 0.8} 0 1 0 -5.4 0`} fill="#fffaf0" />
          <path className="nx-pupil" d={`M14.9 ${ey}h.1M25.1 ${ey}h.1`} stroke="#1a1030" strokeWidth="3" strokeLinecap="round" />
          <path d={`M14.2 ${ey - 1.2}h.1M24.4 ${ey - 1.2}h.1`} stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
        </g>
        <path className="pw-happy" d={`M12.4 ${ey + 1}q2.6 -4.4 5.2 0M22.6 ${ey + 1}q2.6 -4.4 5.2 0`} fill="none" stroke="#fffaf0" strokeWidth="1.9" strokeLinecap="round" />
        <path className="pw-brow" d={`M12 ${ey - 5.4 - look.brow}l5.2 ${-1 - look.brow * 0.4}M28 ${ey - 5.4 - look.brow}l-5.2 ${-1 - look.brow * 0.4}`} fill="none" stroke="var(--pr)" strokeWidth="1.2" strokeLinecap="round" />
        {look.glasses && <path d={`M11 ${ey}a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M21 ${ey}a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M19 ${ey}h2`} fill="none" stroke="var(--pa)" strokeWidth="1" />}
        <path className="pw-mouth" d="M16.8 27.2 Q20 29.8 23.2 27.2" fill="none" stroke="#ffc9a8" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M10.4 25.4h.1M29.6 25.4h.1" stroke="#ff9db6" strokeOpacity=".6" strokeWidth="3.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** A small flag on a pole (pops on a free square at a right answer). */
export function Flag({ colour = '#ffd36b' }: { colour?: string }) {
  return (
    <svg viewBox="0 0 24 34" aria-hidden>
      <path d="M5 33V3" stroke="#d9d4f0" strokeWidth="2" strokeLinecap="round" />
      <path className="fl-wave" d="M6 4 Q14 0 22 5 Q14 10 6 12Z" fill={colour} stroke="#fff" strokeOpacity=".6" strokeWidth=".8" />
      <ellipse cx="5" cy="33" rx="5.5" ry="1.6" fill="#000" opacity=".25" />
    </svg>
  );
}
