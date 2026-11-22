// One requestAnimationFrame loop for the whole stage: archetypes and fx register tick callbacks, the loop sleeps when none are left.
export type Tick = (dtMs: number, nowMs: number) => void;

type PerfWindow = Window & { __nxFrames?: number[] };

/** Frame sampling is only on with ?perf=1 or under Playwright (navigator.webdriver). */
function sampling(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.search.includes('perf=1') || navigator.webdriver === true;
}

class SceneClock {
  private ticks = new Set<Tick>();
  private raf = 0;
  private last = 0;
  private slowRun = 0;
  private startedAt = 0;
  private jankHandlers = new Set<() => void>();

  add(fn: Tick): () => void {
    this.ticks.add(fn);
    if (!this.raf && typeof window !== 'undefined') {
      this.last = 0;
      this.startedAt = performance.now();
      this.slowRun = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
    return () => {
      this.ticks.delete(fn);
      if (!this.ticks.size && this.raf) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
      }
    };
  }

  /** Called when 3 frames in a row take over 33 ms during the first second after the loop wakes. */
  onJank(fn: () => void): () => void {
    this.jankHandlers.add(fn);
    return () => {
      this.jankHandlers.delete(fn);
    };
  }

  get running() {
    return this.raf !== 0;
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (!this.ticks.size) return;
    const dt = this.last ? Math.min(now - this.last, 100) : 16.7;
    this.last = now;
    if (sampling()) {
      const w = window as PerfWindow;
      const buf = (w.__nxFrames ??= []);
      if (buf.length < 4000) buf.push(Math.round(dt * 10) / 10);
    }
    if (now - this.startedAt < 1000) {
      this.slowRun = dt > 33 ? this.slowRun + 1 : 0;
      if (this.slowRun >= 3) {
        this.slowRun = 0;
        this.jankHandlers.forEach((h) => h());
      }
    }
    for (const t of [...this.ticks]) t(dt, now);
    if (this.ticks.size) this.raf = requestAnimationFrame(this.frame);
  };
}

export const sceneClock = new SceneClock();

export type Tier = 'full' | 'lite';
/** Lite tier for low-end devices: 4 cores or fewer, or 2 GB or less. Jank can still downgrade at runtime. */
export function detectTier(): Tier {
  if (typeof navigator === 'undefined') return 'full';
  const n = navigator as Navigator & { deviceMemory?: number };
  if ((n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 2) return 'lite';
  return 'full';
}
