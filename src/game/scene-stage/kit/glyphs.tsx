import { Fragment, type CSSProperties, type ReactNode } from 'react';

/**
 * Small counted-object glyphs shared by the grid, chart and sky archetypes: chess pieces (ebony family, tinted by --pb/--pr/--pa),
 * clinic items and space items. One `<defs>` per stage (ids `gl-*`), each use is two nodes. Every glyph stands on y=48 of a 40x50 box.
 */
const face = (y: number) => (
  <>
    <circle cx="15" cy={y} r="2.1" fill="#fffaf0" />
    <circle cx="25" cy={y} r="2.1" fill="#fffaf0" />
    <circle cx="15.5" cy={y + 0.3} r="1.2" fill="#1a1030" />
    <circle cx="25.5" cy={y + 0.3} r="1.2" fill="#1a1030" />
  </>
);
const eyes = (y: number) => (
  <>
    <circle cx="15" cy={y} r="1.7" fill="#2a1a1a" />
    <circle cx="25" cy={y} r="1.7" fill="#2a1a1a" />
    <circle cx="15.5" cy={y - 0.6} r=".6" fill="#fff" />
    <circle cx="25.5" cy={y - 0.6} r=".6" fill="#fff" />
  </>
);
const B = 'var(--pb,#3a3a6e)';
const A = 'var(--pa,#ffb347)';
const R = 'var(--pr,#9a9be0)';
const foot = <path d="M8 48 Q8 43 13 42 H27 Q32 43 32 48Z" fill={B} />;
const smile = (y: number) => <path d={`M17 ${y}q3 2 6 0`} stroke="#ffc9a8" strokeWidth="1.2" fill="none" />;

