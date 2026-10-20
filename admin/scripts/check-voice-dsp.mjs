import assert from 'node:assert/strict';
import { trimSilence, normalise, encodeWav, peakDb, rmsDb } from '../src/lib/voiceDsp.ts';

const rate = 48000;
const tone = (s, amp) => Float32Array.from({ length: Math.round(rate * s) }, (_, i) => amp * Math.sin((2 * Math.PI * 220 * i) / rate));
const cat = (...p) => Float32Array.from(p.flatMap((a) => [...a]));
const clip = cat(new Float32Array(rate), tone(0.5, 0.05), new Float32Array(rate));
const t = trimSilence(clip, rate);
assert.ok(t.length < rate * 0.7 && t.length > rate * 0.5, 'silence cut, voice and padding kept');
assert.equal(trimSilence(new Float32Array(rate), rate).length, 0, 'all silence gives empty');
const n = normalise(t);
assert.ok(Math.abs(rmsDb(n) - -20) < 0.6, 'rms at target');
assert.ok(peakDb(normalise(cat(tone(0.2, 0.01), Float32Array.of(0.9)))) <= -0.99, 'peak never above ceiling');
const w = encodeWav(n, rate);
assert.equal(String.fromCharCode(...w.slice(0, 4)), 'RIFF');
assert.equal(w.length, 44 + n.length * 2);
console.log('voice dsp ok');
