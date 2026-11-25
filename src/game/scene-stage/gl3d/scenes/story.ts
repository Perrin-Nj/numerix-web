// Redesigned space scenes (comprehension brief): one focus, big objects, big digits on or above the object, the operation shown by motion at the reveal,
// the question frame shows the situation and a big glowing "?" where the answer goes. Every scene hides the gantry (c.focus) and is auto-framed by the engine.
import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, RingGeometry, SphereGeometry, TorusGeometry } from 'three';
import type { Ctx } from '../engine';
import { crateGeo, rocketGeo, tankFrameGeo, tokenGeo } from '../geo';
import { PAL, arc, colour, counted, ease, fit, plate, pop, solid, sparkles } from '../kit';
import type { BayPlan } from '../plan';

const D = 1.8; // plate scale of a main digit: about 28 px on a phone once the scene is framed
const win = (e: number, from: number, to: number) => ease((e - from) / Math.max(to - from, 0.01));

/** n packets of m (a tray holding exactly m of the object, its count under it) plus loose ones: the packets lift one by one and a running total counts up. */
export function packets(c: Ctx, p: Extract<BayPlan, { kind: 'pile' }>) {
  c.focus = true;
  c.pitch = 1.5;
  const n = p.a;
  const per = p.b;
  const loose = p.c;
  const slot = 4.1;
  const narrow = (c.aspect ?? 1.7) < 1.2; // portrait: three trays a row, the loose ones on a row of their own, so the scene uses the height
  const perRow = narrow ? (n <= 4 ? Math.min(n, 2) : Math.min(n, 3)) : n > 3 ? Math.ceil(n / 2) : n;
  const rowsN = Math.ceil(n / perRow) + (narrow && loose ? 1 : 0);
  const width = perRow * slot + (loose && !narrow ? 5 : 0);
  const x0 = -width / 2 + slot / 2;
  const bz = (i: number) => (Math.floor(i / perRow) - (rowsN - 1) / 2) * 4.3;
  const bxs = (i: number) => x0 + ((i % perRow) + (perRow - Math.min(perRow, n - Math.floor(i / perRow) * perRow)) / 2) * slot; // the last row is centred
  const sol = solid(c);
  const sp = sparkles(c);
  const each = per <= 12; // up to 12 objects are drawn one by one in the tray; more: one big object and the count
  const k = each ? Math.ceil(Math.sqrt(per)) : 1;
  const rows = each ? Math.ceil(per / k) : 1;
  const sc = each ? Math.min(2.2, 3.1 / Math.max(k, rows) / 1.05) : 3.4;
  const trays = counted(c, new BoxGeometry(3.5, 0.3, 3.5), colour(c, '#b9824d', { roughness: 0.9 }), n);
  trays.mesh.userData.counted = false;
  const inTray = each ? per : 1;
  const stars = counted(c, tokenGeo(p.token), sol, n * inTray + loose);
  if (each) c.expect = n * per + loose;
  const lx = narrow ? -1.5 : x0 + perRow * slot + 0.4;
  const lz = narrow ? (rowsN - 1) * 2.15 - 0.7 : 0;
  const spot = (j: number) => ({ x: ((j % k) - (k - 1) / 2) * sc * 1.05, z: (Math.floor(j / k) - (rows - 1) / 2) * sc * 1.05 });
  for (let i = 0; i < n; i++) plate(c, `${per}`, 'q', bxs(i), 0.2, bz(i) + 2.5, D * 0.7);
  if (loose) plate(c, `+${loose}`, 'q', lx + 1.5, 1.4, lz + 2.4, D);
  const nTot = n + (loose ? 1 : 0);
  const totals = Array.from({ length: nTot }, (_, i) => (i < n ? per * (i + 1) : per * n + loose));
  const q = p.total === null ? plate(c, '?', 'q', 0, 4.2, -(rowsN - 1) * 2.1 - 2.4, 2.4) : null;
  const run = p.total !== null ? totals.map((t, i) => plate(c, `${t}`, i === totals.length - 1 ? 'win' : 'n', 0, 4.2, -(rowsN - 1) * 2.1 - 2.4, 2.2)) : [];
  run.forEach((r) => (r.userData.seq = true));
  const step = Math.min(0.2, 0.7 / Math.max(nTot, 1));
  c.tick((a) => {
    for (let i = 0; i < n; i++) {
      const pp = Math.max(pop((a.enter * 2 - 0.15 - i * 0.15) / 0.5), 0.001);
      const lift = p.total === null ? 0 : Math.sin(win(a.e, 0.1 + i * step, 0.1 + (i + 1.5) * step) * Math.PI) * 0.9;
      trays.set(i, bxs(i), lift, bz(i), pp);
      trays.tint(i, i % 2 ? 0.8 : 1.05, i % 2 ? 1.0 : 1.0, i % 2 ? 1.25 : 0.9);
      for (let j = 0; j < inTray; j++) {
        const o = each ? spot(j) : { x: 0, z: 0 };
        stars.set(i * inTray + j, bxs(i) + o.x * pp, 0.25 + lift + (each ? 0.35 * sc : 0.7), bz(i) + o.z * pp, (each ? sc : sc) * pp, 0, -Math.atan(c.pitch ?? 0.62));
      }
    }
    for (let m = 0; m < loose; m++) {
      const pp = Math.max(pop((a.enter * 2 - 0.3 - m * 0.1) / 0.5), 0.001);
      stars.set(n * inTray + m, lx + (m % 3) * 1.5, 0.5, lz + Math.floor(m / 3) * 1.5, Math.min(sc, 1.5) * pp * (p.total === null ? 1 : 1 + 0.15 * Math.sin(a.t * 6 + m)), 0, -Math.atan(c.pitch ?? 0.62));
    }
    trays.commit();
    stars.commit();
    if (q) q.scale.set(q.userData.sx * (1 + 0.08 * Math.sin(a.t * 4)), q.userData.sy * (1 + 0.08 * Math.sin(a.t * 4)), 1);
    run.forEach((r, i) => {
      const last = i === run.length - 1;
      const on = win(a.e, 0.12 + i * step, 0.2 + i * step);
      const off = last ? 0 : win(a.e, 0.1 + (i + 1) * step, 0.16 + (i + 1) * step);
      fit(r, Math.max(on - off, 0.001));
    });
    if (p.total !== null && a.ok && a.e > 0.9) sp.go(0, 4, -(rowsN - 1) * 2.1);
  });
}

