// Music policy: credits for every track, size limits, and the player's behaviour with a fake Web Audio:
// off means no audio request and nothing playing, hidden tab pauses, ducking lowers the level.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { shouldPlay } from '../src/platform/music/policy.ts';
import { MusicPlayer } from '../src/platform/music/player.ts';

// ---- policy
const on = { music: true, locked: false, soundOn: true, unlocked: true, visible: true, saveData: false };
assert.equal(shouldPlay(on), true);
for (const k of ['music', 'soundOn', 'unlocked', 'visible']) assert.equal(shouldPlay({ ...on, [k]: false }), false, `${k} off`);
for (const k of ['locked', 'saveData']) assert.equal(shouldPlay({ ...on, [k]: true }), false, `${k} on`);

// ---- credits and sizes
const dir = fileURLToPath(new URL('../public/music/', import.meta.url));
const credits = JSON.parse(readFileSync(dir + 'credits.json', 'utf8'));
const files = readdirSync(dir).filter((f) => f.endsWith('.webm'));
assert.ok(credits.length >= 5 && credits.length <= 8, '5 to 8 tracks');
assert.deepEqual(credits.map((c) => c.file).sort(), files.sort(), 'every file has a credit and every credit a file');
let total = 0;
for (const c of credits) {
  for (const k of ['title', 'artist', 'licence', 'licence_url', 'source_url']) assert.ok(c[k], `${c.id} needs ${k}`);
  assert.match(c.licence, /^(CC0|CC BY )/, `${c.id} licence`);
  assert.match(c.source_url, /^https:\/\//);
  const size = statSync(dir + c.file).size;
  assert.ok(size <= 600 * 1024, `${c.id} over 600 KB`);
  total += size;
}
assert.ok(total <= 4 * 1024 * 1024, 'music folder over 4 MB');

// ---- player with fake Web Audio
let requests = 0;
let created = 0;
const log = { suspended: 0, resumed: 0, started: 0, level: null };
class Param {
  setTargetAtTime(v) {
    this.v = v;
    log.level = v;
  }
}
const node = () => ({ gain: new Param(), connect: () => node(), buffer: null, loop: false, start: () => log.started++, stop() {} });
class Ctx {
  state = 'running';
  currentTime = 0;
  destination = {};
  constructor() {
    created++;
  }
  createGain() {
    const n = node();
    n.connect = () => n;
    return n;
  }
  createBufferSource() {
    const n = node();
    n.connect = (x) => x;
    return n;
  }
  decodeAudioData() {
    return Promise.resolve({ duration: 68 });
  }
  suspend() {
    log.suspended++;
    this.state = 'suspended';
    return Promise.resolve();
  }
  resume() {
    log.resumed++;
    this.state = 'running';
    return Promise.resolve();
  }
}
globalThis.window = { AudioContext: Ctx };
globalThis.document = { createElement: () => ({ canPlayType: () => 'probably' }) };
globalThis.fetch = async () => {
  requests++;
  return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
};
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

const p = new MusicPlayer(credits, '/music/');
p.sync(false, 0.35, false);
p.sync(false, 0.35, false);
await tick();
assert.equal(requests, 0, 'off: no audio request');
assert.equal(created, 0, 'off: no audio context');
assert.equal(p.playing, false);

p.sync(true, 0.35, false);
await tick();
assert.equal(requests, 1, 'on: one request, lazily');
assert.equal(p.playing, true);
assert.equal(log.started, 1);

p.sync(true, 0.35, true);
assert.ok(Math.abs(log.level - 0.35 * 0.3) < 1e-9, 'ducked under a voice clip');
p.sync(true, 0.35, false);
assert.equal(log.level, 0.35, 'back to full level after the voice');

p.sync(false, 0.35, false); // tab hidden or switch off
assert.equal(log.level, 0, 'fades to silence');
await tick(1700);
assert.equal(log.suspended, 1, 'audio paused after the fade');
assert.equal(p.playing, false);

p.sync(true, 0.35, false); // tab visible again
await tick();
assert.equal(log.resumed >= 1, true, 'resumed');
assert.equal(requests, 1, 'no second download');
p.sync(false, 0, false);
console.log('Music check passed');
