'use client';
import { useEffect, useState } from 'react';

/** True when the user asked for reduced motion (OS setting or in-app toggle). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches || document.documentElement.dataset.motion === 'reduced');
    read();
    mq.addEventListener('change', read);
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    return () => {
      mq.removeEventListener('change', read);
      obs.disconnect();
    };
  }, []);
  return reduced;
}
