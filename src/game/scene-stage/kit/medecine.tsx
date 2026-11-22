import type { CSSProperties } from 'react';

// Medecine world kit: a puppy character with an eye line and moods, a drop, a dropper and a thought cloud.

/** Shared gradients for drops and glass (once per scene, inside the subject lane that is never hidden). */
export function MedDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
      <defs>
        <radialGradient id="md-blue" cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#c4f3f8" />
          <stop offset=".5" stopColor="#35b4d6" />
          <stop offset="1" stopColor="#12708f" />
        </radialGradient>
        <radialGradient id="md-gold" cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset=".5" stopColor="#ffbe45" />
          <stop offset="1" stopColor="#d77f18" />
        </radialGradient>
        <linearGradient id="md-glass" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".8" />
          <stop offset=".5" stopColor="#dff4f8" stopOpacity=".3" />
          <stop offset="1" stopColor="#fff" stopOpacity=".65" />
        </linearGradient>
        <linearGradient id="md-bulb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb09a" />
          <stop offset="1" stopColor="#e2604f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const DROP = 'M20 3 C27 13 34 20 34 28 A14 14 0 0 1 6 28 C6 20 13 13 20 3 Z';

/** A drop: two or three nodes. `kind` picks blue (given) or gold (the missing ones, which carry their count n). */
export function Drop({ kind, n }: { kind: 'blue' | 'gold'; n?: number }) {
  return (
    <svg viewBox="0 0 40 40" className="md-drop" aria-hidden>
      <path d={DROP} fill={`url(#md-${kind})`} />
      <path d="M12.5 29 Q10.5 22 16 15.5" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="3.2" strokeLinecap="round" />
      {n !== undefined && (
        <text x="21" y="33" textAnchor="middle" fontSize="13" fontWeight="800" fill="#5a3200" style={{ fontFamily: 'var(--font-display, system-ui)' }}>
          {n}
        </text>
      )}
    </svg>
  );
}

