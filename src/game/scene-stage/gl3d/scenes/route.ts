// Trips and time spans as lit tracks. route: two legs of a trip (or a trip with a done part and a part still to go, or a far and a near mark): the probe hops to the end and
// the total or the missing distance appears. span: hour ticks with a bar for the length of time; the reveal hops hour by hour or lights one lamp per message.
import { BoxGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, type Sprite, TorusGeometry } from 'three';
import type { Ctx } from '../engine';
import { rocketGeo, tokenGeo } from '../geo';
import { PAL, arc, colour, counted, ease, fit, mesh, plate, pop, solid, sparkles } from '../kit';
import type { BayPlan } from '../plan';

const X0 = -6;
const W = 12;
const Z = 1.2;

function walker(c: Ctx, token: string) {
  const g = new Group();
  const m = new Mesh(c.own(token === 'mini' ? rocketGeo() : tokenGeo(token as never).scale(2.2, 2.2, 2.2)), solid(c));
  m.castShadow = true;
  g.add(m);
  c.root.add(g);
  return g;
}

const nf = (n: number) => n.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');

/** A big ruler per trip. Lane A is the trip as told (legs with jump arcs and their km); on a rounding question the reveal adds lane B: the same trip with every number rounded, the rounded legs side by side and the rounded landing mark with its number. */
export function route(c: Ctx, p: Extract<BayPlan, { kind: 'route' }>) {
  c.focus = true;
  c.pitch = 1.25;
  const { mode, a, b, rnd } = p;
  const whole = mode === 'route' ? a + b : a;
  const rWhole = rnd ? (mode === 'route' ? rnd.a + rnd.b : rnd.a) : whole;
  const span = Math.max(whole, rWhole);
  const X = (v: number) => X0 + (W * v) / span;
  const zA = rnd ? -2.2 : -0.4;
  const zB = 1.9;
  const done = mode === 'route' ? a : b; // end of the first leg (remain/two: the part already done)
  const bar = (from: number, to: number, hex: string, z: number, ghost = false, thick = 1.5) => {
    const m = mesh(c, new BoxGeometry(Math.max(X(to) - X(from), 0.05), 0.35, thick), colour(c, hex, { emissive: ghost ? 0.1 : 0.35, opacity: ghost ? 0.4 : undefined }), false);
    m.position.set((X(from) + X(to)) / 2, 0.3, z);
    return m;
  };
  const jump = (from: number, to: number, z: number, h: number, hex: string) => {
    const m = mesh(c, new TorusGeometry(1, 0.07, 6, 28, Math.PI), colour(c, hex, { emissive: 0.5 }), false);
    m.scale.set(Math.max((X(to) - X(from)) / 2, 0.05), 0.001, 1);
    m.position.set((X(from) + X(to)) / 2, 0.55, z);
    return { m, h };
  };
  const slab = (z: number) => {
    const s = mesh(c, new BoxGeometry(W + 1.6, 0.2, 2.1), colour(c, '#4a3f66', { roughness: 0.7 }));
    s.position.set(0, 0.1, z);
  };
  slab(zA);
  if (rnd) slab(zB);
  const flag = (v: number, z: number) => {
    const f = mesh(c, new CylinderGeometry(0.06, 0.06, 1.4, 5), colour(c, PAL.pink, { emissive: 0.4 }), false);
    f.position.set(X(v), 0.9, z);
  };
  flag(0, zA);
  flag(whole, zA);
  const arcs: { m: Mesh; h: number }[] = [];
  // lane A
  if (mode === 'route') {
    bar(0, a, PAL.teal, zA);
    bar(a, a + b, PAL.amber, zA);
    arcs.push(jump(0, a, zA, 3.2, PAL.teal), jump(a, a + b, zA, 3.2, PAL.amber));
    plate(c, `${nf(a)} km`, 'n', X(a / 2), 3.6, zA, 1);
    plate(c, `${nf(b)} km`, 'q', X(a + b / 2), 3.6, zA, 1);
  } else {
    bar(0, done, PAL.teal, zA);
    bar(done, whole, PAL.amber, zA, p.ans === null);
    arcs.push(jump(done, whole, zA, 3.2, PAL.amber));
    plate(c, `${nf(done)} km`, 'n', X(done / 2), 1.6, zA + 1.2, 1);
    plate(c, `${nf(whole)} km`, 'q', X(whole / 2), 0.2, zA - 1.4, 1);
    plate(c, p.ans === null ? '?' : `${rnd ? '\u2248 ' : ''}${nf(p.ans)} km`, p.ans === null ? 'q' : 'win', X(done + (whole - done) / 2), 3.6, zA, 1.2);
  }
  // lane B: the rounded trip
  const tops: { sp: Sprite; at: number }[] = [];
  if (rnd) {
    if (mode === 'route') {
      bar(0, rnd.a, PAL.teal, zB);
      bar(rnd.a, rnd.a + rnd.b, PAL.amber, zB);
      tops.push({ sp: plate(c, nf(rnd.a), 'n', X(rnd.a / 2), 1.6, zB, 1), at: 0.45 }, { sp: plate(c, nf(rnd.b), 'n', X(rnd.a + rnd.b / 2), 1.6, zB, 1), at: 0.55 });
    } else {
      bar(0, rnd.b, PAL.teal, zB);
      bar(rnd.b, rnd.a, PAL.amber, zB);
      tops.push({ sp: plate(c, nf(rnd.b), 'n', X(rnd.b / 2), 1.6, zB, 1), at: 0.45 });
    }
    if (mode === 'route') tops.push({ sp: plate(c, `${rnd.est ? '≈ ' : ''}${nf(p.ans!)} km`, 'win', X(rWhole), 2.8, zB, 1.2), at: 0.75 });
    // the exact marks drop onto the rounded ones
    for (const [ex, ro] of mode === 'route' ? [[a, rnd.a], [a + b, rnd.a + rnd.b]] : [[done, rnd.b], [whole, rnd.a]]) {
      const l = mesh(c, new BoxGeometry(0.08, 0.05, zB - zA), colour(c, '#ffffff', { opacity: 0.55 }), false);
      l.position.set(X((ex! + ro!) / 2), 0.55, (zA + zB) / 2);
      l.rotation.y = Math.atan2(X(ro!) - X(ex!), zB - zA) ;
      l.scale.z = 1 / Math.max(Math.cos(l.rotation.y), 0.2);
    }
  } else if (mode === 'route' && p.ans !== null) tops.push({ sp: plate(c, `${nf(p.ans)} km`, 'win', X(whole), 2.4, zA + 1.3, 1.2), at: 0.7 });
  else if (mode === 'route') plate(c, '?', 'q', X(whole), 2.4, zA + 1.3, 1.4);
  const hero = walker(c, p.token);
  const sp = sparkles(c);
  let fired = false;
  c.tick((an) => {
    const enter = pop((an.enter * 2 - 0.2) / 0.8);
    const f = ease((an.e - 0.1) / 0.6);
    const from = mode === 'route' ? 0 : done;
    const mid = mode === 'route' ? a : done;
    const f1 = p.ans === null ? 0 : mode === 'route' ? Math.min(f * 2, 1) : f;
    const f2 = Math.max(f * 2 - 1, 0);
    const k = mode === 'route' ? (f2 > 0 ? arc(mid, whole, f2, 2.4) : arc(from, mid, f1, 2.4)) : arc(from, whole, f, 2.4);
    hero.position.set(X(k.v), 0.55 + k.y, zA);
    hero.scale.setScalar(Math.max(enter, 0.001) * (p.token === 'mini' ? 0.9 : 1.1));
    arcs.forEach((q, i) => (q.m.scale.y = Math.max(q.h * ease(an.enter * 1.5 - 0.2 - i * 0.2), 0.001)));
    tops.forEach((q) => fit(q.sp, ease((an.e - q.at) * 5)));
    if (!fired && an.ok && p.ans !== null && f >= 1) {
      fired = true;
      sp.go(X(whole), 1.2, zA);
    }
  });
}

