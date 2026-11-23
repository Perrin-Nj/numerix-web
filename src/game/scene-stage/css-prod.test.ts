// Production CSS guard: the app's minifier (lightningcss) once DROPPED `translate` from a rule that also had `transform`
// (every grid board shifted and clipped at 360 px in a production build). This test compiles every scene-stage stylesheet the way production does
// and fails when a translate, rotate or scale declaration is lost.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../../..');
const pnpm = path.join(root, 'node_modules/.pnpm');
const find = (p: string) => fs.existsSync(pnpm) && fs.readdirSync(pnpm).find((d) => d.startsWith(p));
const lcDir = find('lightningcss@') || '';
const bsDir = find('browserslist@') || '';

function cssFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? cssFiles(path.join(dir, e.name)) : e.name.endsWith('.css') ? [path.join(dir, e.name)] : []));
}

describe.skipIf(!lcDir || !bsDir)('scene-stage CSS survives the production minifier', () => {
  const req = createRequire(import.meta.url);
  const lc = req(path.join(pnpm, lcDir, 'node_modules/lightningcss'));
  const targets = lc.browserslistToTargets(req(path.join(pnpm, bsDir, 'node_modules/browserslist'))('defaults'));
  for (const f of cssFiles(__dirname)) {
    it(`${path.relative(__dirname, f)} keeps every translate, rotate and scale`, () => {
      const code = fs.readFileSync(f);
      const out = lc.transform({ filename: f, code, minify: true, targets }).code as Buffer;
      const left = (s: string) => (s.match(/(?:^|[;{])(?:translate|rotate|scale):/g) ?? []).length;
      // declarations in the source (outside comments) versus the minified output; keyframe bodies are counted on both sides
      const src = code.toString().replace(/\/\*[\s\S]*?\*\//g, '');
      expect(left(out.toString()), `${path.basename(f)}: a translate/rotate/scale declaration was dropped by the minifier`).toBeGreaterThanOrEqual(left(src.replace(/\s+/g, '').replace(/\}/g, '}').replace(/\{/g, '{')) - 0);
    });
  }
});