const ROOM_TINT = [0xbfe8c8, 0xcfe3ff, 0xffe0b8, 0xf6cfe6, 0xfff0a8, 0xd9d0ff];
const roomToken = (l: string) => (/serre|green/i.test(l) ? 'ball' : /labo|lab/i.test(l) ? 'flask' : /dock/i.test(l) ? 'crate' : /cuisine|kitchen/i.test(l) ? 'meal' : /gym/i.test(l) ? 'star' : /tour|tower/i.test(l) ? 'canister' : /robot/i.test(l) ? 'person' : 'cell');

/** Rooms in a row: one big tile per room with its icon and its name under it; the reveal walks the crew along the row and counts the rooms. */
export function rooms(c: Ctx, p: Extract<BayPlan, { kind: 'grid' }>) {
  c.focus = true;
  const n = p.cols;
  const slot = 3.1;
  const X = (x: number) => (x - 1 - (n - 1) / 2) * slot;
  const cell = (x: number) => p.cells.find((q) => q.x === x);
  const sol = solid(c);
  const sp = sparkles(c);
  const tiles: Mesh[] = [];
  const icons: Mesh[] = [];
  for (let x = 1; x <= n; x++) {
    const t = new Mesh(c.own(new BoxGeometry(2.7, 0.35, 2.7)), colour(c, '#' + ROOM_TINT[(x - 1) % 6]!.toString(16).padStart(6, '0'), { roughness: 0.8 }));
    t.position.set(X(x), 0.17, 0);
    t.receiveShadow = true;
    c.root.add(t);
    tiles.push(t);
    const cl = cell(x);
    if (cl) {
      const ic = new Mesh(c.own(tokenGeo(roomToken(cl.label)).scale(3.4, 3.4, 3.4)), sol);
      ic.position.set(X(x), 0.35, 0);
      ic.castShadow = true;
      c.root.add(ic);
      icons.push(ic);
      if (cl.label) plate(c, cl.label, 'q', X(x), 0.2, 2.2, 1.35);
    }
  }
  const sel = p.sel.map((k) => p.cells[k]!);
  const from = sel[0];
  const to = sel[1] ?? sel[sel.length - 1];
  const walker = new Mesh(c.own(tokenGeo('person').scale(2.4, 2.4, 2.4)), sol);
  walker.castShadow = true;
  walker.visible = p.mode !== 'count' && !!from;
  c.root.add(walker);
  const counted = p.mode === 'count' ? sel : sel.slice(1, -1);
  const nums = counted.map((q, i) => ({ q, pl: plate(c, `${i + 1}`, 'win', X(q.x), 3.6, 0.6, D) }));
  const ring = new Mesh(c.own(new TorusGeometry(1.5, 0.1, 6, 24)), colour(c, PAL.gold, { emissive: 0.7 }));
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  c.root.add(ring);
  const ask = p.sel.length === 0 ? plate(c, '?', 'q', 0, 4.2, 0.6, 2.4) : null;
  // the walk is drawn as a jump arc with an arrow head, and the direction written on it
  const dirX = from && to ? Math.sign(to.x - from.x) : 0;
  let arcM: Mesh | null = null;
  let head: Mesh | null = null;
  let dirTag: ReturnType<typeof plate> | null = null;
  if (from && to && dirX !== 0 && p.mode !== 'count') {
    arcM = new Mesh(c.own(new TorusGeometry(1, 0.1, 6, 28, Math.PI)), colour(c, PAL.gold, { emissive: 0.7 }));
    arcM.position.set((X(from.x) + X(to.x)) / 2, 0.9, 1.2);
    arcM.scale.set(Math.abs(X(to.x) - X(from.x)) / 2, 0.001, 1);
    c.root.add(arcM);
    head = new Mesh(c.own(new ConeGeometry(0.4, 0.9, 6)), colour(c, PAL.gold, { emissive: 0.7 }));
    head.rotation.z = -dirX * (Math.PI / 2);
    head.position.set(X(to.x) - dirX * 0.5, 0.9, 1.2);
    c.root.add(head);
    dirTag = plate(c, dirX > 0 ? '→' : '←', 'win', (X(from.x) + X(to.x)) / 2, 3.9, 1.2, 1.8);
  }
  c.tick((a) => {
    tiles.forEach((t, i) => (t.scale.y = Math.max(pop((a.enter * 2 - i * 0.12) / 0.6), 0.001)));
    if (arcM && head && dirTag) {
      const g = win(a.e, 0.3, 0.7);
      arcM.scale.y = Math.max(2.0 * g, 0.001);
      head.scale.setScalar(Math.max(g, 0.001));
      head.position.y = 0.9 + 0.0;
      fit(dirTag, win(a.e, 0.5, 0.75));
    }
    icons.forEach((m, i) => m.scale.setScalar(Math.max(pop((a.enter * 2 - 0.2 - i * 0.12) / 0.6), 0.001)));
    if (ask) ask.scale.set(ask.userData.sx * (1 + 0.08 * Math.sin(a.t * 4)), ask.userData.sy * (1 + 0.08 * Math.sin(a.t * 4)), 1);
    if (from && to) {
      const f = win(a.e, 0.1, 0.7);
      walker.position.set(X(from.x + (to.x - from.x) * f), 0.4 + Math.abs(Math.sin(f * Math.PI * Math.max(Math.abs(to.x - from.x), 1))) * 0.6, 1.2);
    }
    nums.forEach((nn, i) => fit(nn.pl, win(a.e, 0.15 + i * 0.18, 0.28 + i * 0.18)));
    if (sel.length && p.mode === 'ring') {
      ring.visible = a.e > 0.2;
      ring.position.set(X(sel[0]!.x), 0.5, 0);
    }
    if (sel.length && a.ok && a.e > 0.9) sp.go(X(to!.x), 2, 0.8);
  });
}

