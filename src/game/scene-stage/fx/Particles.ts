// Light canvas 2D layer for the reveal only: a story-shaped burst on a right answer, a few slow lights on a gentle miss.
// The layer sleeps (no frame loop) when no particle is alive. DPR is capped at 2 (1 on small screens). At most 150 particles.
// Nothing flashes: every particle fades in and out along a sine of 1 s or more.
export type FxShape = 'spark' | 'paper' | 'bubble' | 'star';
export type FxStyle = { shape: FxShape; hues: readonly number[] };
type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; hue: number; shape: FxShape; rot: number; vr: number; kind: 'burst' | 'fly' };

export const MAX_PARTICLES = 150;

/** The canvas light layer: a burst and fireflies, capped at MAX_PARTICLES, asleep when empty. */
export class Particles {
  private ps: P[] = [];
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private seed = 7;
  constructor(private canvas: HTMLCanvasElement, private style: FxStyle) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }
  /** Small deterministic generator so review frames are repeatable. */
  private rnd() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1 : 2);
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  get alive() {
    return this.ps.length > 0;
  }
  private add(p: P) {
    if (this.ps.length < MAX_PARTICLES) this.ps.push(p);
  }
  /** Story-shaped particles rising from a point given as fractions of the stage (right answer). */
  burst(cx: number, cy: number, n = 22) {
    const hues = this.style.hues;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (this.rnd() - 0.5) * 2.6;
      const s = 50 + this.rnd() * 110;
      this.add({ x: cx * this.w, y: cy * this.h, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 1.6 + this.rnd() * 0.9, r: 2.2 + this.rnd() * 2.6, hue: hues[i % hues.length]!, shape: this.style.shape, rot: this.rnd() * 6.28, vr: (this.rnd() - 0.5) * 3, kind: 'burst' });
    }
  }
  /** A few slow lights drifting up (gentle miss): calm, no sparkle. */
  fireflies(cx: number, cy: number, n = 8) {
    for (let i = 0; i < n; i++) this.add({ x: cx * this.w + (this.rnd() - 0.5) * 90, y: cy * this.h, vx: (this.rnd() - 0.5) * 10, vy: -9 - this.rnd() * 10, life: 0, max: 2.8 + this.rnd(), r: 2.4 + this.rnd() * 1.6, hue: 190, shape: 'spark', rot: 0, vr: 0, kind: 'fly' });
  }
  get count() {
    return this.ps.length;
  }
  /** Advance and draw. Returns false when nothing is left, so the caller can stop the frame loop. */
  tick(dtMs: number): boolean {
    const dt = dtMs / 1000;
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    const next: P[] = [];
    for (const p of this.ps) {
      p.life += dt;
      if (p.life >= p.max) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.kind === 'burst') {
        p.vy += 70 * dt; // soft gravity: they arc back down
        p.vx *= 1 - 0.8 * dt;
      }
      const a = Math.sin(Math.PI * (p.life / p.max)); // sine in, sine out: nothing pops
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.globalAlpha = a;
      c.fillStyle = `hsl(${p.hue} 95% 68%)`;
      c.strokeStyle = `hsl(${p.hue} 95% 85%)`;
      if (p.shape === 'paper') c.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      else if (p.shape === 'bubble') {
        c.lineWidth = 1.2;
        c.beginPath();
        c.arc(0, 0, p.r * 1.4, 0, 6.2832);
        c.stroke();
      } else if (p.shape === 'star') {
        c.beginPath();
        for (let k = 0; k < 8; k++) c.lineTo(Math.cos((k * Math.PI) / 4) * (k % 2 ? p.r * 0.5 : p.r * 1.6), Math.sin((k * Math.PI) / 4) * (k % 2 ? p.r * 0.5 : p.r * 1.6));
        c.closePath();
        c.fill();
      } else {
        c.beginPath();
        c.arc(0, 0, p.r, 0, 6.2832);
        c.fill();
      }
      c.restore();
      next.push(p);
    }
    this.ps = next;
    if (!next.length) c.clearRect(0, 0, this.w, this.h);
    return next.length > 0;
  }
  clear() {
    this.ps = [];
    this.ctx.clearRect(0, 0, this.w, this.h);
  }
}
