# Plan V3: a play that talks, shows and reacts

Owner requests (verbatim themes), then plan, critique, todos, file ownership, tests.

## Requests

| # | Request | Where it lands |
|---|---------|----------------|
| 1 | Remove "Mode démo : le profil Zoé s'ouvre avec le code 1234..." text | `features/common/messages.*.json`, screen that shows it |
| 2 | After picking a profile, go straight to play (no second "Qui joue aujourd'hui ?" screen) | `ProfilePicker`, `/play` route guard |
| 3 | Read the scene aloud with a nice voice, fr and en | `lib/speech`, `StoryScreen` |
| 4 | Wrong answer: mascot emoji sad; right answer: mascot emoji happy | `game/mascot`, `StoryScreen` |
| 5 | Greeting uses the child's name ("Hé, Zoé, quelle bonne surprise de te voir !") | `lib/lines` (`{name}` slot), `HomeFeed` |
| 6 | More animations everywhere; joyful, never manipulative | `globals.css`, components |
| 7 | Many images in play, each different and tied to the actual question | `game/scene-picture` |
| 8 | Show the consequence: wrong = the risk (building collapses, with sound and animation, then encouragement); right = the real scenario that works. Every world | `game/outcome-sim` |
| 9 | Voice coaches while thinking: after 30 s idle, a gentle hint in a lower voice, configurable | `lib/coach`, `lib/prefs` |
| 10 | Voice choice matters: best available fr and en voice, natural pace | `lib/speech/voices.ts` |
| 11 | Gifts and cards: all different, perfect, animated, interactive | `game/story-card`, `game/welcome-gift`, `game/reward-burst` |
| 12 | State everywhere: events feed cards, map, challenges, reports | already wired (`lib/game`), add `hint` and `sim` events |

## Design

- **Name slot.** `usePickLine().pick(pool, { name })` replaces `{name}`. Welcome pool lines get a name variant. Child name comes from `useSessionStatus().data.childName` (add if missing) or the profile list.
- **Mascot mood.** `Mascot` gets poses `happy` and `sad` (emoji swap + small animation: bounce for happy, slow droop for sad). Sad is gentle: it never blames, it says "on regarde ensemble".
- **Voice.** `useReadAloud` picks the best voice per language: prefer names containing Natural/Neural/Online, then `localService` voices matching `fr-CA`, `fr-FR`, then any `fr`. Rate 0.95, pitch 1.05. Scene auto-reads once per beat when sound and read-aloud are on; the question follows. Mute button stays visible.
- **Coach.** `useCoach({ skill, active })`: idle timer (default 30 s, pref `hintDelaySec`); on fire speak one hint from `coach.<skill>` pool, lower volume (pref `hintVolume`, default 0.5), at most 2 hints per beat, resets on any tap. Hints guide the thinking, never give the answer. Prefs live in a persisted zustand store with a section on the Me screen (delay: off/15/30/45 s, volume, voice on/off).
- **Scene picture.** `ScenePicture({ world, skill, numbers })` draws the actual quantities: addition shows two groups of the world's object emoji (28 + 19 seeds), subtraction shows crossed-out items, multiplication shows rows, division shows groups with leftovers. Backgrounds from `WorldScene`. Different numbers give a different picture.
- **Outcome simulation.** `OutcomeSim({ world, good })` is a short animated SVG/CSS scene with a sound: construction (bridge holds / collapses), nature (garden blooms / dries), espace (rocket lands / drifts), cuisine (cake rises / flops), sport (goal / miss), medecine (patient smiles / worsens, never gory), science (reaction works / fizzles), echecs (checkmate / trap). After a wrong answer the sim shows the risk, then the mascot encourages. Text under the sim is a world-specific line pair from the story kit style (fr and en pools in `game/outcome-sim/messages.*`).
- **Cards and gift.** Each card gets a unique frame generated from its id (hue, pattern, foil), tilt on pointer, flip to read the story, shine sweep. Gift box: lid lifts, light burst, card rises out. Cards from chapters, challenges and gift look different from one another.
- **Healthy joy rule (product prompt).** Delight, variety and surprise stay. No timers, no loss framing, no streak shaming, no fake urgency.

