// Number line as a lit launch track: ticks and labels along a slab, a rocket parked at the marked number hops along it to the answer at the reveal.
import { ConeGeometry, BoxGeometry, Group, Mesh, TorusGeometry } from 'three';
import type { Ctx } from '../engine';
import { rocketGeo, tokenGeo } from '../geo';
import { PAL, arc, colour, counted, ease, fit, mesh, plate, pop, solid, sparkles } from '../kit';
import type { BayPlan } from '../plan';
import type { Sprite } from 'three';

export function track(c: Ctx, p: Extract<BayPlan, { kind: 'track' }>) {
  const rounding = p.mark !== null; // a marked number on a long line: a big ruler, the jump to the rounded end shows at the reveal
  if (rounding) {
    c.focus = true;
    c.pitch = 1.2;
  }
  const X0 = -6.2;
  const W = 12.4;
  const X = (v: number) => X0 + (W * (Math.min(Math.max(v, p.lo), p.hi) - p.lo)) / (p.hi - p.lo);
  const Z = 1.2;
  const slab = mesh(c, new BoxGeometry(W + 1.2, 0.25, rounding ? 2.6 : 1.4), colour(c, '#5b4f78', { roughness: 0.6 }));
  slab.position.set(0, 0.12, Z);
  const ticks = counted(c, new BoxGeometry(0.1, 0.12, 0.9), colour(c, '#ffffff', { roughness: 0.5 }), p.steps + 1);
  const cols = Array.from({ length: p.steps + 1 }, (_, k) => k);
  const sp = sparkles(c);
  // the labelled numbers the question shows (never the answer)
  p.labels.forEach((l) => plate(c, `${l}`, 'q', X(l), 0.95, Z + (rounding ? 2.2 : 1.3), rounding ? 1.15 : 0.7));
  (p.pins ?? []).forEach((q) => {
    const f = mesh(c, new ConeGeometry(0.22, 0.6, 5), colour(c, PAL.pink, { emissive: 0.3 }));
    f.position.set(X(q.v), 0.75, Z);
    plate(c, q.label || `${q.v}`, 'n', X(q.v), 1.9, Z, 0.9);
  });
  if (p.gap) {
    p.gap.forEach((v) => {
      const f = mesh(c, new ConeGeometry(0.22, 0.6, 5), colour(c, PAL.pink, { emissive: 0.3 }));
      f.position.set(X(v), 0.75, Z);
      plate(c, `${v}`, 'n', X(v), 1.9, Z, 0.9);
    });
    if (p.ans === null) plate(c, '?', 'q', X(p.at), 2.2, Z, 1.0);
    else plate(c, `${p.ans}`, 'win', X(p.at), 2.2, Z, 1.4);
  }
  let arrow: Mesh | null = null;
  let jump: Mesh | null = null;
  let aTag: Sprite | null = null;
  if (p.mark !== null) {
    arrow = mesh(c, new ConeGeometry(0.3, 0.7, 5), colour(c, PAL.pink, { emissive: 0.4 }), false);
    arrow.rotation.x = Math.PI;
    plate(c, `${p.mark}`, 'n', X(p.mark), 3.6, Z - 0.3, 1.5);
    if (p.ans !== null && p.ans !== p.mark) {
      jump = mesh(c, new TorusGeometry(1, 0.08, 6, 28, Math.PI), colour(c, PAL.gold, { emissive: 0.6 }), false);
      jump.position.set((X(p.mark) + X(p.ans)) / 2, 0.45, Z);
      jump.scale.set(Math.max(Math.abs(X(p.ans) - X(p.mark)) / 2, 0.05), 0.001, 1);
    }
    if (p.ans !== null) aTag = plate(c, `${p.ans}`, 'win', X(p.ans), 2.4, Z - 0.2, 2.0);
  }
  const rocket = new Group();
  const small = p.token !== undefined && p.token !== 'mini';
  const rm = new Mesh(c.own(small ? tokenGeo(p.token!).scale(2.2, 2.2, 2.2) : rocketGeo()), solid(c));
  rm.castShadow = true;
  rocket.add(rm);
  c.root.add(rocket);
  const from = X(p.at);
  const to = p.ans !== null ? X(p.ans) : from;
  let fired = false;
  c.tick((a) => {
    const enter = pop((a.enter * 2 - 0.2) / 0.8);
    const f = ease((a.e - 0.15) / 0.55);
    const { v, y } = arc(from, to, f, 2.4);
    rocket.position.set(v, y + 0.25, Z);
    rocket.scale.setScalar(Math.max(enter, 0.001) * (small ? 0.9 : 1.1));
    rocket.rotation.z = Math.sin(f * Math.PI) * -0.25 * Math.sign(to - from);
    if (arrow) {
      arrow.position.set(X(p.mark!), 1.9 + Math.sin(a.t * 3) * 0.12, Z);
      arrow.scale.setScalar(Math.max(enter, 0.001));
    }
    cols.forEach((k) => {
      const v2 = p.lo + ((p.hi - p.lo) * k) / p.steps;
      const lit = p.ans !== null && Math.abs(v2 - p.ans) < (p.hi - p.lo) / p.steps / 2 && f > 0.95;
      ticks.set(k, X(v2), 0.3, Z, Math.max(enter, 0.001) * (lit ? 2.2 : 1));
      ticks.tint(k, 1, lit ? 0.85 : 0.75, lit ? 0.2 : 0.55);
    });
    ticks.commit();
    if (jump) jump.scale.y = Math.max(2.2 * f, 0.001);
    if (aTag) fit(aTag, ease((a.e - 0.55) * 5));
    if (!fired && a.ok && p.ans !== null && f >= 1) {
      fired = true;
      sp.go(to, 1.2, Z);
    }
  });
}
