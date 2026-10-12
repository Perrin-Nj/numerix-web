import type { AudioPlayer, SoundName } from './types';
import { SOUND_FILES, SOUND_VOLUME } from './sound-map';

/** Web Audio implementation. Loads lazily, never throws; reports a failure once through onError. */
export class WebAudioPlayer implements AudioPlayer {
  private ctx: AudioContext | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private loading = new Map<SoundName, Promise<AudioBuffer | null>>();
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

  private load(name: SoundName): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(name);
    if (cached) return Promise.resolve(cached);
    let p = this.loading.get(name);
    if (!p) {
      p = (async () => {
        if (!this.ctx) return null;
        const canWebm = document.createElement('audio').canPlayType('audio/webm; codecs="opus"') !== '';
        const url = `${SOUND_FILES[name]}.${canWebm ? 'webm' : 'mp3'}`;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
          this.buffers.set(name, buf);
          return buf;
        } catch {
          this.fail(`Sound ${name} could not be loaded`);
          return null;
        }
      })();
      this.loading.set(name, p);
    }
    return p;
  }

  play(name: SoundName) {
    if (!this.enabled || typeof window === 'undefined') return;
    this.unlock();
    if (!this.ctx) return;
    void this.load(name).then((buf) => {
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
