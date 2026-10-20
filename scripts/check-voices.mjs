import assert from 'node:assert/strict';
import { pickVoice } from '../src/platform/speech/voices.ts';

const v = (name, lang, localService = true) => ({ name, lang, localService });
const list = [v('Thomas', 'fr-FR'), v('Microsoft Sylvie Online (Natural) - French (Canada)', 'fr-CA', false), v('Samantha', 'en-US'), v('Amelie', 'fr-CA'), v('Clara', 'en-CA')];

assert.equal(pickVoice(list, 'fr-CA').name, list[1].name, 'natural fr-CA wins');
assert.equal(pickVoice(list.filter((x) => x !== list[1]), 'fr-CA').name, 'Amelie', 'next fr-CA');
assert.equal(pickVoice([list[0], list[2]], 'fr-CA'), null, 'fr-FR and en-US are never used for fr-CA');
assert.equal(pickVoice([list[0]], 'fr'), null, 'bare fr means fr-CA');
assert.equal(pickVoice([list[2]], 'en-CA'), null, 'en-US is not en-CA');
assert.equal(pickVoice(list, 'en-CA').name, 'Clara', 'en-CA voice for English');
assert.equal(pickVoice(list, 'fr-CA', 'Thomas').name, 'Thomas', 'parent picked a fr-FR voice by name');
assert.equal(pickVoice(list, 'en-CA', 'Thomas').name, 'Clara', 'preferred voice of the wrong language is ignored');
assert.equal(pickVoice([v('x', 'fr_CA')], 'fr-CA').name, 'x', 'underscore locale');
assert.equal(pickVoice([], 'en-CA'), null, 'empty');
const mix = [v('Microsoft Paul Online (Natural)', 'fr-CA', false), v('Microsoft Sylvie Online (Natural)', 'fr-CA', false)];
assert.equal(pickVoice(mix, 'fr-CA').name, mix[1].name, 'female beats male');
// UI language -> voice language, both ways, whatever order the device lists voices in
for (const [ui, want] of [['fr-CA', 'fr'], ['en-CA', 'en'], ['fr', 'fr'], ['en', 'en']]) {
  for (const l of [list, [...list].reverse()]) assert.equal(pickVoice(l, ui).lang.slice(0, 2), want, `${ui} gets a ${want} voice`);
}
console.log('voices ok');
