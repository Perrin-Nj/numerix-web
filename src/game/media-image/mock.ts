import type { MediaRef } from '@/data/api/types';

/** A drawn stand-in for stories and tests: no network, same shape as the server MediaRef. */
export function mockMedia(color: string, label: string, w = 960, h = 540): MediaRef {
  const svg = (width: number) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round((width * h) / w)}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#ffffff" stop-opacity=".55"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * 0.7}" cy="${h * 0.35}" r="${h * 0.18}" fill="#fff" opacity=".6"/><text x="40" y="${h - 40}" font-size="56" font-family="sans-serif" fill="#0f172a">${label}</text></svg>`,
    )}`;
  return {
    id: `a_mock${label}`,
    alt: label,
    width: w,
    height: h,
    color,
    lqip: svg(24),
    srcset: [
      { w: 480, url: svg(480) },
      { w, url: svg(w) },
    ],
  };
}
