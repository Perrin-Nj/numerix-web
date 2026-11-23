import { Fragment, type CSSProperties, type ReactNode } from 'react';

// Espace world kit v2 (round 5): a crew character with a face, and the counted objects the espace stories name (tools, tomatoes, canisters, meals, crates, flasks,
// miniature rockets, suits, day cards). Every glyph is a <symbol> in a 40x50 box standing on y=48; one <use> per item, so a count of 46 stays under the node budget.

/** The crew member: a person in a white suit with a visible face, so "people" are people and suits are astronauts. Expressions come from the stage phase (CSS). */
export function Crew({ i = 0, className = '' }: { i?: number; className?: string }) {
  const skin = ['#f2c6a0', '#c98f66', '#8d5a3b', '#f6d3b5'][i % 4]!;
  const hair = ['#3a2a22', '#1d1d24', '#7a4a2a', '#c9892f'][i % 4]!;
  const stripe = ['#e8574d', '#ffb347', '#4a7fd6', '#59d0c4'][i % 4]!;
  return (
    <svg viewBox="0 0 60 90" className={`cr ${className}`} aria-hidden style={{ '--skin': skin, '--stripe': stripe } as CSSProperties}>
      <rect x="6" y="40" width="10" height="26" rx="5" fill="#d3d9e8" />
      <rect x="14" y="38" width="32" height="34" rx="12" fill="#f7f8fc" />
      <rect x="14" y="52" width="32" height="6" fill={stripe} />
      <rect x="22" y="60" width="16" height="8" rx="3" fill="#27304f" />
      <circle cx="26" cy="64" r="1.6" fill="#8ff5ff" />
      <circle cx="33" cy="64" r="1.6" fill="#ffd36b" />
      <rect x="16" y="68" width="11" height="20" rx="5" fill="#f1f3fa" />
      <rect x="33" y="68" width="11" height="20" rx="5" fill="#f1f3fa" />
      <rect x="15" y="84" width="13" height="6" rx="3" fill="#59627e" />
      <rect x="32" y="84" width="13" height="6" rx="3" fill="#59627e" />
      <g className="cr-arm-l"><rect x="3" y="42" width="12" height="9" rx="4.5" fill="#f1f3fa" /><circle cx="5" cy="50" r="4.5" fill="#ffb347" /></g>
      <g className="cr-arm-r"><rect x="45" y="42" width="12" height="9" rx="4.5" fill="#f1f3fa" /><circle cx="55" cy="50" r="4.5" fill="#ffb347" /></g>
      <circle cx="30" cy="25" r="20" fill="#f7f8fc" />
      <circle cx="30" cy="25" r="15.5" fill="#1d2a52" />
      <circle cx="30" cy="26" r="13" fill={skin} />
      <path d="M17 22 C18 12 42 12 43 22 C38 17 22 17 17 22Z" fill={hair} />
      <g className="cr-eyes nx-blink" style={{ '--d': `${i * 0.7}s`, '--bd': '4.6s' } as CSSProperties}>
        <g className="nx-pupil cr-look">
          <circle cx="24.5" cy="26" r="2.3" fill="#fff" />
          <circle cx="35.5" cy="26" r="2.3" fill="#fff" />
          <circle cx="25" cy="26.3" r="1.3" fill="#1a1030" />
          <circle cx="36" cy="26.3" r="1.3" fill="#1a1030" />
        </g>
      </g>
      <path className="cr-glad" d="M22 26 Q24.5 22.5 27 26 M33 26 Q35.5 22.5 38 26" fill="none" stroke="#1a1030" strokeWidth="1.6" strokeLinecap="round" />
      <path className="cr-smile" d="M25 32 Q30 36.5 35 32" fill="none" stroke="#7a3b2a" strokeWidth="1.5" strokeLinecap="round" />
      <path className="cr-hm" d="M26 32.6 Q30 34.6 34 32.6" fill="none" stroke="#7a3b2a" strokeWidth="1.5" strokeLinecap="round" />
      <path className="cr-brow" d="M21.5 20.5 L27 21.5 M33 21.5 L38.5 20.5" fill="none" stroke={hair} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16 18 C20 8 36 6 42 14" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

const STR = 'var(--c2,#5b6580)';
const SYMS: Record<string, ReactNode> = {
  tool: (
    <symbol id="es-tool" viewBox="0 0 40 50">
      <g transform="rotate(32 20 26)">
        <rect x="15.5" y="16" width="9" height="32" rx="4.5" fill="var(--c1,#ffb347)" stroke="#2b3558" strokeWidth="1.6" />
        <circle cx="20" cy="12" r="10.5" fill="#d5dbea" stroke="#2b3558" strokeWidth="1.6" />
        <rect x="16.4" y="0" width="7.2" height="11" rx="1.4" fill="#2b3558" />
        <circle cx="20" cy="42" r="2" fill="#fff" opacity=".6" />
      </g>
    </symbol>
  ),
  tomato: (
    <symbol id="es-tomato" viewBox="0 0 40 50">
      <circle cx="20" cy="30" r="14" fill="var(--c1,#e8574d)" />
      <ellipse cx="15" cy="24" rx="4" ry="2.4" fill="#fff" opacity=".45" />
      <path d="M20 17 L15 12 L20 14 L22 8 L24 14 L29 12Z" fill="#4faa5a" />
    </symbol>
  ),
  canister: (
    <symbol id="es-canister" viewBox="0 0 40 50">
      <rect x="9" y="12" width="22" height="34" rx="8" fill="var(--c1,#6bb8ff)" />
      <rect x="9" y="24" width="22" height="8" fill="#fff" opacity=".8" />
      <rect x="15" y="4" width="10" height="9" rx="2" fill="#aab4c6" />
      <rect x="12" y="14" width="4" height="26" rx="2" fill="#fff" opacity=".35" />
    </symbol>
  ),
  meal: (
    <symbol id="es-meal" viewBox="0 0 40 50">
      <rect x="5" y="22" width="30" height="24" rx="5" fill="#fbe7c2" stroke="#c78f45" strokeWidth="1.6" />
      <rect x="5" y="22" width="30" height="7" rx="3" fill="var(--c1,#ffb347)" />
      <circle cx="20" cy="37" r="5" fill="#8fd19a" />
      <circle cx="18.5" cy="35.5" r="1.4" fill="#fff" opacity=".7" />
    </symbol>
  ),
  crate: (
    <symbol id="es-crate" viewBox="0 0 40 50">
      <rect x="4" y="14" width="32" height="32" rx="3" fill="#c98f4f" stroke="#8d5632" strokeWidth="1.8" />
      <path d="M4 14 L36 46 M36 14 L4 46" stroke="#8d5632" strokeWidth="1.8" />
      <rect x="4" y="14" width="32" height="6" fill="var(--c1,#ffb347)" />
    </symbol>
  ),
  flask: (
    <symbol id="es-flask" viewBox="0 0 40 50">
      <rect x="10" y="10" width="20" height="36" rx="9" fill="var(--c1,#59d0c4)" />
      <rect x="14" y="4" width="12" height="8" rx="3" fill="#e8eef9" />
      <path d="M10 28 Q20 24 30 28 V38 Q30 46 20 46 Q10 46 10 38Z" fill="#fff" opacity=".4" />
      <circle cx="16" cy="20" r="2" fill="#fff" opacity=".6" />
    </symbol>
  ),
  mini: (
    <symbol id="es-mini" viewBox="0 0 40 50">
      <path d="M20 4 C27 12 28 26 27 40 H13 C12 26 13 12 20 4Z" fill="#fdfdfb" stroke="#c9ced8" strokeWidth="1" />
      <path d="M20 4 C23 8 25 12 25.6 16 H14.4 C15 12 17 8 20 4Z" fill="var(--c1,#e8574d)" />
      <circle cx="20" cy="24" r="3.6" fill="#9ed6f2" stroke="#c9ced8" strokeWidth="1.6" />
      <path d="M13 40 C7 42 7 46 8 48 L14 43Z M27 40 C33 42 33 46 32 48 L26 43Z" fill="var(--c2,#4a7fd6)" />
    </symbol>
  ),
  suit: (
    <symbol id="es-suit" viewBox="0 0 40 50">
      <rect x="3" y="18" width="7" height="20" rx="3.5" fill="#f1f3fa" />
      <rect x="30" y="18" width="7" height="20" rx="3.5" fill="#f1f3fa" />
      <rect x="9" y="15" width="22" height="22" rx="8" fill="#f7f8fc" />
      <rect x="9" y="25" width="22" height="4" fill="var(--c1,#e8574d)" />
      <circle cx="20" cy="9" r="8" fill="#f7f8fc" />
      <rect x="14.5" y="5" width="11" height="8" rx="4" fill="#27304f" />
      <ellipse cx="18" cy="8" rx="2.4" ry="1.4" fill="#8ff5ff" opacity=".6" />
      <rect x="11" y="36" width="7" height="11" rx="3" fill="#eef0f8" />
      <rect x="22" y="36" width="7" height="11" rx="3" fill="#eef0f8" />
    </symbol>
  ),
  day: (
    <symbol id="es-day" viewBox="0 0 40 50">
      <rect x="5" y="10" width="30" height="36" rx="5" fill="#fffaf0" stroke="var(--c1,#ffb347)" strokeWidth="2" />
      <rect x="5" y="10" width="30" height="9" rx="4" fill="var(--c1,#ffb347)" />
      <circle cx="20" cy="32" r="7" fill="#ffd36b" />
      <path d="M20 21V24 M20 40V43 M9 32H12 M28 32H31" stroke="#ffb21c" strokeWidth="2" strokeLinecap="round" />
    </symbol>
  ),
  panel: (
    <symbol id="es-panel" viewBox="0 0 40 50">
      <rect x="4" y="12" width="32" height="30" rx="2" fill="#1f4aa3" stroke="#9db8ec" strokeWidth="1.2" />
      <path d="M14.6 12V42 M25.3 12V42 M4 22H36 M4 32H36" stroke="#9db8ec" strokeWidth="1" />
    </symbol>
  ),
  shuttle: (
    <symbol id="es-shuttle" viewBox="0 0 40 50">
      <path d="M20 4 C30 12 31 26 30 42 H10 C9 26 10 12 20 4Z" fill="#f4f6fb" stroke="#c9ced8" strokeWidth="1" />
      <path d="M20 4 C25 8 28 13 29 18 H11 C12 13 15 8 20 4Z" fill="var(--c1,#4a7fd6)" />
      <rect x="14" y="24" width="4" height="4" rx="1.2" fill="#9ed6f2" />
      <rect x="22" y="24" width="4" height="4" rx="1.2" fill="#9ed6f2" />
      <rect x="14" y="31" width="4" height="4" rx="1.2" fill="#9ed6f2" />
      <rect x="22" y="31" width="4" height="4" rx="1.2" fill="#9ed6f2" />
      <path d="M10 42 C4 44 4 48 5 49 L11 45Z M30 42 C36 44 36 48 35 49 L29 45Z" fill="#8d96a8" />
    </symbol>
  ),
  rocket: (
    <symbol id="es-rocket" viewBox="0 0 40 50">
      <path d="M20 3 C28 10 30 22 29 36 H11 C10 22 12 10 20 3Z" fill="#fdfdfb" stroke="#c9ced8" strokeWidth="1" />
      <path d="M20 3 C24 7 27 11 28 16 H12 C13 11 16 7 20 3Z" fill="var(--c1,#e8574d)" />
      <path d="M11 36 C4 38 3 44 4 47 L12 41Z M29 36 C36 38 37 44 36 47 L28 41Z" fill="var(--c2,#4a7fd6)" />
      <circle cx="20" cy="22" r="4.6" fill="#9ed6f2" stroke="#c9ced8" strokeWidth="1.8" />
      <circle cx="18.6" cy="20.6" r="1.4" fill="#fff" opacity=".8" />
      <path d="M16 36 H24 L22 44 H18Z" fill="#ffb347" />
    </symbol>
  ),
  crew: (
    <symbol id="es-crew" viewBox="0 0 40 50">
      <rect x="9" y="26" width="22" height="21" rx="8" fill="#f7f8fc" />
      <rect x="9" y="33" width="22" height="4" fill="var(--c1,#e8574d)" />
      <circle cx="20" cy="16" r="12" fill="#f7f8fc" />
      <circle cx="20" cy="17" r="8.4" fill="#f2c6a0" />
      <path d="M12 14 C12 6 28 6 28 14 C25 11 15 11 12 14Z" fill="var(--c2,#3a2a22)" />
      <circle cx="16.6" cy="17" r="1.3" fill="#1a1030" />
      <circle cx="23.4" cy="17" r="1.3" fill="#1a1030" />
      <path d="M17 21 Q20 23.5 23 21" fill="none" stroke="#7a3b2a" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="11" y="44" width="7" height="5" rx="2.5" fill="#59627e" />
      <rect x="22" y="44" width="7" height="5" rx="2.5" fill="#59627e" />
    </symbol>
  ),
  probe: (
    <symbol id="es-probe" viewBox="0 0 40 50">
      <rect x="14" y="20" width="12" height="16" rx="3" fill="#e4e9f5" stroke="#aab4c6" strokeWidth="1" />
      <rect x="1" y="24" width="12" height="8" rx="1" fill="#2f5fb8" stroke="#9db8ec" strokeWidth=".8" />
      <rect x="27" y="24" width="12" height="8" rx="1" fill="#2f5fb8" stroke="#9db8ec" strokeWidth=".8" />
      <path d="M20 20 V10 M16 10 H24" stroke="#aab4c6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="28" r="3.4" fill="#8ff5ff" />
      <path d="M17 36 L15 44 H25 L23 36Z" fill="#ffb347" />
    </symbol>
  ),
  module: (
    <symbol id="es-module" viewBox="0 0 40 50">
      <rect x="6" y="14" width="28" height="32" rx="9" fill="#e4e9f5" stroke="#aab4c6" strokeWidth="1.2" />
      <rect x="6" y="14" width="28" height="9" rx="4" fill="var(--c1,#4a7fd6)" />
      <circle cx="20" cy="33" r="6" fill="#27304f" />
      <circle cx="20" cy="33" r="3.6" fill="#8ff5ff" opacity=".8" />
      <rect x="2" y="26" width="5" height="10" rx="2" fill="#8d96a8" />
      <rect x="33" y="26" width="5" height="10" rx="2" fill="#8d96a8" />
    </symbol>
  ),
  card: (
    <symbol id="es-card" viewBox="0 0 40 50">
      <rect x="5" y="12" width="30" height="34" rx="4" fill="#f4f8ff" stroke="var(--c1,#6bb8ff)" strokeWidth="2" />
      <path d="M10 22 H30 M10 29 H30 M10 36 H22" stroke="var(--c2,#9db8ec)" strokeWidth="2.2" strokeLinecap="round" />
    </symbol>
  ),
  beacon: (
    <symbol id="es-beacon" viewBox="0 0 40 50">
      <path d="M20 8 V44" stroke="#aab4c6" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 8 L36 14 L20 21Z" fill="var(--c1,#ffb347)" />
      <ellipse cx="20" cy="45" rx="9" ry="3" fill="#8d96a8" />
    </symbol>
  ),
  robot: (
    <symbol id="es-robot" viewBox="0 0 40 50">
      <path d="M20 4 V10" stroke="#aab4c6" strokeWidth="2" /><circle cx="20" cy="4" r="2.4" fill="#ffd36b" />
      <rect x="9" y="10" width="22" height="16" rx="6" fill="#e4e9f5" stroke="#aab4c6" strokeWidth="1.2" />
      <rect x="12" y="14" width="16" height="8" rx="4" fill="#1b2142" />
      <circle cx="16.5" cy="18" r="2.2" fill="#8ff5ff" /><circle cx="23.5" cy="18" r="2.2" fill="#8ff5ff" />
      <rect x="10" y="28" width="20" height="16" rx="5" fill="var(--c1,#4a7fd6)" />
      <rect x="4" y="29" width="6" height="12" rx="3" fill="#c9d0e0" /><rect x="30" y="29" width="6" height="12" rx="3" fill="#c9d0e0" />
      <rect x="12" y="44" width="6" height="5" rx="2" fill="#59627e" /><rect x="22" y="44" width="6" height="5" rx="2" fill="#59627e" />
    </symbol>
  ),
  comet: (
    <symbol id="es-comet" viewBox="0 0 40 50">
      <path d="M1 4 L28 22 L22 36Z" fill="#8fd7ff" opacity=".85" />
      <path d="M6 20 L26 28 L22 38Z" fill="#c7ecff" opacity=".7" />
      <circle cx="28" cy="31" r="12" fill="#ffd36b" stroke="#fff4c8" strokeWidth="1.6" /><circle cx="24" cy="27" r="4.5" fill="#fff" opacity=".8" /><circle cx="31" cy="35" r="2.4" fill="#e09a2a" />
    </symbol>
  ),
  battery: (
    <symbol id="es-battery" viewBox="0 0 40 50">
      <rect x="9" y="10" width="22" height="36" rx="5" fill="#2b3558" stroke="#aab4c6" strokeWidth="1.4" />
      <rect x="15" y="5" width="10" height="6" rx="2" fill="#aab4c6" />
      <rect x="12" y="20" width="16" height="22" rx="3" fill="var(--c1,#7ff0d0)" />
      <path d="M21 22 L16 32 H20 L19 40 L25 29 H21Z" fill="#fff" opacity=".9" />
    </symbol>
  ),
  box: (
    <symbol id="es-box" viewBox="0 0 40 50">
      <rect x="3" y="14" width="34" height="32" rx="4" fill="#d9e2f5" stroke="#8aa0c8" strokeWidth="1.6" />
      <rect x="3" y="14" width="34" height="8" rx="3" fill="var(--c1,#6bb8ff)" />
      <rect x="15" y="26" width="10" height="4" rx="2" fill="#8aa0c8" />
    </symbol>
  ),
  // places of the base map (carte): greenhouse dome, docking arm, gym, tower, launch ramp, rover
  dome: (
    <symbol id="es-dome" viewBox="0 0 40 50">
      <path d="M4 44 A16 18 0 0 1 36 44Z" fill="#bff3e0" fillOpacity=".55" stroke="#9be0b0" strokeWidth="1.6" />
      <path d="M12 44 Q14 34 18 40 Q20 30 24 40 Q27 33 29 44Z" fill="#4faa5a" />
      <rect x="2" y="43" width="36" height="5" rx="2" fill="#6b5237" />
    </symbol>
  ),
  dock: (
    <symbol id="es-dock" viewBox="0 0 40 50">
      <rect x="4" y="20" width="18" height="16" rx="3" fill="#c3cce0" stroke="#7f8cab" strokeWidth="1.4" />
      <rect x="22" y="23" width="12" height="10" rx="2" fill="#8a96ae" />
      <circle cx="35" cy="24" r="2.4" fill="#ffd36b" /><circle cx="35" cy="32" r="2.4" fill="#ffd36b" />
      <rect x="10" y="36" width="6" height="12" fill="#7f8cab" />
    </symbol>
  ),
  gym: (
    <symbol id="es-gym" viewBox="0 0 40 50">
      <rect x="10" y="27" width="20" height="4" rx="2" fill="#aab4c6" />
      <rect x="4" y="20" width="6" height="18" rx="2" fill="var(--c1,#e8574d)" /><rect x="30" y="20" width="6" height="18" rx="2" fill="var(--c1,#e8574d)" />
    </symbol>
  ),
  tower: (
    <symbol id="es-tower" viewBox="0 0 40 50">
      <path d="M14 48 L18 8 H22 L26 48Z" fill="#c3cce0" stroke="#7f8cab" strokeWidth="1.2" />
      <path d="M16 30 H24 M17 20 H23" stroke="#7f8cab" strokeWidth="1.2" /><circle cx="20" cy="6" r="3" fill="#ff7a59" />
    </symbol>
  ),
  ramp: (
    <symbol id="es-ramp" viewBox="0 0 40 50">
      <path d="M3 46 L37 46 L37 30Z" fill="#8d96a8" stroke="#5b6580" strokeWidth="1.2" />
      <path d="M8 46 V41 M16 46 V38 M24 46 V35 M32 46 V32" stroke="#ffd36b" strokeWidth="1.6" />
    </symbol>
  ),
  rover: (
    <symbol id="es-rover" viewBox="0 0 40 50">
      <rect x="5" y="24" width="30" height="12" rx="4" fill="#e4e9f5" stroke="#7f8cab" strokeWidth="1.2" />
      <rect x="11" y="16" width="14" height="9" rx="3" fill="#8ff5ff" stroke="#7f8cab" strokeWidth="1" />
      <path d="M30 24 V12" stroke="#aab4c6" strokeWidth="1.6" /><circle cx="30" cy="11" r="2.4" fill="#ff7a59" />
      <circle cx="11" cy="40" r="5" fill="#2b2f45" /><circle cx="29" cy="40" r="5" fill="#2b2f45" />
    </symbol>
  ),
  star: (
    <symbol id="es-star" viewBox="0 0 40 50">
      <path d="M20 4 L25.5 18.5 L40 19.5 L28.5 29 L32.5 44 L20 35.5 L7.5 44 L11.5 29 L0 19.5 L14.5 18.5Z" fill="var(--c1,#ffd36b)" stroke="#fff3c4" strokeWidth="1.6" strokeLinejoin="round" />
    </symbol>
  ),
};
export type EsGlyph = keyof typeof SYMS;
export const ES_GLYPHS = Object.keys(SYMS) as EsGlyph[];
/** Word of a story to the glyph that draws it (only things this kit really draws; anything else is refused by the router). */
export const ES_WORD: [RegExp, EsGlyph][] = [
  [/fusées? miniatures?|miniature rockets?/i, 'mini'],
  [/fusées?|rockets?/i, 'rocket'],
  [/astronautes?|équipage|crew|personnes?|people|passagers?|passengers?|techniciens?|technicians?/i, 'crew'],
  [/outils?|\btools?\b/i, 'tool'],
  [/tomates?|tomatoes|tomato/i, 'tomato'],
  [/bidons?|bouteilles?|bottles?|canisters?|jerrycans?/i, 'canister'],
  [/repas|\bmeals?\b|rations?/i, 'meal'],
  [/caisses?|crates?/i, 'crate'],
  [/gourdes?|flasks?/i, 'flask'],
  [/combinaisons?|\bsuits?\b/i, 'suit'],
  [/panneaux?|panels?/i, 'panel'],
  [/navettes?|shuttles?/i, 'shuttle'],
  [/étoiles?|\bstars?\b/i, 'star'],
];
const RED = [['#e8574d', '#4faa5a'], ['#f0663a', '#4faa5a'], ['#d94a4a', '#4faa5a'], ['#ff7a59', '#4faa5a']];
const TINT = [['#e8574d', '#4a7fd6'], ['#ffb347', '#59d0c4'], ['#6bb8ff', '#ff8fa3'], ['#59d0c4', '#ffb347'], ['#b69bff', '#ffd36b'], ['#9be0b0', '#e8574d']];

export function EsDefs({ names }: { names: readonly string[] }) {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
      <defs>{[...new Set(names)].map((n) => <Fragment key={n}>{SYMS[n]}</Fragment>)}</defs>
    </svg>
  );
}
/** One counted object. Each index gets its own tint, so a count is a set of individuals. */
export function Item({ g, i = 0, className = '', style }: { g: string; i?: number; className?: string; style?: CSSProperties }) {
  const t = (g === 'tomato' ? RED : TINT)[i % (g === 'tomato' ? RED : TINT).length]!;
  return (
    <svg viewBox="0 0 40 50" className={`es-it ${className}`} style={{ '--c1': t[0], '--c2': t[1], ...style } as CSSProperties} aria-hidden>
      <use href={`#es-${g}`} />
    </svg>
  );
}

/** The station seen from outside, large and detailed: a long truss, three pressurised modules with lit windows, a cupola, four solar wings with cells, radiators, a dish and a docking tube with three lights on the left. About 24 nodes. */
export function BigStation() {
  const wings = [[46, 2], [46, 66], [128, 2], [128, 66]];
  const rect = ([x, y]: number[]) => `M${x} ${y}h40v40h-40z`;
  const grid = ([x, y]: number[]) => `M${x! + 8} ${y}v40M${x! + 16} ${y}v40M${x! + 24} ${y}v40M${x! + 32} ${y}v40M${x} ${y! + 10}h40M${x} ${y! + 20}h40M${x} ${y! + 30}h40`;
  return (
    <svg viewBox="0 0 200 110" className="bs" aria-hidden>
      <defs>
        <linearGradient id="bs-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".6" stopColor="#c3cce0" /><stop offset="1" stopColor="#7f8cab" /></linearGradient>
        <linearGradient id="bs-sol" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a86f0" /><stop offset=".55" stopColor="#1f4fb4" /><stop offset="1" stopColor="#173a86" /></linearGradient>
      </defs>
      <path d="M30 53h150v4H30z M65 42v11 M65 57v9 M147 42v11 M147 57v9" stroke="#8a96ae" strokeWidth="3" fill="#8a96ae" />
      <path d={wings.map(rect).join('')} fill="url(#bs-sol)" stroke="#a9c3f5" strokeWidth=".8" />
      <path d={wings.map(grid).join('')} stroke="#a9c3f5" strokeWidth=".7" fill="none" />
      <rect x="86" y="30" width="30" height="50" rx="12" fill="url(#bs-hull)" stroke="#9aa6c0" strokeWidth=".8" />
      <circle cx="101" cy="46" r="8" fill="#1b2142" /><circle cx="101" cy="46" r="5.2" fill="#8ff5ff" opacity=".9" />
      <path d="M92 30 C92 18 110 18 110 30Z" fill="#e8eefb" stroke="#9aa6c0" strokeWidth=".8" />
      <rect x="42" y="44" width="46" height="22" rx="8" fill="url(#bs-hull)" stroke="#9aa6c0" strokeWidth=".8" />
      <path d="M52 50h5v5h-5z M62 50h5v5h-5z M72 50h5v5h-5z" fill="#ffd36b" />
      <rect x="26" y="41" width="14" height="28" rx="3.5" fill="#6c7791" />
      <circle className="st-port" cx="24" cy="46" r="4.2" stroke="#fff" strokeWidth="1" /><circle className="st-port" cx="24" cy="64" r="4.2" stroke="#fff" strokeWidth="1" />
      <rect x="114" y="46" width="50" height="20" rx="8" fill="url(#bs-hull)" stroke="#9aa6c0" strokeWidth=".8" />
      <path d="M124 51h5v5h-5z M134 51h5v5h-5z M144 51h5v5h-5z M154 51h5v5h-5z" fill="#8ff5ff" opacity=".85" />
      <path d="M170 22h12v22h-12z M170 28h12 M170 34h12 M170 40h12" fill="#e8eefb" stroke="#aab4c6" strokeWidth=".6" />
      <path d="M184 12 C192 16 194 24 188 30" fill="none" stroke="#cfd6e6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
