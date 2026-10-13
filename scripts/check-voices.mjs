import assert from 'node:assert/strict';
import { pickVoice } from '../src/platform/speech/voices.ts';

const v = (name, lang, localService) => ({ name, lang, localService });
const list = [
  v('Thomas', 'fr-FR', true),
  v('Microsoft Sylvie Online (Natural) - French (Canada)', 'fr-CA', false),
  v('Samantha', 'en-US', true),
  v('Amelie', 'fr-CA', true),
];
assert.equal(pickVoice(list, 'fr-CA').name, list[1].name, 'natural fr-CA beats local fr-FR');
assert.equal(pickVoice(list.filter((x) => x !== list[1]), 'fr-CA').name, 'Amelie', 'exact locale beats fr-FR local');
assert.equal(pickVoice([list[0], list[2]], 'fr-CA').name, 'Thomas', 'falls back to any fr');
assert.equal(pickVoice([list[2]], 'fr-CA'), null, 'null when no fr');
assert.equal(pickVoice([], 'en-CA'), null, 'null when empty');
assert.equal(pickVoice(list, 'fr-CA', 'Thomas').name, 'Thomas', 'preferred name wins');
assert.equal(pickVoice(list, 'en-CA', 'Thomas').name, 'Samantha', 'preferred of wrong language ignored');
assert.equal(pickVoice([v('x', 'fr_CA', false)], 'fr-CA').name, 'x', 'underscore locale');
const mix = [v('Microsoft Paul Online (Natural)', 'fr-CA', false), v('Microsoft Sylvie Online (Natural)', 'fr-CA', false)];
assert.equal(pickVoice(mix, 'fr-CA').name, mix[1].name, 'female natural beats male natural');
const fem = [v('Henri', 'fr-CA', true), v('Julie', 'fr-FR', true)];
assert.equal(pickVoice(fem, 'fr-CA').name, 'Julie', 'female fr-FR beats male fr-CA');
assert.equal(pickVoice([v('Guy', 'en-CA', true), v('Zira', 'en-US', false)], 'en-CA').name, 'Zira', 'female beats male');
assert.equal(pickVoice([v('Daniel', 'en-GB', true)], 'en-CA').name, 'Daniel', 'male still better than none');
console.log('Voice check passed');
// A woman voice in the right language beats a man voice, whatever the quality flags
const en = [v('Microsoft Guy Online (Natural)', 'en-US', false), v('Karen', 'en-AU', true), v('Microsoft Sonia Online (Natural)', 'en-GB', false)];
assert.equal(pickVoice(en, 'en-CA').name, 'Microsoft Sonia Online (Natural)', 'english woman voice for english');
assert.equal(pickVoice([...en, ...list], 'fr-CA').name, list[1].name, 'french woman voice for french, never an english one');
console.log('voices ok');
