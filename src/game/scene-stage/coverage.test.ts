// Coverage of the real seed questions: route every question to an archetype, build its spec, run the content gate (bind, counts, answer leak,
// alt numbers, story-objects). Covered = routed and zero problems. Writes COVERAGE_OUT (json) when set. Seeds: SEED_ROOT or C:/nx/ct-<world>/seed/questions.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { espaceClockDocked } from './fixtures/espace-clock';
import { PILOT_SCENES } from './fixtures/pilot';
import type { World } from './objects';
import { routeQuestion, type RawQuestion } from './route';
import { checkScene } from './validate';

const WORLDS: World[] = ['echecs', 'medecine', 'espace'];
const file = (w: World) => [process.env.SEED_ROOT && path.join(process.env.SEED_ROOT, `${w}.json`), `C:/nx/ct-${w}/seed/questions/${w}.json`].find((f) => f && fs.existsSync(f));
const have = WORLDS.every(file);

describe.skipIf(!have)('scene coverage of the seed questions', () => {
  it('routes and gates every question; reports the covered count', () => {
    const rows: { id: string; world: string; archetype?: string; status: 'covered' | 'uncovered'; why?: string; made?: 'hand' | 'generic'; room?: string }[] = [];
    for (const w of WORLDS) {
      const qs = (JSON.parse(fs.readFileSync(file(w)!, 'utf8')) as { questions: RawQuestion[] }).questions;
      for (const q of qs) {
        const pilot = [...PILOT_SCENES, espaceClockDocked].find((p) => p.id === q.id);
        const r = pilot ?? routeQuestion(w, q);
        if ('skip' in r) {
          rows.push({ id: q.id, world: w, status: 'uncovered', why: r.skip });
          continue;
        }
        const problems = checkScene(r);
        rows.push(problems.length ? { id: q.id, world: w, archetype: r.spec.archetype, status: 'uncovered', why: problems.map((p) => `${p.rule}: ${p.detail}`).slice(0, 2).join(' | ') } : { id: q.id, world: w, archetype: r.spec.archetype, status: 'covered', made: pilot ? 'hand' : 'generic', room: r.spec.room });
      }
    }
    const by = (w: string) => rows.filter((r) => r.world === w);
    const summary = Object.fromEntries(WORLDS.map((w) => [w, `${by(w).filter((r) => r.status === 'covered').length}/${by(w).length}`]));
    const covered = rows.filter((r) => r.status === 'covered').length;
    console.log(`scene coverage: ${covered}/${rows.length}`, JSON.stringify(summary));
    const arch: Record<string, number> = {};
    for (const r of rows) if (r.archetype && r.status === 'covered') arch[r.archetype] = (arch[r.archetype] ?? 0) + 1;
    console.log('per archetype', JSON.stringify(arch));
    const made = (w: string, m: string) => rows.filter((r) => r.world === w && r.status === 'covered' && r.made === m).length;
    const rooms: Record<string, number> = {};
    for (const r of rows) if (r.room && r.status === 'covered') rooms[`${r.world}.${r.room}`] = (rooms[`${r.world}.${r.room}`] ?? 0) + 1;
    console.log('hand-made vs generic', JSON.stringify(Object.fromEntries(WORLDS.map((w) => [w, `${made(w, 'hand')} hand-made, ${made(w, 'generic')} generic, ${by(w).length - by(w).filter((r) => r.status === 'covered').length} refused`]))));
    console.log('rooms', JSON.stringify(rooms));
    if (process.env.COVERAGE_OUT) fs.writeFileSync(process.env.COVERAGE_OUT, JSON.stringify({ covered, total: rows.length, summary, arch, rows }, null, 1));
    expect(rows.length).toBeGreaterThan(300);
  });
});

describe('first pilot: control room clock', () => {
  it('shows the station approach view for any hh:mm, binds the time and passes the gate', async () => {
    const { espaceClockApproach, espaceClockDocked } = await import('./fixtures/espace-clock');
    for (const p of [espaceClockApproach, espaceClockDocked]) {
      expect(checkScene(p)).toEqual([]);
      expect(p.spec.requires).toEqual(expect.arrayContaining(['clock', 'station', 'rocket']));
    }
    expect(espaceClockApproach.spec.setting).toMatch(/approach/);
    expect(espaceClockDocked.spec.setting).toMatch(/docked/);
  });
});