/** One tank and the cans that fill it: the story's cans stand in a row with their litres on them; at the reveal each pours in and a running level counts up. */
export function tank1(c: Ctx, p: Extract<BayPlan, { kind: 'tanks' }>) {
  c.focus = true;
  const n = p.vals.length;
  const total = p.vals.reduce((s, v) => s + v, 0);
  const COL = [PAL.amber, PAL.teal, PAL.pink, PAL.lime];
  const frame = c.own(tankFrameGeo());
  const glass = c.own(new CylinderGeometry(0.88, 0.88, 3, 18, 1, true).translate(0, 1.7, 0));
  const liq = c.own(new CylinderGeometry(0.8, 0.8, 3, 18).translate(0, 1.7, 0));
  const tg = new Group();
  tg.scale.setScalar(1.7);
  const fm = new Mesh(frame, solid(c));
  fm.castShadow = true;
  const lq = new Mesh(liq, colour(c, '#4aa8ff', { emissive: 0.25, roughness: 0.3 }));
  const gl = new Mesh(glass, colour(c, '#d9f3ff', { opacity: 0.3, roughness: 0.05 }));
  tg.add(fm, lq, gl);
  [0.25, 0.5, 0.75, 1].forEach((q) => {
    const t = new Mesh(c.own(new BoxGeometry(1.0, 0.05, 0.05)), colour(c, '#ffffff', { emissive: 0.6 }));
    t.position.set(0, 2.94 * q, 0.9);
    t.scale.x = q === 0.5 || q === 1 ? 1.5 : 1;
    tg.add(t);
  });
  const SP = 3.9; // can spacing: a two digit plate over a can is about this wide at the largest stage
  const tx = n * 1.6 + 1.2;
  tg.position.set(tx, 0, 0);
  c.root.add(tg);
  const canPlates: ReturnType<typeof plate>[] = [];
  const cans = p.vals.map((v, i) => {
    const g = new Group();
    const body = new Mesh(c.own(new BoxGeometry(2.1, 2.6, 1.4)), colour(c, COL[i % 4]!, { roughness: 0.5 }));
    body.position.y = 1.3;
    body.castShadow = true;
    const lid = new Mesh(c.own(new BoxGeometry(2.3, 0.22, 1.6)), colour(c, '#2d2140'));
    lid.position.y = 2.7;
    g.add(body, lid);
    g.position.set(-tx / 2 + (i - (n - 1) / 2) * SP - 1.6, 0, 0.6);
    c.root.add(g);
    const cp = plate(c, `${v}`, 'q', g.position.x, 4.0, 0.9, D * 0.62);
    cp.userData.fixed = true; // a number stays over its own can
    canPlates.push(cp);
    return g;
  });
  void total;
  const sp = sparkles(c);
  const levels = p.vals.map((_, i) => p.vals.slice(0, i + 1).reduce((s, v) => s + v, 0));
  const run = p.total !== null ? levels.map((l, i) => plate(c, `${l}`, i === n - 1 ? 'win' : 'n', 0, 7.4, 0.9, 2.0)) : [];
  run.forEach((r) => (r.userData.seq = true));
  const ask = p.total === null ? plate(c, '?', 'q', 0, 7.4, 0.9, 2.4) : null;
  const cap = p.total !== null && p.capBig ? p.capBig : niceMax(total);
  c.tick((a) => {
    lq.scale.y = 0.02;
    cans.forEach((g, i) => {
      const w0 = 0.1 + i * 0.28;
      const f = win(a.e, w0, w0 + 0.22);
      const home = -tx / 2 + (i - (n - 1) / 2) * SP - 1.6;
      const { v, y } = arc(home, tx - 0.6, f, 3.2);
      g.position.set(p.total === null ? home : f > 0.98 ? home : v, p.total === null ? 0 : f > 0.98 ? 0 : y, 0.6); // after pouring a can returns to its place, empty
      g.rotation.z = p.total === null ? 0 : -Math.sin(Math.min(f * 1.5, 1) * Math.PI) * 1.1;
      g.scale.setScalar(Math.max(pop((a.enter * 2 - 0.1 - i * 0.2) / 0.5), 0.001));
    });
    let lvl = 0;
    if (p.total !== null) {
      p.vals.forEach((v, i) => (lvl += (v / cap) * win(a.e, 0.2 + i * 0.28, 0.38 + i * 0.28)));
    }
    lq.scale.y = Math.max(0.02, lvl * 0.92);
    run.forEach((r, i) => {
      const last = i === run.length - 1;
      fit(r, Math.max(win(a.e, 0.2 + i * 0.28, 0.3 + i * 0.28) - (last ? 0 : win(a.e, 0.42 + i * 0.28, 0.48 + i * 0.28)), 0.001));
    });
    if (ask) ask.scale.set(ask.userData.sx * (1 + 0.08 * Math.sin(a.t * 4)), ask.userData.sy * (1 + 0.08 * Math.sin(a.t * 4)), 1);
    if (p.total !== null && a.ok && a.e > 0.92) sp.go(0, 5.2, 0.9);
  });
}
const niceMax = (v: number) => {
  const m = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  return Math.ceil(v / (m / 2)) * (m / 2);
};