/** The dropper; the tip is the bottom centre of its box. */
export function Dropper() {
  return (
    <svg viewBox="0 0 30 106" className="md-dropper" aria-hidden>
      <g className="md-bulb">
        <path d="M6 34 C-2 8 4 -2 15 -2 C26 -2 32 8 24 34Z" fill="url(#md-bulb)" />
        <path d="M9 28 C5 16 7 7 11 4" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <rect x="5" y="33" width="20" height="7" rx="2.4" fill="#f6fbfb" />
      <path d="M8 40 H22 V86 L16.6 104 H13.4 L8 86Z" fill="url(#md-glass)" stroke="#fff" strokeOpacity=".85" strokeWidth="1.2" />
      <path d="M10 66 H20 V86 L16.2 101 H13.8 L10 86Z" fill="#35b4d6" opacity=".8" />
      <path d="M12 44 V80" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

/**
 * A puppy that sits and watches the dropper. Pupils look along (--lx, --ly); the head turns a little toward it. Moods come from the stage phase:
 * idle (watching), right (happy eyes, open mouth with tongue, tail going), gentle miss (head tilt, perked ears, raised brow).
 */
export function Puppy() {
  const V = '0 0 100 110';
  return (
    <div className="pp">
      <div className="pp-l pp-tail nx-anim">
        <svg viewBox={V} aria-hidden>
          <path d="M24 92 C6 92 -2 74 6 60" fill="none" stroke="#c98d49" strokeWidth="11" strokeLinecap="round" />
          <path d="M24 90 C8 90 0 74 7 61" fill="none" stroke="#f0c07c" strokeWidth="4" strokeLinecap="round" opacity=".7" />
        </svg>
      </div>
      <div className="pp-l pp-body nx-anim">
        <svg viewBox={V} aria-hidden>
          <ellipse cx="40" cy="90" rx="26" ry="17" fill="#e7b46f" />
          <ellipse cx="46" cy="72" rx="25" ry="32" fill="#f0c386" />
          <ellipse cx="58" cy="78" rx="13" ry="22" fill="#fff0d2" />
          <path d="M52 78 H66 V99 Q66 106 59 106 Q52 106 52 99Z M22 99 Q22 106 34 106 Q46 106 46 99 Z" fill="#f2cb93" />
          <path d="M52 100 H66 M24 101 H44" stroke="#c98d49" strokeOpacity=".35" strokeWidth="1.2" />
        </svg>
      </div>
      <div className="pp-l pp-head nx-anim">
        <div className="pp-l pp-ear-b nx-anim">
          <svg viewBox={V} aria-hidden>
            <ellipse cx="74" cy="18" rx="8" ry="15" fill="#b9803f" transform="rotate(24 74 18)" />
          </svg>
        </div>
        <div className="pp-l">
          <svg viewBox={V} aria-hidden>
            <circle cx="56" cy="40" r="26" fill="#f2c88c" />
            <ellipse cx="46" cy="24" rx="9" ry="4" fill="#fff" opacity=".28" transform="rotate(-24 46 24)" />
            <ellipse cx="76" cy="50" rx="16" ry="12" fill="#fff0d0" />
            <ellipse cx="89" cy="46" rx="5.6" ry="4.2" fill="#3a2418" />
            <ellipse cx="87.6" cy="44.6" rx="1.8" ry="1" fill="#fff" opacity=".85" />
            <path className="pp-mouth" d="M80 56 Q86 61 92 56" fill="none" stroke="#6a4020" strokeWidth="1.8" strokeLinecap="round" />
            <g className="pp-open">
              <path d="M79 55 Q86 68 93 55Z" fill="#7a2f2a" />
              <path d="M82 60 Q86 68 90 60Z" fill="#ff8fa3" />
            </g>
            <g className="nx-blink pp-eyes" style={{ '--d': '1.6s', '--bd': '5.6s' } as CSSProperties}>
              <ellipse cx="58" cy="36" rx="6.2" ry="7.4" fill="#fffdf6" />
              <ellipse cx="75" cy="35" rx="5.6" ry="6.8" fill="#fffdf6" />
              <g className="nx-pupil pp-pupils">
                <circle cx="59.4" cy="36.6" r="4" fill="#2a1a10" />
                <circle cx="76" cy="35.6" r="3.6" fill="#2a1a10" />
                <circle cx="60.6" cy="34.6" r="1.4" fill="#fff" />
                <circle cx="77" cy="33.8" r="1.2" fill="#fff" />
              </g>
            </g>
            <path className="pp-happy" d="M52 38 Q58 30 64 38 M70 37 Q76 29 81 37" fill="none" stroke="#2a1a10" strokeWidth="3" strokeLinecap="round" />
            <path className="pp-brow" d="M52 26 Q58 22 64 25 M70 24 Q76 20 82 24" fill="none" stroke="#a8692e" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M44 50h.1M68 56h.1" stroke="#ff9db6" strokeOpacity=".5" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
        <div className="pp-l pp-ear-f nx-anim">
          <svg viewBox={V} aria-hidden>
            <ellipse cx="32" cy="38" rx="12" ry="22" fill="#a8692e" transform="rotate(10 32 38)" />
            <ellipse cx="29" cy="30" rx="3.4" ry="10" fill="#fff" opacity=".18" transform="rotate(10 29 30)" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/** A thought cloud with a blank drop to fill (the question-phase hook). */
export function Cloud() {
  return (
    <svg viewBox="0 0 80 64" className="md-cloud" aria-hidden>
      <path d="M16 42 C2 42 0 24 14 22 C14 8 34 4 42 14 C50 4 70 10 68 24 C80 26 78 44 62 42 C58 52 40 54 34 46 C28 52 16 50 16 42Z" fill="#fff" opacity=".96" />
      <circle cx="12" cy="54" r="4" fill="#fff" opacity=".9" />
      <circle cx="5" cy="61" r="2.4" fill="#fff" opacity=".85" />
      <path className="mv-gap md-blank" d="M40 14 C45 21 50 26 50 31 A10 10 0 0 1 30 31 C30 26 35 21 40 14Z" fill="none" stroke="#5aa9bd" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}
