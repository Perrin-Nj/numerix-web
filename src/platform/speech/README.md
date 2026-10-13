# platform/speech

- `voices.ts`: `pickVoice(voices, lang, preferred)` ranks voices: same language only, warm female and natural first, never male when a woman voice exists.
- `useSpeaker.ts`: `speak`, `cancel`, `pending` (waiting for the first tap), `voiceLabel`. A French line is only read by a French voice. No voice for the language: silent here, the Me screen explains why.
- `spoken.ts`: symbols become words ("65 plus 39 égale combien").
- `useSpokenLine.ts`: speak a message once when it appears.

Checks: `scripts/check-voices.mjs`, `scripts/check-spoken.mjs`.
