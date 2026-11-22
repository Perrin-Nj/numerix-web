import type { CSSProperties } from 'react';

// Espace world kit: a big wall clock (face, hands as rotating boxes), a launch pad rocket and a friendly supply drone with an eye line.

/** The static clock face: bezel, white face, black numerals, minute and hour ticks. Nothing here animates, so it is rasterised once. */
export function ClockFace() {
  const tick = (a: number, r0: number, r1: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `M${(Math.cos(t) * r0).toFixed(1)} ${(Math.sin(t) * r0).toFixed(1)}L${(Math.cos(t) * r1).toFixed(1)} ${(Math.sin(t) * r1).toFixed(1)}`;
  };
  let minor = '';
  let major = '';
  for (let m = 0; m < 60; m++) {
    if (m % 5 === 0) major += tick(m * 6, 76, 86);
    else minor += tick(m * 6, 82, 86);
  }
  return (
    <svg viewBox="-100 -100 200 200" className="ck-face" aria-hidden>
      <defs>
        <linearGradient id="ck-bz" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6c7488" />
          <stop offset=".45" stopColor="#2b303d" />
          <stop offset="1" stopColor="#555d73" />
        </linearGradient>
        <radialGradient id="ck-fc" cx=".38" cy=".3" r=".9">
          <stop offset="0" stopColor="#fffef9" />
          <stop offset="1" stopColor="#ece6d6" />
        </radialGradient>
      </defs>
      <circle r="98" fill="url(#ck-bz)" />
      <circle r="91" fill="#d9deea" />
      <circle r="88" fill="url(#ck-fc)" />
      <path d={minor} stroke="#3a3a44" strokeWidth="1.6" strokeLinecap="round" />
      <path d={major} stroke="#14141a" strokeWidth="4.4" strokeLinecap="round" />
      {Array.from({ length: 12 }, (_, i) => {
        const n = i === 0 ? 12 : i;
        const t = ((n * 30 - 90) * Math.PI) / 180;
        return (
          <text key={n} x={Math.cos(t) * 62} y={Math.sin(t) * 62} textAnchor="middle" dominantBaseline="central" fontSize="25" fontWeight="800" fill="#14141a" style={{ fontFamily: 'var(--font-display, system-ui)' }}>
            {n}
          </text>
        );
      })}
    </svg>
  );
}

/** A hand: an upright tapered box pivoting at the clock centre; `--a` is its angle. Rotation is a compositor property. */
export function Hand({ kind, angle }: { kind: 'hour' | 'min'; angle: number }) {
  return (
    <div className={`ck-hand ck-${kind}`} style={{ '--a': `${angle}deg` } as CSSProperties}>
      <i className="ck-glow" />
      <i className="ck-body" />
    </div>
  );
}

/** A white rocket on its pad: body, red nose, blue fins, a round window. */
export function Rocket() {
  return (
    <svg viewBox="0 0 40 100" className="rk" aria-hidden>
      <path d="M20 2 C30 16 32 36 31 62 L9 62 C8 36 10 16 20 2Z" fill="#fdfdfb" />
      <path d="M20 2 C26 9 29 16 30 22 L10 22 C11 16 14 9 20 2Z" fill="#e8574d" />
      <path d="M9 62 C9 62 1 66 2 84 L10 72Z M31 62 C31 62 39 66 38 84 L30 72Z" fill="#4a7fd6" />
      <path d="M26 24 C28 36 29 50 28.6 62 L31 62 C32 36 30 16 20 2 C25 12 26 18 26 24Z" fill="#cfd6e4" opacity=".7" />
      <circle cx="20" cy="38" r="6.2" fill="#9ed6f2" stroke="#c9ced8" strokeWidth="2.2" />
      <circle cx="18" cy="36" r="1.8" fill="#fff" opacity=".85" />
      <path d="M12 62 H28 L25 70 H15Z" fill="#c9ced8" />
      <path d="M6 96 H34 L31 80 H9Z" fill="#8d96a8" />
    </svg>
  );
}

/** A small supply drone with eyes (the character of this scene): it looks at the clock, smiles at a right answer, tilts at a miss. */
export function Drone() {
  return (
    <svg viewBox="0 0 60 36" className="dr" aria-hidden>
      <ellipse className="dr-rotor" cx="12" cy="6" rx="12" ry="2.4" fill="#fff" opacity=".7" />
      <ellipse className="dr-rotor" cx="48" cy="6" rx="12" ry="2.4" fill="#fff" opacity=".7" />
      <path d="M12 8 L24 14 M48 8 L36 14" stroke="#9aa3b5" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="14" y="12" width="32" height="20" rx="10" fill="#f4f6fb" />
      <rect x="14" y="26" width="32" height="6" rx="3" fill="#c9d0e0" />
      <rect x="19" y="15" width="22" height="12" rx="6" fill="#1b2142" />
      <g className="nx-blink" style={{ '--d': '1.2s', '--bd': '4.4s' } as CSSProperties}>
        <g className="nx-pupil dr-eyes">
          <circle cx="26" cy="21" r="3" fill="#8ff5ff" />
          <circle cx="34" cy="21" r="3" fill="#8ff5ff" />
        </g>
      </g>
      <path className="dr-happy" d="M23 22 Q26 17.5 29 22 M31 22 Q34 17.5 37 22" fill="none" stroke="#8ff5ff" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M26 33 L34 33 L33 36 L27 36Z" fill="#e0a64a" />
    </svg>
  );
}

/** A space station seen in the window: a long truss, two solar wings, a docking ring with lights (the dock lights turn green at a right answer). */
export function Station() {
  return (
    <svg viewBox="0 0 120 70" className="st" aria-hidden>
      <rect x="6" y="31" width="108" height="5" rx="2.5" fill="#aab4c6" />
      <rect x="8" y="8" width="26" height="16" rx="2" fill="#2f5fb8" />
      <rect x="8" y="46" width="26" height="16" rx="2" fill="#2f5fb8" />
      <rect x="86" y="8" width="26" height="16" rx="2" fill="#2f5fb8" />
      <rect x="86" y="46" width="26" height="16" rx="2" fill="#2f5fb8" />
      <path d="M13 8v16M21 8v16M29 8v16M13 46v16M21 46v16M29 46v16M91 8v16M99 8v16M107 8v16M91 46v16M99 46v16M107 46v16" stroke="#9db8ec" strokeWidth=".8" />
      <rect x="44" y="22" width="32" height="26" rx="9" fill="#eef1f7" />
      <rect x="44" y="34" width="32" height="14" rx="7" fill="#c9d0e0" />
      <circle cx="60" cy="35" r="7" fill="#27304f" />
      <circle cx="60" cy="35" r="4" fill="#8ff5ff" opacity=".8" />
      <rect x="74" y="28" width="8" height="14" rx="3" fill="#d7dcea" />
      <circle className="st-dock" cx="80" cy="31" r="1.7" />
      <circle className="st-dock" cx="80" cy="35" r="1.7" />
      <circle className="st-dock" cx="80" cy="39" r="1.7" />
    </svg>
  );
}
