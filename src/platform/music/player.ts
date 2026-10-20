/** Slow background loops through Web Audio: gapless, fades, ducking. Files load only once playback is wanted. */
export type MusicFile = { id: string; file: string };

const FADE = 1.5; // seconds
const DUCK = 0.3; // fraction of the volume left under a voice
const CROSS = 4; // seconds of cross-fade between tracks
const LOOPS = 2; // loops of one track before the next one

/** One looping track at a time, rotating through the list with cross-fades; owns its own AudioContext. */
export class MusicPlayer {
  private tracks: MusicFile[];
  private base: string;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private idx = 0;
  private current: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private want = false;
  private volume = 0.35;
  private ducked = false;
  private next: ReturnType<typeof setTimeout> | undefined;
  private off: ReturnType<typeof setTimeout> | undefined;
  private failed = false;

  constructor(tracks: MusicFile[], base: string) {
    this.tracks = tracks;
    this.base = base;
  }

  /** True while a loop is wanted and running; for tests. */
  get playing() {
    return this.want && this.current !== null;
  }

  /** Call whenever the wanted state, volume or ducking changes. Safe to call often. */
  sync(want: boolean, volume: number, ducked: boolean) {
    this.volume = volume;
    this.ducked = ducked;
    if (want === this.want) return this.level();
    this.want = want;
    if (want) void this.start();
    else this.stop();
  }

  private level() {
    const m = this.master;
    if (m && this.ctx) m.gain.setTargetAtTime(this.want ? this.volume * (this.ducked ? DUCK : 1) : 0, this.ctx.currentTime, FADE / 3);
  }

  private async start() {
    clearTimeout(this.off);
    if (this.failed || typeof window === 'undefined') return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor || document.createElement('audio').canPlayType('audio/webm; codecs="opus"') === '') return;
    if (!this.ctx) {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (!this.current) await this.playTrack();
    this.level();
  }

  private async load(t: MusicFile): Promise<AudioBuffer | null> {
    const hit = this.buffers.get(t.id);
    if (hit || !this.ctx) return hit ?? null;
    try {
      const res = await fetch(this.base + t.file);
      if (!res.ok) throw new Error(String(res.status));
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      this.buffers.set(t.id, buf);
      return buf;
    } catch {
      this.failed = true; // music is a nicety: stay silent, never nag
      return null;
    }
  }

  private async playTrack() {
    const buf = await this.load(this.tracks[this.idx % this.tracks.length]);
    if (!buf || !this.want || !this.ctx || !this.master || this.current) return;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    src.loop = true;
    gain.gain.value = 0;
    src.connect(gain).connect(this.master);
    src.start();
    gain.gain.setTargetAtTime(1, this.ctx.currentTime, CROSS / 3);
    this.current = { src, gain };
    this.next = setTimeout(() => void this.rotate(), buf.duration * LOOPS * 1000);
  }

  private async rotate() {
    const out = this.current;
    if (!this.want || !this.ctx || !out) return;
    this.idx = (this.idx + 1) % this.tracks.length;
    const buf = await this.load(this.tracks[this.idx]);
    if (!buf || !this.want || !this.ctx) return;
    out.gain.gain.setTargetAtTime(0, this.ctx.currentTime, CROSS / 3);
    setTimeout(() => out.src.stop(), CROSS * 1000);
    this.current = null;
    await this.playTrack();
  }

  private stop() {
    clearTimeout(this.next);
    this.level();
    // after the fade, free the audio hardware; hidden tabs and "off" both end here
    this.off = setTimeout(() => {
      if (!this.want && this.ctx) void this.ctx.suspend();
    }, FADE * 1000);
  }
}