/** Number line as stepping stones: the marked number on a big stone with the rocket, a glowing "?" stone each side; the rocket hops onto the answer stone. */
export function stones(c: Ctx, p: Extract<BayPlan, { kind: 'track' }>) {
  c.focus = true;
  const mark = p.mark!;
  const ans = p.ans;
  const dir = ans === null ? 0 : Math.sign(ans - mark);
  const stone = c.own(new CylinderGeometry(1.25, 1.35, 0.4, 20));
  const mk = (x: number, tone: string) => {
    const m = new Mesh(stone, colour(c, tone, { roughness: 0.7 }));
    m.position.set(x, 0.2, 0);
    m.receiveShadow = true;
    c.root.add(m);
    return m;
  };
  const S = 3.2;
  const left = mk(-S, '#cfe3ff');
  const mid = mk(0, '#ffe0b8');
  const right = mk(S, '#cfe3ff');
  plate(c, `${mark}`, 'n', 0, 0.9, 1.5, 2.0);
  const qL = plate(c, '?', 'q', -S, 0.9, 1.5, 2.2);
  const qR = plate(c, '?', 'q', S, 0.9, 1.5, 2.2);
  const aTag = ans !== null ? plate(c, `${ans}`, 'win', dir * S, 0.9, 1.8, 2.4) : null;
  const rocket = new Mesh(c.own(rocketGeo()), solid(c));
  rocket.castShadow = true;
  const g = new Group();
  g.add(rocket);
  c.root.add(g);
  const sp = sparkles(c);
  c.tick((a) => {
    const f = ans === null ? 0 : win(a.e, 0.15, 0.6);
    const { v, y } = arc(0, dir * S, f, 2.2);
    g.position.set(v, 0.4 + y, 0);
    g.scale.setScalar(Math.max(pop((a.enter * 2 - 0.2) / 0.7), 0.001) * 1.1);
    [left, mid, right].forEach((m, i) => (m.scale.y = Math.max(pop((a.enter * 2 - i * 0.12) / 0.5), 0.001)));
    const pulse = 1 + 0.08 * Math.sin(a.t * 4);
    const hide = ans !== null ? 0.001 : 1; // the asked stone shows the answer at the reveal, the other "?" goes
    qL.scale.set(qL.userData.sx * pulse * hide, qL.userData.sy * pulse * hide, 1);
    qR.scale.set(qR.userData.sx * pulse * hide, qR.userData.sy * pulse * hide, 1);
    if (aTag) fit(aTag, win(a.e, 0.55, 0.75));
    if (ans !== null && a.ok && a.e > 0.7) sp.go(dir * S, 1.4, 0);
  });
}

