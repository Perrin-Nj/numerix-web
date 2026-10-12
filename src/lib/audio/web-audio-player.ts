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

  play(name: SoundName) {
    if (!this.enabled || typeof window === 'undefined') return;
    this.unlock();
    if (!this.ctx) return;
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
