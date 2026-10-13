import assert from 'node:assert/strict';
import { spokenText } from '../src/platform/speech/spoken.ts';
assert.equal(spokenText('Mira se demande : 65 + 39 = ?', 'fr-CA'), 'Mira se demande : 65 plus 39 égale combien');
assert.equal(spokenText('28 + 19 = ?', 'en-CA'), '28 plus 19 equals how many');
assert.equal(spokenText('7 × 8 = ?', 'fr-CA'), '7 fois 8 égale combien');
assert.equal(spokenText('24 ÷ 4 = ?', 'en-CA'), '24 divided by 4 equals how many');
assert.equal(spokenText('82 − 37 = ?', 'fr-CA'), '82 moins 37 égale combien');
assert.equal(spokenText('Combien en reste-t-il ?', 'fr-CA'), 'Combien en reste-t-il ?');
console.log('spoken ok');
