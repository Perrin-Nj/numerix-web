// Shared by the per-world mounts: the engine plus the world's own scene builders. Each world is its own lazy chunk, so a space child never downloads the clinic.
import type { ResolvedScene } from '../spec';
import { mountEngine, type Ctx, type Opts } from './engine';
import type { BayPlan } from './plan';

export type Handle = { show(scene: ResolvedScene, plan: BayPlan, phase: 'question' | 'ok' | 'ko'): void; setVisible(v: boolean): void; dispose(): void };
export function mountWith(build: (c: Ctx, p: BayPlan) => void) {
  return (canvas: HTMLCanvasElement, o: Opts): Handle => {
    const e = mountEngine(canvas, o);
    return {
      show: (scene, plan, phase) => e.setContent((c) => build(c, plan), scene.revealed, phase === 'ok'),
      setVisible: (v) => e.setVisible(v),
      dispose: () => e.dispose(),
    };
  };
}
