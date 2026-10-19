'use client';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from './index';

/**
 * Moves the element's `--px` / `--py` CSS variables (pixels, clamped to +/- max) with page scroll, pointer position
 * and, where the device allows without a permission prompt, tilt. Apply with `transform: translate3d(var(--px),var(--py),0)`.
 * Does nothing under reduced motion. Only writes two custom properties, inside requestAnimationFrame.
 */
export function useParallax<T extends HTMLElement>(max = 24) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.style.setProperty('--px', '0px');
      el.style.setProperty('--py', '0px');
      return;
    }
    let raf = 0;
    let sy = 0;
    let tx = 0;
    let ty = 0;
    const clamp = (n: number) => Math.max(-max, Math.min(max, n));
    const paint = () => {
      raf = 0;
      el.style.setProperty('--py', `${clamp(sy + ty).toFixed(1)}px`);
      el.style.setProperty('--px', `${clamp(tx).toFixed(1)}px`);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      // 0 when the element is centred in the viewport; 0.25 of the distance, as the plan says
      sy = -(r.top + r.height / 2 - window.innerHeight / 2) * 0.25;
      queue();
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tx = clamp((e.gamma / 45) * max);
      ty = clamp(((e.beta - 45) / 45) * max * 0.5);
      queue();
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // iOS asks permission for this event; there it simply never fires
    window.addEventListener('deviceorientation', onOrient, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('deviceorientation', onOrient);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [max, reduced]);
  return ref;
}

/** Pointer tilt for a card: sets `--rx` / `--ry` degrees on the element while the pointer moves over it. */
export function useTilt<T extends HTMLElement>(deg = 5) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 2 * deg).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - (e.clientY - r.top) / r.height) * 2 * deg).toFixed(2)}deg`);
    };
    const leave = () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [deg, reduced]);
  return ref;
}