/** A clock that fills the card: a short thick red hour hand, a long thin blue minute hand, the digital time written at the reveal. */
export function bigClock(c: Ctx, p: Extract<BayPlan, { kind: 'clock' }>) {
  c.focus = true;
  const cg = new Group(); // the clock leans back so its face looks up at the camera
  cg.rotation.x = -0.5;
  c.root.add(cg);
  const R = 3.2;
  const cy = 3.6;
  const face = new Mesh(c.own(new CylinderGeometry(R, R, 0.3, 40).rotateX(Math.PI / 2)), colour(c, '#fff8e6', { roughness: 0.5 }));
  face.position.set(0, cy, 0);
  face.castShadow = true;
  cg.add(face);
  const rim = new Mesh(c.own(new TorusGeometry(R, 0.2, 8, 40)), colour(c, '#e8b04a', { roughness: 0.4 }));
  rim.position.set(0, cy, 0.05);
  cg.add(rim);
  const post = new Mesh(c.own(new BoxGeometry(0.7, cy, 0.6)), colour(c, '#9b6633'));
  post.position.set(0, cy / 2 - 0.3, -0.3);
  cg.add(post);
  const marks = counted(c, new BoxGeometry(0.16, 0.5, 0.1), colour(c, '#2d2140'), 12);
  marks.mesh.userData.counted = false;
  marks.mesh.removeFromParent();
  cg.add(marks.mesh);
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    marks.set(k, Math.sin(a) * (R - 0.55), cy + Math.cos(a) * (R - 0.55), 0.25, 1, 0);
  }
  marks.mesh.rotation.z = 0;
  for (const k of [0, 3, 6, 9]) {
    const a = (k * Math.PI) / 6;
    cg.add(plate(c, `${k === 0 ? 12 : k}`, 'n', Math.sin(a) * (R - 1.3), cy + Math.cos(a) * (R - 1.3), 0.5, 1.5));
  }
  marks.commit();
  const hand = (len: number, w: number, hex: string, z: number) => {
    const g = new Group();
    const b = new Mesh(c.own(new BoxGeometry(w, len, 0.16)), colour(c, hex, { roughness: 0.4, emissive: 0 }));
    b.position.y = len / 2 - 0.2;
    g.add(b);
    g.position.set(0, cy, z);
    cg.add(g);
    return { g, b };
  };
  const hh = hand(1.7, 0.42, PAL.red, 0.28);
  const mh = hand(2.7, 0.2, '#3d6fd1', 0.4);
  const hub = new Mesh(c.own(new SphereGeometry(0.26, 10, 8)), colour(c, PAL.ink));
  hub.position.set(0, cy, 0.5);
  cg.add(hub);
  const clkMin = (p.hour % 12) * 60 + p.minute;
  const hourA = ((p.hour % 12) + p.minute / 60) * 30;
  const minA = p.minute * 6;
  const dig = p.minute === 0 ? `${p.hour}:00` : `${p.hour}:${String(p.minute).padStart(2, '0')}`;
  const d = p.dur ?? null;
  // a duration question: the elapsed span is a lit sector of the face, the hands run along it, the length and the end clock are written
  const fromA = d ? ((d.from % 720) / 720) * 360 : 0;
  const toA = d ? fromA + Math.min((d.mins / 720) * 360, 350) : 0;
  let wedge: Mesh | null = null;
  if (d) {
    wedge = new Mesh(c.own(new RingGeometry(R * 0.3, R * 0.78, 40, 1, ((90 - toA) * Math.PI) / 180, ((toA - fromA) * Math.PI) / 180)), colour(c, PAL.gold, { emissive: 0.5, opacity: 0.55 }));
    wedge.position.set(0, cy, 0.2);
    cg.add(wedge);
  }
  const digital = plate(c, d ? (d.asked === 'end' ? d.end : d.label) : dig, 'win', 0, cy - R - 1.0, 0.8, 2.2);
  const lenTag = d && d.asked === 'end' ? plate(c, d.label, 'out', R * 0.55, cy + R * 0.2, 0.9, 1.5) : d ? plate(c, d.end, 'n', R * 0.55, cy + R * 0.2, 0.9, 1.5) : null;
  const sp = sparkles(c);
  c.tick((a) => {
    const sweep = ease(a.enter * 1.6 - 0.1);
    const run = d ? ease((a.e - 0.1) / 0.6) : 0;
    const hA = d && d.from === clkMin ? hourA + (toA - hourA) * run : hourA;
    const mA = d && d.from === clkMin ? minA + (d.mins * 6) * run : minA;
    hh.g.rotation.z = (-hA * Math.PI * sweep) / 180;
    mh.g.rotation.z = (-mA * Math.PI * sweep) / 180;
    if (wedge) {
      wedge.scale.setScalar(Math.max(run, 0.001));
      (wedge.material as import('three').MeshStandardMaterial).opacity = 0.55 * run;
    }
    if (lenTag) fit(lenTag, win(a.e, 0.5, 0.7));
    const pulse = 1 + 0.12 * Math.sin(a.t * 6) * ease(a.e * 2);
    hh.b.scale.x = pulse;
    mh.b.scale.x = pulse;
    fit(digital, win(a.e, 0.2, 0.45));
    if (p.view === 'pad' && a.ok && a.e > 0.5) sp.go(0, cy + R, 0.8);
  });
}