const SYMS: Record<string, ReactNode> = {
  pawn: (
    <symbol id="gl-pawn" viewBox="0 0 40 50">{foot}<path d="M14 42 C15 36 17 32 17 28 H23 C23 32 25 36 26 42Z" fill={B} /><ellipse cx="20" cy="28" rx="8" ry="2.4" fill={A} /><circle cx="20" cy="19" r="10" fill={B} /><ellipse cx="16" cy="14" rx="3.2" ry="1.8" fill="#fff" opacity=".35" />{face(20)}{smile(25)}</symbol>
  ),
  rook: (
    <symbol id="gl-rook" viewBox="0 0 40 50">{foot}<path d="M12 42 L14 20 H26 L28 42Z" fill={B} /><path d="M11 20 V10 H15 V13 H18 V10 H22 V13 H25 V10 H29 V20Z" fill={B} /><rect x="11" y="19" width="18" height="3" fill={A} />{face(30)}{smile(36)}</symbol>
  ),
  knight: (
    <symbol id="gl-knight" viewBox="0 0 40 50">{foot}<path d="M12 42 C12 30 14 22 20 14 L18 8 L24 10 C30 14 31 22 28 28 L27 42Z" fill={B} /><path d="M20 14 C16 16 13 20 10 24 L13 27 L17 24Z" fill={R} opacity=".55" /><circle cx="22" cy="17" r="1.9" fill="#fffaf0" /><circle cx="22.4" cy="17.2" r="1" fill="#1a1030" /><path d="M16 36 q4 3 9 0" stroke={A} strokeWidth="2" fill="none" /></symbol>
  ),
  bishop: (
    <symbol id="gl-bishop" viewBox="0 0 40 50">{foot}<path d="M13 42 C14 36 16 33 16 29 H24 C24 33 26 36 27 42Z" fill={B} /><path d="M20 4 C28 10 30 18 27 26 H13 C10 18 12 10 20 4Z" fill={B} /><path d="M18 11 H22 M20 9 V13" stroke={A} strokeWidth="2" /><ellipse cx="20" cy="28" rx="8" ry="2.2" fill={A} />{face(19)}{smile(24)}</symbol>
  ),
  queen: (
    <symbol id="gl-queen" viewBox="0 0 40 50">{foot}<path d="M12 42 L15 22 H25 L28 42Z" fill={B} /><path d="M10 12 L15 20 L20 8 L25 20 L30 12 L28 24 H12Z" fill={B} /><circle cx="10" cy="11" r="2" fill={A} /><circle cx="20" cy="7" r="2.2" fill={A} /><circle cx="30" cy="11" r="2" fill={A} />{face(30)}{smile(36)}</symbol>
  ),
  king: (
    <symbol id="gl-king" viewBox="0 0 40 50">{foot}<path d="M12 42 L15 22 H25 L28 42Z" fill={B} /><path d="M11 24 C9 14 14 12 20 12 C26 12 31 14 29 24Z" fill={B} /><path d="M20 2 V10 M16.5 5.5 H23.5" stroke={A} strokeWidth="2.4" strokeLinecap="round" />{face(19)}{smile(24)}</symbol>
  ),
  person: (
    <symbol id="gl-person" viewBox="0 0 40 50"><path d="M7 48 C7 36 12 31 20 31 C28 31 33 36 33 48Z" fill={B} /><circle cx="20" cy="20" r="9.5" fill="#f2c6a0" /><path d="M10 18 C10 8 30 8 30 18 C26 13 14 13 10 18Z" fill={A} />{eyes(21)}<path d="M17 26q3 2 6 0" stroke="#b5654a" strokeWidth="1.2" fill="none" /></symbol>
  ),
  chair: (
    <symbol id="gl-chair" viewBox="0 0 40 50"><path d="M11 8 H29 V26 H11Z" fill="#b9774b" /><rect x="9" y="26" width="22" height="5" rx="1.5" fill="#8d5632" /><path d="M11 31 V48 M29 31 V48" stroke="#8d5632" strokeWidth="3" strokeLinecap="round" /></symbol>
  ),
  dog: (
    <symbol id="gl-dog" viewBox="0 0 40 50"><ellipse cx="20" cy="40" rx="11" ry="8" fill="#d9a066" /><circle cx="20" cy="24" r="12" fill="#e7b57d" /><ellipse cx="9" cy="24" rx="4.4" ry="8" fill="#a9703b" /><ellipse cx="31" cy="24" rx="4.4" ry="8" fill="#a9703b" /><ellipse cx="20" cy="29" rx="6" ry="4.6" fill="#fff0dc" />{eyes(22)}<ellipse cx="20" cy="27.5" rx="2.2" ry="1.6" fill="#2a1a1a" /></symbol>
  ),
  cat: (
    <symbol id="gl-cat" viewBox="0 0 40 50"><ellipse cx="20" cy="40" rx="10" ry="8" fill="#b9bdc9" /><path d="M8 20 L11 5 L19 13Z M32 20 L29 5 L21 13Z" fill="#b9bdc9" /><circle cx="20" cy="24" r="12" fill="#c9cdd8" />{eyes(22)}<path d="M18 27 L22 27 L20 29.5Z" fill="#e58aa0" /><path d="M10 27 H15 M25 27 H30" stroke="#6b6f80" strokeWidth=".8" /></symbol>
  ),
  rabbit: (
    <symbol id="gl-rabbit" viewBox="0 0 40 50"><ellipse cx="20" cy="40" rx="10" ry="8" fill="#f0e4d8" /><ellipse cx="14" cy="10" rx="3.6" ry="10" fill="#f0e4d8" /><ellipse cx="26" cy="10" rx="3.6" ry="10" fill="#f0e4d8" /><ellipse cx="14" cy="11" rx="1.6" ry="6" fill="#f4b7c4" /><ellipse cx="26" cy="11" rx="1.6" ry="6" fill="#f4b7c4" /><circle cx="20" cy="26" r="11" fill="#f7ede3" />{eyes(24)}<ellipse cx="20" cy="28.6" rx="1.8" ry="1.3" fill="#e58aa0" /></symbol>
  ),
  mouse: (
    <symbol id="gl-mouse" viewBox="0 0 40 50"><ellipse cx="20" cy="40" rx="10" ry="7.5" fill="#bfa99a" /><circle cx="9" cy="22" r="6.5" fill="#d8c2b4" /><circle cx="31" cy="22" r="6.5" fill="#d8c2b4" /><circle cx="9" cy="22" r="3.4" fill="#f4b7c4" /><circle cx="31" cy="22" r="3.4" fill="#f4b7c4" /><circle cx="20" cy="27" r="10.5" fill="#cdb7a8" />{eyes(25)}<circle cx="20" cy="30.6" r="1.5" fill="#e58aa0" /></symbol>
  ),
  hamster: (
    <symbol id="gl-hamster" viewBox="0 0 40 50"><ellipse cx="20" cy="40" rx="12" ry="8" fill="#e8b878" /><circle cx="10" cy="17" r="4.6" fill="#d89a5c" /><circle cx="30" cy="17" r="4.6" fill="#d89a5c" /><ellipse cx="20" cy="26" rx="13" ry="11.5" fill="#f1c993" /><ellipse cx="20" cy="30" rx="8" ry="5.6" fill="#fff3e0" />{eyes(23)}<ellipse cx="20" cy="27.6" rx="1.8" ry="1.3" fill="#e58aa0" /></symbol>
  ),
  guinea: (
    <symbol id="gl-guinea" viewBox="0 0 40 50"><ellipse cx="20" cy="40" rx="13" ry="8" fill="#b9733c" /><ellipse cx="20" cy="40" rx="6" ry="6" fill="#f6ead8" /><ellipse cx="9" cy="19" rx="4" ry="5" fill="#8a5028" /><ellipse cx="31" cy="19" rx="4" ry="5" fill="#8a5028" /><ellipse cx="20" cy="26" rx="12" ry="10.5" fill="#c98a52" /><path d="M20 15 C14 17 15 26 20 28 C25 26 26 17 20 15Z" fill="#f6ead8" />{eyes(24)}<ellipse cx="20" cy="29" rx="1.8" ry="1.3" fill="#3a2418" /></symbol>
  ),
  ferret: (
    <symbol id="gl-ferret" viewBox="0 0 40 50"><path d="M6 46 C6 34 12 36 20 36 C30 36 34 38 34 46Z" fill="#a9957f" /><circle cx="11" cy="15" r="4" fill="#8f7b66" /><circle cx="29" cy="15" r="4" fill="#8f7b66" /><ellipse cx="20" cy="25" rx="11" ry="10" fill="#c3b2a0" /><path d="M10 22 C14 18 26 18 30 22 C28 28 12 28 10 22Z" fill="#5a4a3e" />{eyes(23)}<ellipse cx="20" cy="29" rx="5" ry="3.6" fill="#f3ebe0" /><ellipse cx="20" cy="27.6" rx="1.6" ry="1.2" fill="#e58aa0" /></symbol>
  ),
  giraffe: (
    <symbol id="gl-giraffe" viewBox="0 0 40 50"><ellipse cx="20" cy="43" rx="11" ry="6" fill="#f2c24e" /><rect x="15" y="14" width="10" height="30" rx="5" fill="#f2c24e" /><ellipse cx="20" cy="12" rx="8.4" ry="7" fill="#f6d06a" /><rect x="14" y="2" width="2" height="6" fill="#a9703b" /><rect x="24" y="2" width="2" height="6" fill="#a9703b" /><circle cx="15" cy="2.2" r="1.6" fill="#a9703b" /><circle cx="25" cy="2.2" r="1.6" fill="#a9703b" /><circle cx="17" cy="28" r="2.4" fill="#b9773b" /><circle cx="23" cy="36" r="2.6" fill="#b9773b" /><circle cx="16" cy="40" r="2" fill="#b9773b" />{eyes(11)}<ellipse cx="20" cy="15.4" rx="3.6" ry="2.4" fill="#fff0cc" /></symbol>
  ),
  plush: (
    <symbol id="gl-plush" viewBox="0 0 40 50"><ellipse cx="20" cy="39" rx="11" ry="9" fill="#c98a52" /><circle cx="10" cy="14" r="5" fill="#c98a52" /><circle cx="30" cy="14" r="5" fill="#c98a52" /><circle cx="20" cy="23" r="12" fill="#d89d62" /><ellipse cx="20" cy="27.5" rx="5.4" ry="4" fill="#f3d8b4" />{eyes(21)}<ellipse cx="20" cy="26.4" rx="1.8" ry="1.3" fill="#3a2418" /><path d="M16 38 L24 38 L20 42Z" fill="#e8574d" /></symbol>
  ),
  bandage: (
    <symbol id="gl-bandage" viewBox="0 0 40 50"><rect x="3" y="26" width="34" height="14" rx="7" fill="#f2c6a0" /><rect x="14" y="26" width="12" height="14" fill="#f9dfc4" /><path d="M7 33 h.1 M11 33 h.1 M29 33 h.1 M33 33 h.1" stroke="#c99468" strokeWidth="2" strokeLinecap="round" /></symbol>
  ),
  drop: (
    <symbol id="gl-drop" viewBox="0 0 40 50"><path d="M20 8 C28 20 32 26 32 34 C32 42 26 47 20 47 C14 47 8 42 8 34 C8 26 12 20 20 8Z" fill="#5db7f0" /><ellipse cx="15" cy="32" rx="3" ry="5" fill="#fff" opacity=".5" /></symbol>
  ),
  box: (
    <symbol id="gl-box" viewBox="0 0 40 50"><rect x="4" y="18" width="32" height="26" rx="3" fill="#ef6f6c" /><rect x="4" y="18" width="32" height="7" rx="3" fill="#f78f8b" /><rect x="17" y="10" width="6" height="34" fill="#fff" opacity=".9" /><rect x="11" y="27" width="18" height="6" fill="#fff" opacity=".9" /></symbol>
  ),
  glove: (
    <symbol id="gl-glove" viewBox="0 0 40 50">
      {/* a rubber glove with five fingers: four fingers, a thumb, a palm and a cuff */}
      <g stroke="#2f7f75" strokeWidth="1" fill="#7fd9cd">
      <rect x="9.5" y="10" width="4.6" height="16" rx="2.3" />
      <rect x="14.9" y="5.5" width="4.6" height="20" rx="2.3" />
      <rect x="20.3" y="4" width="4.6" height="21" rx="2.3" />
      <rect x="25.7" y="8" width="4.6" height="17" rx="2.3" />
      <rect x="9.5" y="20" width="20.8" height="19" rx="6" />
      <rect x="2.6" y="22" width="5" height="14" rx="2.5" transform="rotate(-28 5 28)" />
      <rect x="11" y="38" width="18" height="9" rx="3" fill="#d8f6f1" />
      </g>
      <path d="M14.6 14 V24 M19.9 10 V24 M25.3 12 V24" stroke="#5cb6ab" strokeWidth=".8" strokeLinecap="round" opacity=".7" />
    </symbol>
  ),
  treat: (
    <symbol id="gl-treat" viewBox="0 0 40 50"><path d="M6 34 a5 5 0 1 1 6 -6 L28 28 a5 5 0 1 1 6 6 a5 5 0 1 1 -6 6 L12 40 a5 5 0 1 1 -6 -6Z" fill="#e2a860" /><circle cx="16" cy="34" r="1.2" fill="#b97a30" /><circle cx="24" cy="34" r="1.2" fill="#b97a30" /></symbol>
  ),
  kibble: (
    <symbol id="gl-kibble" viewBox="0 0 40 50"><circle cx="20" cy="36" r="9" fill="#b9733d" /><circle cx="16" cy="33" r="2.6" fill="#d89358" /><circle cx="24" cy="38" r="1.2" fill="#8a5326" /></symbol>
  ),
  bag: (
    <symbol id="gl-bag" viewBox="0 0 40 50"><path d="M7 20 H33 V46 H7Z" fill="#6aa7e8" /><path d="M14 20 V14 C14 9 26 9 26 14 V20" stroke="#3d6fb3" strokeWidth="3" fill="none" /><rect x="16" y="28" width="8" height="8" rx="1" fill="#fff" /><path d="M20 29 V35 M17 32 H23" stroke="#ef6f6c" strokeWidth="2" /></symbol>
  ),
  cell: (
    <symbol id="gl-cell" viewBox="0 0 40 50"><rect x="4" y="14" width="32" height="32" rx="7" fill={B} /><rect x="4" y="14" width="32" height="13" rx="7" fill="#fff" opacity=".3" /><rect x="4" y="38" width="32" height="8" rx="5" fill="#000" opacity=".18" /></symbol>
  ),
  panel: (
    <symbol id="gl-panel" viewBox="0 0 40 50"><path d="M4 18 H36 L32 44 H8Z" fill="#2f5fb8" /><path d="M13 18 L11 44 M20 18 V44 M27 18 L29 44 M5.5 31 H34.5" stroke="#9db8ec" strokeWidth="1.2" /><rect x="18" y="44" width="4" height="5" fill="#aab4c6" /></symbol>
  ),
  crate: (
    <symbol id="gl-crate" viewBox="0 0 40 50"><rect x="4" y="14" width="32" height="32" rx="3" fill="#b98250" /><path d="M4 14 L36 46 M36 14 L4 46" stroke="#8d5f36" strokeWidth="2.4" /><rect x="4" y="14" width="32" height="32" rx="3" fill="none" stroke="#6d4a33" strokeWidth="2.4" /></symbol>
  ),
  mat: (
    <symbol id="gl-mat" viewBox="0 0 40 50"><rect x="4" y="24" width="32" height="22" rx="4" fill={B} /><rect x="8" y="28" width="24" height="14" rx="3" fill="#fff" opacity=".4" /></symbol>
  ),
  star: (
    <symbol id="gl-star" viewBox="0 0 40 50"><path d="M20 6 L25 19 L39 20 L28 29 L32 43 L20 35 L8 43 L12 29 L1 20 L15 19Z" fill="#ffd36b" stroke="#fff3c4" strokeWidth="1.6" strokeLinejoin="round" /></symbol>
  ),
  planet: (
    <symbol id="gl-planet" viewBox="0 0 40 50"><circle cx="20" cy="26" r="12" fill="#6bb8ff" /><path d="M9 21 Q20 17 31 23 M10 30 Q20 26 30 32" stroke="#fff" strokeWidth="2" opacity=".35" fill="none" /><ellipse cx="20" cy="27" rx="19" ry="4.6" fill="none" stroke="#ffd36b" strokeWidth="2.2" /></symbol>
  ),
  moon: (
    <symbol id="gl-moon" viewBox="0 0 40 50"><circle cx="20" cy="26" r="14" fill="#e4e8f2" /><circle cx="14" cy="22" r="3.4" fill="#c4cadb" /><circle cx="25" cy="31" r="4.2" fill="#c4cadb" /><circle cx="26" cy="20" r="2" fill="#c4cadb" /></symbol>
  ),
  rocket: (
    <symbol id="gl-rocket" viewBox="0 0 40 50"><path d="M20 3 C28 10 30 22 29 36 H11 C10 22 12 10 20 3Z" fill="#fdfdfb" /><path d="M20 3 C24 7 27 11 28 16 H12 C13 11 16 7 20 3Z" fill="#e8574d" /><path d="M11 36 C4 38 3 44 4 47 L12 41Z M29 36 C36 38 37 44 36 47 L28 41Z" fill="#4a7fd6" /><circle cx="20" cy="22" r="4.6" fill="#9ed6f2" stroke="#c9ced8" strokeWidth="1.8" /><path d="M16 36 H24 L22 44 H18Z" fill="#ffb347" /></symbol>
  ),
  astronaut: (
    <symbol id="gl-astronaut" viewBox="0 0 40 50"><rect x="9" y="26" width="22" height="20" rx="8" fill="#f4f6fb" /><circle cx="20" cy="17" r="11" fill="#f4f6fb" /><rect x="12" y="11" width="16" height="11" rx="5.5" fill="#27304f" /><ellipse cx="17" cy="15" rx="3" ry="1.6" fill="#8ff5ff" opacity=".6" /><rect x="15" y="34" width="10" height="6" rx="2" fill="#e8574d" /></symbol>
  ),
  comet: (
    <symbol id="gl-comet" viewBox="0 0 40 50"><path d="M4 8 L28 24 L24 32Z" fill="#8fd7ff" opacity=".55" /><circle cx="28" cy="29" r="9" fill="#ffe9a8" /><circle cx="26" cy="27" r="3" fill="#fff" opacity=".7" /></symbol>
  ),
  satellite: (
    <symbol id="gl-satellite" viewBox="0 0 40 50"><rect x="14" y="20" width="12" height="14" rx="2" fill="#d7dcea" /><rect x="2" y="23" width="10" height="8" fill="#2f5fb8" /><rect x="28" y="23" width="10" height="8" fill="#2f5fb8" /><path d="M20 20 V12 M17 12 H23" stroke="#aab4c6" strokeWidth="2" /><circle cx="20" cy="27" r="3" fill="#8ff5ff" /></symbol>
  ),
  capsule: (
    <symbol id="gl-capsule" viewBox="0 0 40 50"><path d="M10 42 L14 12 H26 L30 42Z" fill="#f4f6fb" /><path d="M14 12 C14 4 26 4 26 12Z" fill="#e8574d" /><circle cx="20" cy="26" r="5" fill="#9ed6f2" stroke="#c9ced8" strokeWidth="2" /></symbol>
  ),
  sun: (
    <symbol id="gl-sun" viewBox="0 0 40 50"><circle cx="20" cy="26" r="11" fill="#ffd36b" /><path d="M20 6V11 M20 41V46 M0 26H5 M35 26H40 M6 12 L10 16 M30 36 L34 40 M34 12 L30 16 M10 36 L6 40" stroke="#ffb21c" strokeWidth="2.4" strokeLinecap="round" /></symbol>
  ),
};

