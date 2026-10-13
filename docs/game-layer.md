# game

Kid-app widgets built from `ui`: story panel, choice buttons, outcome sheet and simulations, scene pictures, cards and gift, journey map, rewards, mascot and human avatars, error screens, screen-state wrapper.

Rules: one folder per component with `Component.tsx`, `Component.stories.tsx` (dark, high contrast, reduced motion, TV, fr, en), `messages.fr-CA.json`, `messages.en-CA.json`, `index.ts`. Props are plain data; no data fetching. Every animation has a reduced-motion variant. `scripts/check-stories.mjs` enforces the stories.
