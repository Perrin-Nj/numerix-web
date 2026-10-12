'use client';
import { useEffect, useState } from 'react';
import { useReducedMotion } from './index';

/** Counts from 0 up to `target` with an ease-out curve. Returns `target` at once under reduced motion. */
export function useCountUp(target: number, durationMs = 900): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / durationMs, 1);
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, durationMs]);
  return reduced ? target : value;
}
