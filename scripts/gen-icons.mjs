// Renders the app icons (placeholder brand mark) with Playwright. Run: node scripts/gen-icons.mjs
// The mark is the mascot emoji on the brand color; replace the art later without touching code.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const EMOJI = process.env.NEXT_PUBLIC_MASCOT_EMOJI || '🦊';
const BRAND = '#5b4bdb';
mkdirSync(join(root, 'public', 'icons'), { recursive: true });

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, pad: 0.12, round: true },
  { file: 'public/icons/icon-512.png', size: 512, pad: 0.12, round: true },
  { file: 'public/icons/icon-maskable-512.png', size: 512, pad: 0.28, round: false },
  { file: 'src/app/icon.png', size: 512, pad: 0.12, round: true },
  { file: 'src/app/apple-icon.png', size: 180, pad: 0.14, round: false },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`<body style="margin:0;background:transparent">
    <div style="width:${t.size}px;height:${t.size}px;background:${BRAND};${t.round ? `border-radius:${t.size * 0.22}px;` : ''}display:flex;align-items:center;justify-content:center;font-size:${t.size * (1 - 2 * t.pad) * 0.8}px;line-height:1">${EMOJI}</div></body>`);
  await page.screenshot({ path: join(root, t.file), omitBackground: true });
  console.log('wrote', t.file);
}
await browser.close();