/** n things to share: the heap at the question (a deal also shows its empty holders); the reveal sends every item into one of N separate, evenly spaced, labelled trays, the leftovers into a tray of their own. */
export function heapShare(c: Ctx, p: Extract<BayPlan, { kind: 'share' }>) {
  c.focus = true;
  c.pitch = 1.3;
  const { a: total, b, deal } = p;
  const R = p.holders !== null;
  const H = deal ? b : Math.floor(total / b); // groups
  const per = deal ? Math.floor(total / b) : b;
  const rest = total - H * per;
  const T = H + (rest ? 1 : 0);
  const sol = solid(c);
  const items = counted(c, tokenGeo(p.token), sol, total);
  c.expect = total;
  // tray grid
  const tcols = T <= 4 ? T : Math.ceil(T / 2);
  const trows = Math.ceil(T / tcols);
  const cw = 11.4 / tcols;
  const cd = trows > 1 ? 3.6 : 4.2;
  const tx = (t: number) => ((t % tcols) - (tcols - 1) / 2) * cw;
  const tz = (t: number) => (Math.floor(t / tcols) - (trows - 1) / 2) * cd + 0.6;
  const inW = cw - 0.5;
  const inD = cd - 0.9;
  const trayItems = (n: number) => {
    const k = Math.max(1, Math.min(n, Math.ceil(Math.sqrt((n * inW) / inD))));
    const rows = Math.ceil(n / k);
    const s = Math.min(inW / k, inD / rows, 1.1);
    return { k, rows, s };
  };
  const big = Math.max(per, rest);
  const ti = trayItems(big);
  const slot = (j: number) => ({ x: ((j % ti.k) - (ti.k - 1) / 2) * ti.s, z: (Math.floor(j / ti.k) - (ti.rows - 1) / 2) * ti.s });
  const itemSc = Math.max(0.8, Math.min(2.2, ti.s * 1.5));
  // heap layout of the question
  const hc = Math.max(1, Math.ceil(Math.sqrt(total * 1.8)));
  const hr = Math.ceil(total / hc);
  const hs = Math.min(11 / hc, 6 / hr, 1.0);
  const heapPos = (k: number) => ({ x: ((k % hc) - (Math.min(hc, total - Math.floor(k / hc) * hc) - 1) / 2) * hs, z: (Math.floor(k / hc) - (hr - 1) / 2) * hs + 0.6 });
  const heapSc = Math.max(0.8, Math.min(2.4, hs * 1.5));
  // trays
  const trayGeo = c.own(new BoxGeometry(cw - 0.35, 0.22, cd - 0.55));
  const trays = Array.from({ length: T }, (_, t) => {
    const m = new Mesh(trayGeo, colour(c, t >= H ? PAL.amber : t % 2 ? PAL.gold : PAL.teal, { emissive: t >= H ? 0.3 : 0.18, opacity: 0.85 }));
    m.position.set(tx(t), 0.11, tz(t));
    m.receiveShadow = true;
    c.root.add(m);
    return m;
  });
  const holderFig = deal && (p.holder === 'crew' || p.holder === 'person') ? Array.from({ length: H }, (_, t) => {
    const m = new Mesh(c.own(tokenGeo('person').scale(1.7, 1.7, 1.7)), sol);
    m.position.set(tx(t) - cw / 2 + 0.6, 0.2, tz(t));
    m.castShadow = true;
    c.root.add(m);
    return m;
  }) : [];
  const totalTag = plate(c, `${total}`, 'q', 0, 3.0, tz(0) - 0.6, D);
  const perTags = Array.from({ length: H }, (_, t) => plate(c, `${per}`, t === 0 && !R ? 'q' : 'n', tx(t), 1.5, tz(t) + cd / 2 - 0.2, 1.3));
  const restTag = R && rest ? plate(c, `+${rest}`, 'win', tx(H), 1.6, tz(H) + cd / 2 - 0.2, 1.5) : null;
  const sumTag = R ? plate(c, p.asked != null ? `${p.asked}` : deal ? `${per}` : `${H}`, 'win', 0, 4.6, tz(0) - 0.6, 1.8) : null;
  const sp = sparkles(c);
  c.tick((a) => {
    const enter = a.enter;
    for (let k = 0; k < total; k++) {
      const hp = heapPos(k);
      let x = hp.x;
      let y = 0;
      let z = hp.z;
      let sc = heapSc * pop((enter * 2 - 0.1 - k * Math.min(0.012, 0.85 / total)) / 0.5);
      if (R) {
        const t = k < H * per ? Math.floor(k / per) : H;
        const j = k < H * per ? k % per : k - H * per;
        const dest = slot(j);
        const f = ease((a.e * 3.2 - 0.3 - k * Math.min(0.05, 2.0 / total)) / 0.7);
        x += (tx(t) + dest.x - x) * f;
        z += (tz(t) + dest.z - z) * f;
        y = Math.sin(f * Math.PI) * 2.6 + f * 0.25;
        sc *= 1 + (itemSc / heapSc - 1) * f;
      }
      items.set(k, x, y, z, Math.max(sc, 0.001));
    }
    items.commit();
    trays.forEach((m, t) => {
      const shown = R ? win(a.e, 0.05 + t * 0.04, 0.22 + t * 0.04) : deal ? (t < H ? pop(enter * 2 - 0.2) : 0) : t === 0 ? pop(enter * 2 - 0.2) : 0;
      m.visible = shown > 0.02;
      m.scale.setScalar(Math.max(shown, 0.001));
    });
    holderFig.forEach((m, t) => m.scale.setScalar(Math.max(deal ? (R ? win(a.e, 0.05 + t * 0.04, 0.22 + t * 0.04) : pop(enter * 2 - 0.2)) : 0, 0.001)));
    perTags.forEach((q, t) => fit(q, R ? win(a.e, 0.35 + t * 0.03, 0.45 + t * 0.03) : t === 0 && !deal ? 1 : 0.001));
    if (R) fit(totalTag, Math.max(1 - win(a.e, 0.3, 0.45), 0.001));
    if (restTag) fit(restTag, win(a.e, 0.7, 0.9));
    if (sumTag) fit(sumTag, win(a.e, 0.8, 0.95));
    if (R && a.ok && a.e > 0.95) sp.go(0, 3.4, tz(0));
  });
}

