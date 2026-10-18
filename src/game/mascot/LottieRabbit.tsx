'use client';
import { useEffect, useState } from 'react';
import { DotLottieReact, setWasmUrl, type DotLottie } from '@lottiefiles/dotlottie-react';

// Self-hosted runtime: no third-party CDN fetch.
setWasmUrl('/mascot/dotlottie-player.wasm');

export type LottieMode = { speed: number; frame: 'play' | 'first' | 'mid' };

/** Loaded on demand by Mascot. The single animation is never edited; only speed and frame change. */
export default function LottieRabbit({ src, mode, px, onError }: { src: string; mode: LottieMode; px: number; onError: () => void }) {
  // Fetched here, not by the player: the player's own src load aborts itself on mount and logs an error.
  const [data, setData] = useState<ArrayBuffer | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    fetch(src, { signal: ctl.signal })
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch(() => !ctl.signal.aborted && onError());
    return () => ctl.abort();
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps -- onError is a fresh closure each render
  const still = mode.frame !== 'play';
  const attach = (dl: DotLottie | null) => {
    if (!dl) return;
    dl.addEventListener('loadError', onError);
    dl.addEventListener('load', () => {
      if (still) dl.setFrame(mode.frame === 'mid' ? Math.floor(dl.totalFrames / 2) : 0);
    });
  };
  if (!data) return null;
  return <DotLottieReact data={data} loop autoplay={!still} speed={mode.speed} dotLottieRefCallback={attach} style={{ width: px, height: px }} />;
}