/** Only the symbols a scene uses are rendered (each symbol is many nodes; the stage budget is 250). */
export function GlyphDefs({ names }: { names: readonly string[] }) {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
      <defs>{[...new Set(names)].map((n) => <Fragment key={n}>{SYMS[n]}</Fragment>)}</defs>
    </svg>
  );
}

/** Names found in questions (`img:chess-pawn-b`, `water-drop`, ...) to a glyph id. Unknown names fall back to the world's own default, never to nothing. */
const ALIAS: Record<string, string> = {
  'chess-pawn-b': 'pawn', 'chess-rook': 'rook', 'chess-knight': 'knight', 'chess-bishop': 'bishop', 'chess-queen': 'queen', 'chess-king': 'king',
  'water-drop': 'drop', tile: 'mat', 'tile-yellow': 'mat', 'tile-blue': 'mat', 'person-man': 'person', 'person-woman': 'person',
};
export const GLYPHS = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king', 'person', 'chair', 'dog', 'cat', 'rabbit', 'mouse', 'hamster', 'guinea', 'ferret', 'giraffe', 'plush', 'bandage', 'drop', 'box', 'glove', 'treat', 'kibble', 'bag', 'mat', 'cell', 'panel', 'crate', 'star', 'planet', 'moon', 'rocket', 'astronaut', 'comet', 'satellite', 'capsule', 'sun'] as const;
export function glyphName(raw: string | undefined, fallback: string): string {
  const k = (raw ?? '').replace(/^img:/, '');
  const g = ALIAS[k] ?? k;
  return (GLYPHS as readonly string[]).includes(g) ? g : fallback;
}