/** Time as two lanes of blocks. A conversion shows the span in hours (lane A, one block a full hour) and in minutes (lane B, the same blocks, 60 min each) side by side; a clock span shows the start and end marks with the elapsed arc; a start plus a duration lands on the arrival mark; messages light one lamp each. */
export function span(c: Ctx, p: Extract<BayPlan, { kind: 'span' }>) {
  c.focus = true;
  c.pitch = 1.2;
  const { lenH, conv } = p;
  const X = (h: number) => X0 + (W * h) / lenH;
  const blocks: { from: number; to: number }[] = [];
  for (let i = 0; i < lenH - 1e-6; i++) blocks.push({ from: i, to: Math.min(i + 1, lenH) });
  const laneZ = conv ? -2.0 : -0.2;
  const slab = (z: number) => {
    const s = mesh(c, new BoxGeometry(W + 1.6, 0.2, 2.1), colour(c, '#4a3f66', { roughness: 0.7 }));
    s.position.set(0, 0.1, z);
  };
  slab(laneZ);
  if (conv) slab(2.0);
  const lane = (z: number, ghost: boolean) =>
    blocks.map((b, i) => {
      const m = mesh(c, new BoxGeometry(Math.max(X(b.to) - X(b.from) - 0.14, 0.05), 0.4, 1.5), colour(c, b.to - b.from < 1 ? PAL.amber : i % 2 ? PAL.gold : PAL.teal, { emissive: ghost ? 0.1 : 0.35, opacity: ghost ? 0.3 : undefined }), false);
      m.position.set((X(b.from) + X(b.to)) / 2, 0.35, z);
      return m;
    });
  const laneA = lane(laneZ, false);
  const laneB = conv ? lane(2.0, !conv.bGiven && p.total === null) : [];
  const hero = walker(c, p.token);
  // one lamp per message along the track (spheres), the number written only at each fourth lamp and at the last, over its own lamp
  const lampMesh = counted(c, new SphereGeometry(0.34, 10, 8), colour(c, PAL.amber, { emissive: 0.8 }), Math.max(p.msgs, 1));
  lampMesh.mesh.userData.counted = false;
  lampMesh.mesh.count = p.msgs;
  const lamps = Array.from({ length: p.msgs }, (_, k) => {
    const at = ((k + 1) * p.every) / 60;
    const label = false; // the lamps are countable and the total is written at the end
    const sp2 = label ? plate(c, `${k + 1}`, 'n', X(at), 1.7, laneZ + 0.4, 1.0) : null;
    if (sp2) sp2.userData.fixed = true;
    return { sp: sp2, at };
  });
  const tops: { sp: Sprite; at: number }[] = [];
  const mid = (b: { from: number; to: number }) => (X(b.from) + X(b.to)) / 2;
  let arcM: Mesh | null = null;
  if (conv) {
    plate(c, conv.bGiven ? conv.b : conv.a, 'n', X(lenH / 2), 1.9, laneZ - 0.2, 1.5);
    if (conv.bGiven) {
      if (blocks.length <= 4) blocks.forEach((b) => plate(c, b.to - b.from < 1 ? `${Math.round((b.to - b.from) * 60)} min` : conv.per ?? '60 min', 'n', mid(b), 1.2, 2.9, 0.9));
      tops.push({ sp: plate(c, conv.a, 'win', X(lenH / 2), 2.4, 2.0, 1.4), at: 0.7 });
    } else {
      if (p.total === null) plate(c, '?', 'q', X(lenH / 2), 1.9, 2.0, 1.6);
      if (blocks.length <= 4) blocks.forEach((b, i) => tops.push({ sp: plate(c, b.to - b.from < 1 ? `${Math.round((b.to - b.from) * 60)} min` : conv.per ?? '60 min', 'n', mid(b), 1.2, 2.9, 0.9), at: 0.3 + i * 0.1 }));
      tops.push({ sp: plate(c, conv.b, 'win', X(lenH / 2), 2.9, 2.0, 1.5), at: 0.75 });
    }
  } else if (p.arrive !== null || p.end) {
    plate(c, p.start, 'n', X(0), 1.9, laneZ + 0.2, 1.1);
    if (p.end && !p.hops.length && p.every === 0) plate(c, `+ ${p.end}`, 'n', X(lenH / 2), 0.3, laneZ + 1.4, 1.1);
    if (p.end && p.hops.length) plate(c, p.end, 'q', X(lenH), 1.9, laneZ + 0.2, 1.1);
    if (p.arrive !== null) tops.push({ sp: plate(c, p.arrive, 'win', X(lenH), 2.9, laneZ, 1.4), at: 0.75 });
    else if (p.end && !p.hops.length && p.every === 0 && p.total === null) plate(c, '?', 'q', X(lenH), 2.9, laneZ, 1.6);
    arcM = mesh(c, new TorusGeometry(1, 0.08, 6, 28, Math.PI), colour(c, PAL.gold, { emissive: 0.6 }), false);
    arcM.position.set(X(lenH / 2), 0.6, laneZ);
    arcM.scale.set(X(lenH / 2) - X(0), 0.001, 1);
    if (p.total) tops.push({ sp: plate(c, p.total, 'win', X(lenH / 2), 3.6, laneZ, 1.4), at: 0.7 });
    p.hops.forEach((t, k) => tops.push({ sp: plate(c, t, 'n', mid(blocks[Math.min(k, blocks.length - 1)]!), 0.3, laneZ + 1.4, 0.9), at: 0.15 + k * 0.15 }));
  } else {
    plate(c, p.start, 'n', X(0), 1.9, laneZ + 0.2, 1.1);
    if (p.every > 0) plate(c, `${p.every} min`, 'q', X(lenH / 2), 2.9, laneZ, 1.2);
    if (p.total) tops.push({ sp: plate(c, p.total, 'win', X(lenH), 2.9, laneZ + 0.2, 1.4), at: 0.8 });
  }
  const sp = sparkles(c);
  let fired = false;
  c.tick((an) => {
    const enter = pop((an.enter * 2 - 0.2) / 0.8);
    const f = ease((an.e - 0.1) / 0.7);
    hero.position.set(X(lenH * f), 0.5 + Math.abs(Math.sin(f * Math.PI * Math.max(blocks.length, 2))) * 0.6, laneZ);
    hero.scale.setScalar(Math.max(enter, 0.001) * (p.token === 'mini' ? 0.9 : 1.1));
    [...laneA, ...laneB].forEach((m, i) => (m.scale.y = Math.max(pop((an.enter * 2 - 0.1 * (i % blocks.length)) / 0.5), 0.001)));
    laneB.forEach((m, i) => (m.scale.y = Math.max(conv?.bGiven ? 1 : p.total === null && an.e < 0.01 ? 0.3 : pop((an.e * 2 - 0.05 * i) / 0.5), 0.3)));
    if (arcM) arcM.scale.y = Math.max(2.4 * f, 0.001);
    lamps.forEach((q, k) => {
      const on = f >= q.at / Math.max(lenH, 0.001) - 0.02;
      lampMesh.set(k, X(q.at), 0.95 + (on ? 0.25 * Math.sin(an.t * 5 + k) : 0), laneZ, on ? 1 : 0.35);
      if (q.sp) fit(q.sp, on ? 1 : 0.001);
    });
    lampMesh.commit();
    tops.forEach((q) => fit(q.sp, ease((an.e - q.at) * 5)));
    if (!fired && an.ok && (p.total !== null || p.arrive !== null || conv !== null) && an.e > 0.6 && f >= 1) {
      fired = true;
      sp.go(X(lenH), 1.2, laneZ);
    }
  });
}