/** A map of several rows: a board that leans toward the camera, one big tile per cell with its icon and its name, the column numbers under it and the row numbers beside it (one numbering). The reveal walks, counts or rings. */
export function map2d(c: Ctx, p: Extract<BayPlan, { kind: 'grid' }>) {
  c.focus = true;
  const { cols, rows } = p;
  const sx = 3.4;
  const sy = 3.6;
  const X = (x: number) => (x - 1 - (cols - 1) / 2) * sx;
  const Y = (y: number) => ((rows - 1) / 2 - (y - 1)) * sy;
  const g = new Group();
  g.rotation.x = -0.555;
  g.position.set(0, (rows * sy) / 2 + 0.8, 0);
  c.root.add(g);
  const sol = solid(c);
  const sp = sparkles(c);
  const board = new Mesh(c.own(new BoxGeometry(cols * sx + 1, rows * sy + 0.6, 0.3)), colour(c, '#fff8e6', { opacity: 0.6, roughness: 0.9 }));
  board.position.set(0, 0, -0.4);
  g.add(board);
  const tiles: Mesh[] = [];
  const icons: Mesh[] = [];
  for (let y = 1; y <= rows; y++) {
    for (let x = 1; x <= cols; x++) {
      const t = new Mesh(c.own(new BoxGeometry(sx - 0.35, sy - 0.5, 0.2)), colour(c, '#' + ROOM_TINT[(x + y) % 6]!.toString(16).padStart(6, '0'), { roughness: 0.8 }));
      t.position.set(X(x), Y(y), 0);
      g.add(t);
      tiles.push(t);
      const cl = p.cells.find((q) => q.x === x && q.y === y);
      if (cl) {
        const ic = new Mesh(c.own(tokenGeo(roomToken(cl.label)).rotateX(Math.PI / 2).scale(2.2, 2.2, 2.2)), sol);
        ic.position.set(X(x), Y(y) + 0.1, 0.2);
        g.add(ic);
        icons.push(ic);
        if (cl.label) g.add(plate(c, cl.label, 'q', X(x), Y(y) - sy * 0.3, 0.7, 1.25, 9));
      }
    }
  }
  for (let x = 1; x <= cols; x++) g.add(plate(c, `${x}`, 'out', X(x), Y(rows) - sy * 0.62, 0.5, 1.25)); // the axes are pink, the counted steps gold
  for (let y = 1; y <= rows; y++) g.add(plate(c, `${y}`, 'out', X(1) - sx * 0.62, Y(y), 0.5, 1.25));
  const sel = p.sel.map((k) => p.cells[k]!);
  const from = sel[0];
  const to = sel[1] ?? sel[sel.length - 1];
  const walker = new Mesh(c.own(tokenGeo('person').rotateX(Math.PI / 2).scale(2.4, 2.4, 2.4)), sol);
  walker.visible = p.mode === 'path' && !!from;
  g.add(walker);
  const route: { x: number; y: number }[] = [];
  if (p.mode === 'rover' && p.legs && sel[0]) {
    route.push({ x: sel[0].x, y: sel[0].y });
    for (let k = 1; k <= Math.abs(p.legs.right); k++) route.push({ x: sel[0].x + Math.sign(p.legs.right) * k, y: sel[0].y });
    for (let k = 1; k <= Math.abs(p.legs.down); k++) route.push({ x: sel[0].x + p.legs.right, y: sel[0].y + Math.sign(p.legs.down) * k });
  }
  if (route.length) walker.visible = true;
  const tiny = (c.h ?? 300) < 230; // a very short stage: rings instead of digits on the counted cells
  const counted = p.mode === 'count' ? sel : route.slice(1);
  const rings = tiny ? counted.map((q) => {
    const r = new Mesh(c.own(new TorusGeometry(1.2, 0.12, 6, 20)), colour(c, PAL.gold, { emissive: 0.7 }));
    r.position.set(X(q.x), Y(q.y), 0.4);
    r.visible = false;
    g.add(r);
    return r;
  }) : [];
  const nums = (tiny ? [] : counted).map((q, i) => {
    const pl = plate(c, `${i + 1}`, 'win', X(q.x), Y(q.y) + sy * 0.28 + (i % 2) * sy * 0.5, 0.9, 1.25); // small digits, alternately high and low: neighbours never touch
    g.add(pl);
    return { q, pl };
  });
  // a "path" question: a gold arrow from the first cell to the last, and its direction written on it
  const pathArrow = p.mode === 'path' && from && to && (from.x !== to.x || from.y !== to.y)
    ? (() => {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const horiz = Math.abs(dx) >= Math.abs(dy);
        const len = Math.hypot(X(to.x) - X(from.x), Y(to.y) - Y(from.y));
        const bar = new Mesh(c.own(new BoxGeometry(horiz ? len : 0.35, horiz ? 0.35 : len, 0.14)), colour(c, PAL.gold, { emissive: 0.6 }));
        bar.position.set((X(from.x) + X(to.x)) / 2, (Y(from.y) + Y(to.y)) / 2, 0.35);
        const hd = new Mesh(c.own(new ConeGeometry(0.6, 1.1, 6)), colour(c, PAL.gold, { emissive: 0.6 }));
        hd.position.set(X(to.x), Y(to.y), 0.35);
        hd.rotation.z = horiz ? (dx > 0 ? -Math.PI / 2 : Math.PI / 2) : dy > 0 ? Math.PI : 0;
        bar.visible = false;
        hd.visible = false;
        g.add(bar, hd);
        const glyph = horiz ? (dx > 0 ? '→' : '←') : dy > 0 ? '↓' : '↑';
        const tag = plate(c, glyph, 'win', (X(from.x) + X(to.x)) / 2 + (horiz ? 0 : sx * 0.8), (Y(from.y) + Y(to.y)) / 2 + (horiz ? sy * 0.8 : 0), 0.9, 1.8);
        g.add(tag);
        return { bar, hd, tag };
      })()
    : null;
  // the walked path as a gold line along the cells
  const segs = route.slice(1).map((q, i) => {
    const a0 = route[i]!;
    const horiz = q.y === a0.y;
    const m = new Mesh(c.own(new BoxGeometry(horiz ? Math.abs(X(q.x) - X(a0.x)) + 0.3 : 0.3, horiz ? 0.3 : Math.abs(Y(q.y) - Y(a0.y)) + 0.3, 0.14)), colour(c, PAL.gold, { emissive: 0.6 }));
    m.position.set((X(q.x) + X(a0.x)) / 2, (Y(q.y) + Y(a0.y)) / 2, 0.3);
    m.visible = false;
    g.add(m);
    return m;
  });
  const ring = new Mesh(c.own(new TorusGeometry(1.4, 0.1, 6, 24)), colour(c, PAL.gold, { emissive: 0.7 }));
  ring.visible = false;
  g.add(ring);
  const roverTot = p.mode === 'rover' && p.ans !== null ? plate(c, `${p.ans}`, 'win', X(cols), Y(0.4), 1.2, 1.8) : null;
  if (roverTot) g.add(roverTot);
  const ask = p.target !== null ? p.cells[p.target]! : null;
  const askP = ask ? plate(c, '?', 'q', X(ask.x), Y(ask.y), 0.9, 2.2) : null;
  if (askP) g.add(askP);
  c.tick((a) => {
    tiles.forEach((t, i) => t.scale.setScalar(Math.max(pop((a.enter * 2 - i * 0.05) / 0.6), 0.001)));
    icons.forEach((m, i) => m.scale.setScalar(Math.max(pop((a.enter * 2 - 0.2 - i * 0.08) / 0.6), 0.001)));
    if (from && to && p.mode === 'path') {
      const f = win(a.e, 0.1, 0.7);
      walker.position.set(X(from.x + (to.x - from.x) * f), Y(from.y + (to.y - from.y) * f), 0.5 + Math.abs(Math.sin(f * Math.PI * 3)) * 0.4);
    }
    if (route.length > 1) {
      const f = win(a.e, 0.1, 0.8) * (route.length - 1);
      const k = Math.min(Math.floor(f), route.length - 2);
      const A0 = route[k]!;
      const B0 = route[k + 1]!;
      walker.position.set(X(A0.x + (B0.x - A0.x) * (f - k)), Y(A0.y + (B0.y - A0.y) * (f - k)), 0.5);
    }
    if (roverTot) fit(roverTot, win(a.e, 0.7, 0.9));
    if (pathArrow) {
      const g2 = win(a.e, 0.2, 0.6);
      pathArrow.bar.visible = g2 > 0.05;
      pathArrow.hd.visible = g2 > 0.8;
      fit(pathArrow.tag, win(a.e, 0.5, 0.75));
    }
    segs.forEach((m, i) => (m.visible = a.e > 0.1 + (i / Math.max(segs.length, 1)) * 0.7));
    rings.forEach((r, i) => (r.visible = a.e > 0.15 + i * 0.18));
    nums.forEach((nn, i) => fit(nn.pl, win(a.e, 0.15 + i * 0.18, 0.28 + i * 0.18)));
    if (sel.length && p.mode === 'ring') {
      ring.visible = a.e > 0.2;
      ring.position.set(X(sel[0]!.x), Y(sel[0]!.y), 0.4);
    }
    if (sel.length && a.ok && a.e > 0.9) sp.go(0, (rows * sy) / 2 + 1, 1);
  });
}
