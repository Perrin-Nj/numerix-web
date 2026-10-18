'use client';
import { DotLottieReact, setWasmUrl, type DotLottie } from '@lottiefiles/dotlottie-react';

// Self-hosted runtime: no third-party CDN fetch.
setWasmUrl('/mascot/dotlottie-player.wasm');

export type LottieMode = { speed: number; frame: 'play' | 'first' | 'mid' };

/** Loaded on demand by Mascot. The single animation is never edited; only speed and frame change. */
export default function LottieRabbit({ src, mode, px, onError }: { src: string; mode: LottieMode; px: number; onError: () => void }) {
  const still = mode.frame !== 'play';
  const attach = (dl: DotLottie | null) => {
    if (!dl) return;
    dl.addEventListener('loadError', onError);
    dl.addEventListener('load', () => {
      if (still) dl.setFrame(mode.frame === 'mid' ? Math.floor(dl.totalFrames / 2) : 0);
    });
  };
  return <DotLottieReact src={src} loop autoplay={!still} speed={mode.speed} dotLottieRefCallback={attach} style={{ width: px, height: px }} />;
}