const CELL_TINT = ['#59d0c4', '#ffb347', '#8fb8ff', '#ff8fa3', '#9be0b0'];
const MAT_TINT = ['#8fd9d0', '#ffd36b', '#8fb8ff', '#f4a6b8'];
const PIECE_TINT: [string, string, string][] = [['#3a3a6e', '#9a9be0', '#ffb347'], ['#4a2f5e', '#d3a2e8', '#59d0c4'], ['#244a52', '#82d6d9', '#ff8fa3'], ['#5a2c44', '#f0a0bb', '#ffd36b'], ['#2f4a3a', '#9be0b0', '#ff7a59'], ['#3d3f52', '#b9bdd8', '#6bb8ff']];

/** A glyph is a character, never a clone: each index takes its own tint (scarf, hair, mat colour). */
export function Glyph({ g, i = 0 }: { g: string; i?: number }) {
  const pc = PIECE_TINT[i % PIECE_TINT.length]!;
  const st = (g === 'cell' ? { '--pb': CELL_TINT[i % 5] } : g === 'mat' ? { '--pb': MAT_TINT[i % 4] } : { '--pb': pc[0], '--pr': pc[1], '--pa': pc[2] }) as unknown as CSSProperties;
  return (
    <svg viewBox="0 0 40 50" className="gl" style={st} aria-hidden>
      <use href={`#gl-${g}`} />
    </svg>
  );
}