## Critique of the plan

- Autoplay speech is blocked until a user gesture: the first tap on the home screen unlocks it; the story screen shows a visible "read aloud" button as fallback (no silent failure).
- Voices differ per device; the picker cannot guarantee quality. Show the chosen voice in settings and let the child or parent pick another.
- A sim after every answer slows the loop: sims play once per beat, skippable by tap, 3 s max, and the Continue button is available at once.
- "Addiction" is an unsafe goal for a children's product and conflicts with the product prompt. The work targets joy and curiosity; no variable-reward gambling patterns, no time pressure.
- Images are SVG/emoji compositions, not photos, so the app stays light, offline and licence-free.

## Todos

| id | Task | Owner | Status |
|----|------|-------|--------|
| T1 | Remove demo text, skip second profile screen | lead | todo |
| T2 | Name slot in lines, greeting with child's name | lead | todo |
| T3 | Voice picker, auto read scene, fr and en | agent voice | todo |
| T4 | Coach hints after idle, prefs store and Me section | agent voice | todo |
| T5 | Mascot happy and sad | agent visuals | todo |
| T6 | ScenePicture tied to the numbers | agent visuals | todo |
| T7 | OutcomeSim for 8 worlds, good and bad | agent visuals | todo |
| T8 | Card and gift redesign, interactive | agent cards | todo |
| T9 | New sounds for sims | agent cards | todo |
| T10 | Wire everything in StoryScreen | lead | todo |
| T11 | ui-checks and flows updates, docs, PR | lead | todo |

## File ownership (no overlaps)

- lead: `features/play/StoryScreen.tsx`, `HomeFeed.tsx`, `ProfilePicker.tsx`, `features/common/*`, `lib/lines/*`, scripts, docs.
- agent voice: `lib/speech/**`, `lib/coach/**` (new), `lib/prefs/**` (new), `features/play/MeScreen.tsx` settings section.
- agent visuals: `game/mascot/**`, `game/scene-picture/**` (new), `game/outcome-sim/**` (new), `game/illustration-frame/**`.
- agent cards: `game/story-card/**`, `game/welcome-gift/**`, `game/reward-burst/**`, `lib/audio/**`, `public/sounds/**`, `scripts/check-sound*.mjs`.

## Tests (shell, one line per check)

`bash scripts/test.sh` adds: no demo text on kid door, profile click goes straight to home, greeting contains the child's name, wrong answer shows sad mascot and sim, right answer shows happy mascot and sim, coach hint after idle (hint delay set to 3 s through the prefs store in the test), prefs persist, cards pairwise different art.

## Addendum: a warm woman's voice for on-screen messages

Request: on the home screen, read "Bienvenue, l'aventure t'attendait." (and every mascot message as it appears) with a beautiful, human-sounding woman's voice, nothing that sounds like AI.

Steps:
1. **Voice picker** prefers warm female voices (natural/online first), penalises male and robotic ones; parent or child can pick another in Me.
2. **Autoplay rule.** Browsers block speech before a tap. The last line is queued and spoken on the first tap; the UI shows a small "touche pour écouter" hint while a line is pending, never silent.
3. **`useSpokenLine(text)`** speaks each new message once; wired to the home greeting, mascot bubbles in the story, outcome lines and hints.
4. **Honest limit.** Browser voices can sound synthetic on some devices. For a truly human voice the finite line pools (about 250 lines per language) must be recorded by a voice actress and shipped as short audio files; `useSpokenLine` will prefer a file `public/voice/<lang>/<hash>.mp3` when it exists and fall back to browser speech. Recording is an owner task and is listed in BACKEND/ASSET todos.
