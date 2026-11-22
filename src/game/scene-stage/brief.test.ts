// Brief conformance (run by scripts/check-scene-brief.mjs): a scene spec must cite its approved scene brief
// (specs/001-three-worlds-premium/scene-briefs/<world>.md) and the numbers of the brief's scene line must be the numbers the spec binds.
// Keywords in spec.brief must occur in the matching brief line, so a spec cannot drift from the brief unnoticed.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveScene } from './bind';
import { PILOT_SCENES } from './fixtures/pilot';
import { numbersIn } from './bind';

function briefsDir(): string | null {
  const here = path.resolve(__dirname, '../../..');
  const cands = [process.env.SCENE_BRIEFS_DIR, path.join(here, 'specs/001-three-worlds-premium/scene-briefs')];
  try {
    const common = execSync('git rev-parse --git-common-dir', { cwd: here }).toString().trim();
    cands.push(path.join(path.dirname(path.resolve(here, common)), 'specs/001-three-worlds-premium/scene-briefs'));
  } catch {
    /* no git: use the other candidates */
  }
  return cands.find((c) => c && fs.existsSync(c)) ?? null;
}

type Brief = Record<'scene' | 'setting' | 'camera' | 'light' | 'idle' | 'ok' | 'ko' | 'hook', string>;
function parse(md: string, id: string): Brief | null {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('## ') && l.includes(id));
  if (start < 0) return null;
  const out: Brief = { scene: '', setting: '', camera: '', light: '', idle: '', ok: '', ko: '', hook: '' };
  for (const l of lines.slice(start + 1)) {
    if (l.startsWith('## ')) break;
    const m = /^- ([^:]+):\s*(.*)$/.exec(l);
    if (!m) continue;
    const k = m[1]!.toLowerCase();
    const v = m[2]!.toLowerCase();
    if (k.startsWith('scene')) out.scene += ' ' + v;
    else if (k.startsWith('setting')) out.setting = v;
    else if (k.startsWith('camera')) out.camera = v;
    else if (k.startsWith('light')) out.light = v;
    else if (k.startsWith('idle')) out.idle = v;
    else if (k.startsWith('correct')) out.ok = v;
    else if (k.startsWith('wrong')) out.ko = v;
    else if (k.startsWith('attention')) out.hook = v;
  }
  return out;
}

const dir = briefsDir();
describe.skipIf(!dir)('scene briefs', () => {
  for (const p of PILOT_SCENES) {
    it(`${p.id} follows its approved brief`, () => {
      const b = p.spec.brief;
      expect(b, 'spec.brief is required').toBeTruthy();
      expect(b!.id.split('.')[0]).toBe(p.world);
      const md = fs.readFileSync(path.join(dir!, `${p.world}.md`), 'utf8');
      const brief = parse(md, b!.id);
      expect(brief, `no brief ${b!.id} for ${p.id}`).toBeTruthy();
      const miss: string[] = [];
      const need = (field: keyof Brief, words: string[], haystack = brief![field]) => {
        for (const w of words) if (!haystack.includes(w.toLowerCase().replace('-', ' ')) && !haystack.includes(w.toLowerCase())) miss.push(`${field}: "${w}" is not in the brief`);
      };
      need('setting', b!.setting, `${brief!.setting} ${brief!.scene}`);
      need('camera', b!.camera);
      need('light', b!.light, `${brief!.light} ${brief!.scene}`);
      need('idle', b!.idle);
      need('hook', b!.hook);
      need('ok', b!.ok);
      need('ko', b!.ko);
      expect(miss).toEqual([]);
      // the counts of the brief's scene line are the numbers the spec binds
      const r = resolveScene(p.spec, p.fr, { reveal: true });
      const known = new Set<number>([...Object.values(r.values), ...Object.values(r.props).map((x) => x.count)]);
      const stray = numbersIn(brief!.scene.replace(/\d+\s*percent/g, '')).filter((n) => n > 1 && !known.has(n));
      expect(stray, 'numbers in the brief scene line that the spec does not bind').toEqual([]);
    });
  }
});
