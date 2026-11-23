'use client';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useReducedMotion } from '@/platform/motion';
import { resolveScene } from './bind';
import { describeScene } from './describe';
import { detectTier, sceneClock, type Tier } from './clock';
import { Particles } from './fx/Particles';
import { ARCHETYPE_META, loadArchetype, type ArchetypeProps, type StagePhase } from './registry';
import { SceneErrorBoundary } from './SceneErrorBoundary';
import type { SceneSource, SceneSpec } from './spec';
import './rig.css';
import './kit/moves.css';

export type SceneStageProps = {
  spec: SceneSpec;
  source: SceneSource;
  /** question: entrance then idle. ok / ko: the reveal, using `source.correctAnswer` for reveal-only values. */
  phase?: StagePhase;
  /** Calm picture shown when the scene cannot load or bind (QuestionVisual or ScenePicture). */
  fallback?: ReactNode;
  /** Force a tier (stories, evidence runs). Normally detected. */
  tier?: Tier;
  className?: string;
};

const lazies = new Map<string, ReturnType<typeof lazy<ComponentType<ArchetypeProps>>>>();
/** One lazy component per archetype id, created once at module level (never during render). */
function lazyArchetype(id: string) {
  let c = lazies.get(id);
  if (!c) {
    c = lazy(() => loadArchetype(id));
    lazies.set(id, c);
  }
  return c;
}

function StageInner({ spec, source, phase = 'question', tier: forced, className }: SceneStageProps) {
  const t = useTranslations('game.sceneStage');
  const locale = useLocale().startsWith('fr') ? 'fr' : 'en';
  const reduced = useReducedMotion();
  const [tier, setTier] = useState<Tier>(forced ?? 'full');
  const [run, setRun] = useState(0);
  const [visible, setVisible] = useState(true);
  const [startPhase] = useState(phase);
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fx = useRef<Particles | null>(null);
  const stopFx = useRef<(() => void) | null>(null);
  const meta = ARCHETYPE_META[spec.archetype];

  useEffect(() => {
    // the tier is only known on the client; the first paint is the full one
    /* eslint-disable react-hooks/set-state-in-effect */
    if (forced) return setTier(forced);
    setTier(detectTier());
    /* eslint-enable react-hooks/set-state-in-effect */
    return sceneClock.onJank(() => setTier('lite'));
  }, [forced]);

  const scene = useMemo(() => resolveScene(spec, source, { reveal: phase !== 'question' }), [spec, source, phase]);
  const label = describeScene(scene, locale);
  const Archetype = lazyArchetype(spec.archetype);

  // Out of view: pause CSS animations and the canvas
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Particles exist only for the reveal: a story-shaped burst (right) or slow lights (gentle miss). The frame loop sleeps when none are alive.
  const live = tier === 'full' && !reduced;
  useEffect(() => {
    const c = canvas.current;
    if (!c || !live || !meta) return;
    const p = new Particles(c, meta.fx);
    fx.current = p;
    const ro = new ResizeObserver(() => p.resize());
    ro.observe(c);
    return () => {
      ro.disconnect();
      stopFx.current?.();
      stopFx.current = null;
      fx.current = null;
    };
  }, [live, meta, run]);
  useEffect(() => {
    const p = fx.current;
    if (!p || !meta || !visible || phase === 'question') return;
    const wait = meta.burstDelay(scene, phase) + (run > 0 || startPhase !== 'question' ? 1500 : 0);
    const id = window.setTimeout(() => {
      if (phase === 'ok') p.burst(meta.burst.x, meta.burst.y);
      else p.fireflies(meta.burst.x, meta.burst.y);
      stopFx.current?.();
      stopFx.current = sceneClock.add((dt) => {
        if (!p.tick(dt)) {
          stopFx.current?.();
          stopFx.current = null;
        }
      });
    }, wait);
    return () => window.clearTimeout(id);
  }, [phase, meta, run, live, scene, startPhase, visible]);

  // Pointer parallax on devices with a fine pointer: lanes slide by their own factor, the subject lane stays put. Compositor only.
  useEffect(() => {
    const el = root.current;
    if (!el || !live || !window.matchMedia('(pointer: fine)').matches) return;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let off: (() => void) | null = null;
    const step = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty('--px', cx.toFixed(3));
      el.style.setProperty('--py', cy.toFixed(3));
      if (Math.abs(tx - cx) + Math.abs(ty - cy) < 0.002 && off) {
        off();
        off = null;
      }
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!off) off = sceneClock.add(step);
    };
    const leave = () => {
      tx = 0;
      ty = 0;
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      off?.();
    };
  }, [live]);

  const replay = useCallback(() => setRun((n) => n + 1), []);
  const style = {
    '--nx-sky': meta?.sky,
    '--hook-at': `${spec.hook.at_ms}ms`,
    // a reveal that starts on a fresh mount (replay, or a stage born in the outcome) waits for the entrance to finish
    '--rv-base': run > 0 || startPhase !== 'question' ? '1.5s' : '0s',
  } as CSSProperties;

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={root}
        role="img"
        aria-label={label}
        className="nx-stage"
        style={style}
        data-scene={spec.archetype}
        data-phase={phase}
        data-tier={tier}
        data-camera={spec.camera.preset}
        data-drift={spec.camera.drift}
        data-light={spec.light.key}
        data-visible={visible}
        data-reduced={reduced}
        data-hook={spec.hook.kind}
        data-ok={spec.reveal.ok}
        data-ko={spec.reveal.ko}
      >
        <div className="nx-persp">
          <div className="nx-cam-in" key={run}>
            <div className="nx-cam-drift">
              <div className="nx-world">
                <Suspense fallback={null}>
                  {/* cached at module level: the same component on every render */}
                  {/* eslint-disable-next-line react-hooks/static-components */}
                  <Archetype scene={scene} phase={phase} locale={locale} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
        <div aria-hidden className="nx-light" />
        {spec.hook.kind === 'light-sweep' && !reduced && <div aria-hidden key={`sw${run}`} className="nx-sweep" />}
        {live && <canvas ref={canvas} aria-hidden className="nx-fx" />}
      </div>
      {scene.shown && (
        <b aria-hidden className="nx-ans" data-ans={scene.shown.startsWith('@') ? scene.shown.slice(1) : 'value'}>
          {scene.shown === '@true' ? <><svg viewBox="0 0 10 10" width="1em" height="1em" aria-hidden="true" style={{ verticalAlign: '-0.12em' }}><path d="M1.5 5.5l2.5 2.5 4.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg> {locale === 'fr' ? 'Vrai' : 'True'}</> : scene.shown === '@false' ? <><svg viewBox="0 0 10 10" width="1em" height="1em" aria-hidden="true" style={{ verticalAlign: '-0.12em' }}><path d="M2 2l6 6M8 2l-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg> {locale === 'fr' ? 'Faux' : 'False'}</> : <><svg viewBox="0 0 10 10" width="1em" height="1em" aria-hidden="true" style={{ verticalAlign: '-0.12em' }}><path d="M1.5 5.5l2.5 2.5 4.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg> {scene.shown}</>}
        </b>
      )}
      {!reduced && (
        <button type="button" className="nx-replay" onClick={replay} aria-label={t('replay')} title={t('replay')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** Per-question illustrated 3D scene. Falls back to `fallback` when anything fails, never to an empty box. */
export function SceneStage(props: SceneStageProps) {
  return (
    <SceneErrorBoundary fallback={props.fallback ?? null}>
      <StageInner {...props} />
    </SceneErrorBoundary>
  );
}
