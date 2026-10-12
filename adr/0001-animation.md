# ADR 0001: Animation stack

Status: accepted (provisional until the P0 size spike is measured on the real bundle).

Decision: CSS first (transforms, keyframes, `@starting-style`); Motion `useAnimate` mini only if a sequence cannot be done in CSS; `canvas-confetti` lazy loaded for the chapter-complete burst; `LazyMotion` with `domAnimation` only when a measured need appears.

Why: Motion documents about 2.3 KB for `useAnimate` mini and about 20 KB for `LazyMotion` plus `domAnimation`, against 0 KB for CSS. The product prompt asks for the lightest practical stack. As of this commit every animation is CSS; the `motion` dependency is installed but unused and can be removed if nothing needs it.
