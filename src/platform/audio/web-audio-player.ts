import type { AudioPlayer, SoundName } from './types';
import { pickVariant } from './pick';
import { SOUND_FILES, SOUND_VOLUME } from './sound-map';

/** Web Audio implementation. Loads lazily, never throws; reports a failure once through onError. */
export class WebAudioPlayer implements AudioPlayer {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private last = new Map<SoundName, number>();
  private enabled: boolean;
  private reported = false;
  private lastChime = -1;

  /** Set by the provider; called once if a sound cannot load. */
  private onError?: (message: string) => void;

  setOnError(fn?: (message: string) => void) {
    this.onError = fn;
  }

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  unlock() {
    if (typeof window === 'undefined') return;
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx ??= new Ctor();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private fail(message: string) {
    if (this.reported) return;
    this.reported = true;
    this.onError?.(message);
  }

  private load(name: SoundName, base: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(base);
    if (cached) return Promise.resolve(cached);
    let p = this.loading.get(base);
    if (!p) {
      p = (async () => {
        if (!this.ctx) return null;
        const canWebm = document.createElement('audio').canPlayType('audio/webm; codecs="opus"') !== '';
        const url = `${base}.${canWebm ? 'webm' : 'mp3'}`;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
          this.buffers.set(base, buf);
          return buf;
        } catch {
          this.fail(`Sound ${name} could not be loaded`);
          return null;
        }
      })();
      this.loading.set(base, p);
    }
    return p;
  }

  /** Soft two-tone chime for tab changes: sine waves, fast fade in, gentle fade out, no hard click. */
  private chime() {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastChime < 0.09) return; // quick repeated taps must not stack into a buzz
    this.lastChime = now;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(SOUND_VOLUME.nav, now + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    out.connect(lp).connect(ctx.destination);
    for (const [freq, level] of [[659.25, 1], [987.77, 0.35]] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.94, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.07);
      g.gain.value = level;
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  }

  play(name: SoundName) {
    if (!this.enabled || typeof window === 'undefined') return;
    this.unlock();
    if (!this.ctx) return;
    if (name === 'nav') {
      this.chime();
      return;
    }
    const list = SOUND_FILES[name];
    const idx = pickVariant(list, this.last.get(name));
    this.last.set(name, idx);
    void this.load(name, list[idx]).then((buf) => {
      if (!buf || !this.ctx || !this.enabled) return;
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.value = SOUND_VOLUME[name];
      src.buffer = buf;
      src.connect(gain).connect(this.ctx.destination);
      src.start();
    });
  }
}

/** Records calls instead of playing. Used by Storybook and tests. */
export class NullAudioPlayer implements AudioPlayer {
  played: SoundName[] = [];
  private enabled = true;
  play(name: SoundName) {
    this.played.push(name);
  }
  setEnabled(e: boolean) {
    this.enabled = e;
  }
  isEnabled() {
    return this.enabled;
  }
  unlock() {}
}
