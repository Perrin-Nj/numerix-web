# Numa the owl

Hand-built layered SVG in `src/game/mascot/Numa.tsx`, loaded lazily by `Mascot`. Decision record: `../numerix-api/docs/CONTENT_PLAN.md` section 7.

## Research and what we took from it

- Duolingo drives one rigged character with a Rive state machine: pose states, with mouth states running at the same time as pose states, blended by the machine. Source: https://blog.duolingo.com/world-character-visemes
- Typical Rive mascot rigs keep eyes, eyelids, pupils and eyebrows as separate pieces, plus a blink controller and a pupil tracking controller. A parallel layer fires a blink or glance every 2 to 5 seconds so app code does not manage it. Sources: https://dev.to/uianimation/building-a-duolingo-style-interactive-mascot-in-rive-step-by-step-guide-2d5c and https://dev.to/uianimation/dont-build-just-another-chatbot-architecting-a-duolingo-style-ai-companion-with-rive-49g5
- A free Rive rig uses two parallel state machine layers, idle and look, and an independent blink loop; head and pupils use 2D blends. Source: https://rive.app/marketplace/28370-53642-interactive-character-rig-bones-joysticks-and-data-binding/
- SVG eye followers move each pupil by a scaled offset of the pointer position relative to the eye, with a clamped range that is wider on x than on y. Sources: https://initialcommit.com/blog/javascript-mouse-tracking-eye-effect and https://21st.dev/@componentry/components/eye-tracking.md
- SVG transforms need an explicit origin: `transform-origin` in viewBox units, or `transform-box: fill-box` for percentages. Source: https://developer.mozilla.org/en-US/docs/Web/CSS/transform-box

## How the rig maps

- Layers: shadow, feet, body, belly, tufts, face disc, eyes (ball, iris, pupil, gloss, lid, blink lid, closed arcs), brows, beak and jaw, wings, extras (thought dots, sparkles, z).
- Every movable part has two nested groups. The outer one holds the pose (a CSS transform with a springy transition, so poses animate instead of swapping). The inner one (`data-p`) holds Motion loops and micro motions, so the two never fight over one transform.
- Origins are explicit viewBox points (shoulder, neck, feet line), so rotations hinge where the joint is.
- Pupils: pose gaze, or pointer and focus target, scaled and clamped (about 8 by 6 units inside a 25 unit eye), plus a small random glance in idle. A `look` prop overrides.
- Blink is a second lid that slides over the eye every 2.2 to 6 s, random, with an occasional double blink. Idle also tilts the head every 5 to 9 s and twitches a tuft every 8 to 14 s.
- Reduced motion (OS setting or in-app toggle): poses are still distinct but static, no loops, no tracking, no transitions.
- Size: about 7.5 KB gzipped with `motion/mini` (WAAPI), loaded on demand.
