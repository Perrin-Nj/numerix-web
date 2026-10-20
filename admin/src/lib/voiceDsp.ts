/** Pure audio helpers for the voice recorder (no DOM): trim silence, normalise loudness, encode WAV. */

const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-9));

/** Cuts leading and trailing silence (RMS under thresholdDb per 10 ms window), keeps padMs of air on each side. */
export function trimSilence(x: Float32Array, rate: number, thresholdDb = -45, padMs = 60): Float32Array {
  const win = Math.max(1, Math.round(rate * 0.01));
  const loud = (i: number) => {
    let s = 0;
    const end = Math.min(x.length, i + win);
    for (let k = i; k < end; k++) s += x[k] * x[k];
    return db(Math.sqrt(s / (end - i))) > thresholdDb;
  };
  let a = 0;
  while (a < x.length && !loud(a)) a += win;
  if (a >= x.length) return new Float32Array(0); // all silence
  let b = x.length - win;
  while (b > a && !loud(b)) b -= win;
  const pad = Math.round((rate * padMs) / 1000);
  return x.slice(Math.max(0, a - pad), Math.min(x.length, b + win + pad));
}

export const peakDb = (x: Float32Array) => db(x.reduce((m, v) => Math.max(m, Math.abs(v)), 0));
export const rmsDb = (x: Float32Array) => db(Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length)));

/**
 * Gain so the RMS reaches targetDb (default -20 dBFS, close to -18 LUFS speech), then capped so the peak stays
 * under ceilDb (-1 dBFS). shortcut: plain RMS, not K-weighted LUFS; upgrade if clips need broadcast matching.
 */
export function normalise(x: Float32Array, targetDb = -20, ceilDb = -1): Float32Array {
  if (x.length === 0) return x;
  const want = targetDb - rmsDb(x);
  const room = ceilDb - peakDb(x);
  const g = 10 ** (Math.min(want, room) / 20);
  return x.map((v) => v * g);
}

/** 16-bit mono PCM WAV. */
export function encodeWav(x: Float32Array, rate: number): Uint8Array {
  const out = new DataView(new ArrayBuffer(44 + x.length * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  out.setUint32(4, 36 + x.length * 2, true);
  str(8, 'WAVEfmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, rate, true);
  out.setUint32(28, rate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  str(36, 'data');
  out.setUint32(40, x.length * 2, true);
  x.forEach((v, i) => out.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, v)) * 32767), true));
  return new Uint8Array(out.buffer);
}

export const toBase64 = (u: Uint8Array) => {
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Export format written by the recorder and read by frontend scripts/import-voice-export.mjs. */
export type VoiceExport = {
  schema: 1;
  exported_at: string;
  clips: {
    line_id: string;
    lang: 'fr-CA' | 'en-CA';
    text: string;
    speaker: string;
    consent: { talent_name: string; consented: true; release_text: string; consented_at: string };
    audio: { mime: 'audio/wav'; rate: number; duration_s: number; base64: string };
  }[];
};
