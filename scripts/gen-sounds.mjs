// Synthesizes the sim/gift sounds from scratch (no samples, public domain / CC0) and encodes them with ffmpeg.
// Usage: FFMPEG=/path/to/ffmpeg node scripts/gen-sounds.mjs   (ffmpeg on PATH by default)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 32000;
const out = fileURLToPath(new URL('../public/sounds', import.meta.url));
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const TAU = Math.PI * 2;
const lp = (a) => { let y = 0; return (x) => (y += a * (x - y)); }; // one-pole lowpass
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

function render(dur, fn) {
  const n = Math.floor(dur * SR);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = fn(i / SR, i);
  let peak = 0.001;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const fade = Math.floor(0.02 * SR);
  return buf.map((v, i) => (v / peak) * 0.8 * Math.min(1, (n - i) / fade));
}

const sounds = {
  // soft low rumble that slowly sinks, with sparse small crackles
  collapse() {
    const f = lp(0.04), c = lp(0.5);
    return render(1.2, (t) => {
      const body = f(rnd()) * 6 * env(t, 0.05, 0.5) + Math.sin(TAU * (60 - 18 * t) * t) * 0.5 * env(t, 0.05, 0.6);
      const crack = (Math.abs(rnd()) > 0.9985 ? c(rnd()) * 6 : c(0)) * env(t, 0.1, 0.5);
      return body + crack * 0.6;
    });
  },
  rumble() {
    const f = lp(0.03);
    return render(0.8, (t) => (f(rnd()) * 8 + Math.sin(TAU * 48 * t) * 0.6 * (1 + 0.3 * Math.sin(TAU * 7 * t))) * Math.min(1, t / 0.12) * Math.min(1, (0.8 - t) / 0.2));
  },
  splash() {
    const hp = lp(0.3);
    return render(0.5, (t) => {
      const n = rnd();
      return (n - hp(n)) * env(t, 0.01, 0.12) + Math.sin(TAU * (500 + 700 * Math.exp(-t * 14)) * t) * 0.35 * env(t, 0.005, 0.1);
    });
  },
  sparkle() {
    const notes = [0, 0.06, 0.13, 0.21, 0.3, 0.4].map((s, i) => [s, 1318.5 * 2 ** ([0, 2, 4, 7, 9, 12][i] / 12)]);
    return render(0.7, (t) => notes.reduce((s, [t0, f]) => (t < t0 ? s : s + Math.sin(TAU * f * (t - t0)) * 0.5 * Math.exp(-(t - t0) * 9) + Math.sin(TAU * f * 2 * (t - t0)) * 0.15 * Math.exp(-(t - t0) * 14)), 0));
  },
  whoosh() {
    const f = lp(0.1);
    return render(0.4, (t) => {
      const a = 0.05 + 0.4 * Math.sin((Math.PI * t) / 0.4) ** 2;
      const y = f(rnd());
      return (y + (rnd() - y) * a * 0.4) * Math.sin((Math.PI * t) / 0.4);
    });
  },
  // lid pop, then rising sparkle
  gift_open() {
    const pop = lp(0.35);
    const notes = [0.12, 0.2, 0.28, 0.37, 0.47].map((s, i) => [s, 1046.5 * 2 ** ([0, 4, 7, 12, 16][i] / 12)]);
    return render(0.9, (t) => {
      const p = (Math.sin(TAU * (220 * Math.exp(-t * 18) + 90) * t) * 0.9 + pop(rnd()) * 0.4) * Math.exp(-t / 0.05);
      return p + notes.reduce((s, [t0, f]) => (t < t0 ? s : s + Math.sin(TAU * f * (t - t0)) * 0.45 * Math.exp(-(t - t0) * 8)), 0);
    });
  },
};

const tmp = mkdtempSync(join(tmpdir(), 'nx-snd-'));
for (const [name, make] of Object.entries(sounds)) {
  const pcm = make();
  const wav = Buffer.alloc(44 + pcm.length * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.length * 2, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(SR, 24);
  wav.writeUInt32LE(SR * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length * 2, 40);
  pcm.forEach((v, i) => wav.writeInt16LE(Math.round(v * 32767), 44 + i * 2));
  const src = join(tmp, `${name}.wav`);
  writeFileSync(src, wav);
  for (const [ext, args] of [['webm', ['-c:a', 'libopus', '-b:a', '32k']], ['mp3', ['-c:a', 'libmp3lame', '-b:a', '64k']]]) {
    const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-ac', '1', ...args, join(out, `${name}.${ext}`)]);
    if (r.status !== 0) { console.error(`ffmpeg failed for ${name}.${ext}: ${r.stderr ?? r.error}`); process.exit(1); }
  }
  console.log(`${name}: ${(pcm.length / SR).toFixed(2)} s`);
}
rmSync(tmp, { recursive: true, force: true });
