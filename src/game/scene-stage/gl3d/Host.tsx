'use client';
// The 3D scene host: one archetype module for every espace.* 3D archetype. Draws the 2.5D archetype of the same setting when WebGL is missing, the device
// is weak, the shape has no 3D picture, or anything throws. three.js is a lazy chunk (./mount): nothing loads unless a 3D scene is drawn.
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useReducedMotion } from '@/platform/motion';
import { detectTier } from '../clock';
import { loadArchetype, type ArchetypeProps } from '../registry';
import { SceneErrorBoundary } from '../SceneErrorBoundary';
import type { Handle } from './mount-core';
import { bayPlan, fallbackOf } from './plan';

const fallbacks = new Map<string, ComponentType<ArchetypeProps>>();
const fallbackFor = (id: string) => {
  let c = fallbacks.get(id);
  if (!c) fallbacks.set(id, (c = lazy(() => loadArchetype(id))));
  return c;
};

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

function Canvas3D({ scene, plan, phase, onWeak }: ArchetypeProps & { plan: NonNullable<ReturnType<typeof bayPlan>>; onWeak: () => void }) {
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<Handle | null>(null);
  const latest = useRef({ scene, plan, phase });
  useEffect(() => {
    latest.current = { scene, plan, phase };
    handle.current?.show(scene, plan, phase);
  }, [scene, plan, phase]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let dead = false;
    let h: Handle | null = null;
    let io: IntersectionObserver | null = null;
    import('./mount-espace')
      .then((m) => {
        if (dead) return;
        h = m.mountScene(el, { reduced, variant: [...plan.kind].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 3, theme: 'space', light: scene.spec.light.key, camera: scene.spec.camera, onWeak });
        handle.current = h;
        h.show(latest.current.scene, latest.current.plan, latest.current.phase);
        io = new IntersectionObserver(([e]) => h?.setVisible(Boolean(e?.isIntersecting)), { threshold: 0.05 });
        io.observe(el);
      })
      .catch(onWeak);
    return () => {
      dead = true;
      io?.disconnect();
      h?.dispose();
      handle.current = null;
    };
    // the engine lives as long as the canvas: scene and plan changes go through `show`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);
  return (
    <>
      <canvas ref={canvas} aria-hidden data-bay={plan.kind} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      {/* a soft vignette keeps the eye on the middle of the room */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 70px rgba(30,15,40,0.28)' }} />
    </>
  );
}

export default function Gl3dHost(props: ArchetypeProps) {
  const { scene } = props;
  const plan = useMemo(() => bayPlan(scene, props.locale), [scene, props.locale]);
  const [ok, setOk] = useState<boolean | null>(null); // null on the server and at first paint: nothing drawn, no flash of the wrong picture
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOk(plan !== null && detectTier() === 'full' && hasWebGL());
  }, [plan === null]); // eslint-disable-line react-hooks/exhaustive-deps
  const Fallback = fallbackFor(scene.spec.fb ?? fallbackOf(scene));
  // eslint-disable-next-line react-hooks/static-components
  const flat = <Fallback {...props} />;
  if (ok === null) return null;
  if (!ok || !plan) return <Suspense fallback={null}>{flat}</Suspense>;
  return (
    <div className="nx-gl3d-root" data-gl3d="on" style={{ position: 'absolute', inset: 0 }}>
      <SceneErrorBoundary fallback={<Suspense fallback={null}>{flat}</Suspense>}>
        <Canvas3D {...props} plan={plan} onWeak={() => setOk(false)} />
      </SceneErrorBoundary>
    </div>
  );
}
