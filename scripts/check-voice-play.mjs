// V6: language-voice match, no computer voice without opt-in, a missing clip is captions only and silent in the console.
import assert from 'node:assert/strict';
import { planLine, clipFor } from '../src/platform/speech/plan.ts';

const manifest = { schema: 1, base: '/voice/', lines: { 'b.correct.01@fr': { file: 'fr/b.correct.01.m4a', locale: 'fr-CA' }, 'b.correct.01@en': { file: 'en/b.correct.01.m4a', locale: 'en-CA' }, 'x@fr': { file: 'wrong.m4a', locale: 'en-GB' } } };
const base = { manifest, soundOn: true, ttsSupported: true, prefs: { voice: true, computerVoice: false } };
const errors = [];
const origErr = console.error;
const origWarn = console.warn;
console.error = (...a) => errors.push(a);
console.warn = (...a) => errors.push(a);

// language follows the UI, never the other one
assert.equal(planLine({ ...base, lineId: 'b.correct.01', lang: 'fr-CA' }).url, '/voice/fr/b.correct.01.m4a');
assert.equal(planLine({ ...base, lineId: 'b.correct.01', lang: 'en-CA' }).url, '/voice/en/b.correct.01.m4a');
assert.equal(clipFor(manifest, 'x', 'fr-CA'), null, 'a clip tagged with another language is refused');
const only = { ...manifest, lines: { 'b.correct.01@fr': manifest.lines['b.correct.01@fr'] } };
assert.equal(planLine({ ...base, manifest: only, lineId: 'b.correct.01', lang: 'en-CA' }).kind, 'captions', 'no English clip: never the French one');

// no computer voice without opt-in, however the line is missing
for (const lineId of [undefined, 'nope', 'b.correct.01']) {
  const m = lineId === 'b.correct.01' ? null : manifest;
  assert.equal(planLine({ ...base, manifest: m, lineId, lang: 'fr-CA' }).kind, 'captions', `captions only (${lineId})`);
}
assert.equal(planLine({ ...base, manifest: null, lineId: 'z', lang: 'fr-CA', prefs: { voice: true, computerVoice: true } }).kind, 'computer', 'opt-in allows it');
assert.equal(planLine({ ...base, manifest: null, lineId: 'z', lang: 'fr-CA', prefs: { voice: true, computerVoice: true }, ttsSupported: false }).kind, 'captions', 'opt-in but unsupported');
assert.equal(planLine({ ...base, prefs: { voice: false, computerVoice: true }, lineId: 'b.correct.01', lang: 'fr-CA' }).kind, 'captions', 'child voice off');
assert.equal(planLine({ ...base, soundOn: false, lineId: 'b.correct.01', lang: 'fr-CA' }).kind, 'captions', 'sound off');
// human clip beats computer voice
assert.equal(planLine({ ...base, prefs: { voice: true, computerVoice: true }, lineId: 'b.correct.01', lang: 'en-CA' }).kind, 'clip');

console.error = origErr;
console.warn = origWarn;
assert.equal(errors.length, 0, 'missing clip logs nothing');
console.log('voice play ok');
