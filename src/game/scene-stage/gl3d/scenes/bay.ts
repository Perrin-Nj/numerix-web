// The rocket bay scenes: glass tanks (gauge bars), numbered rockets (tag rows) and a counted share into crates.
import { AdditiveBlending, SphereGeometry, type Sprite, BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, MathUtils, Mesh, MeshBasicMaterial, type Object3D, MeshStandardMaterial, PointLight } from 'three';
import type { Ctx } from '../engine';
import { crateGeo, rocketGeo, tankFrameGeo, tokenGeo } from '../geo';
import { PAL, colour, counted, ease, fit, mesh, plate, pop, solid, sparkles } from '../kit';
import type { BayPlan } from '../plan';

type P<K extends BayPlan['kind']> = Extract<BayPlan, { kind: K }>;

/** Glass tank factory shared by the gauge scenes: steel frame, liquid (scaled from the bottom), glass. */
export function tankKit(c: Ctx) {
  const frame = c.own(tankFrameGeo());
  const glass = c.own(new CylinderGeometry(0.88, 0.88, 3, 16, 1, true).translate(0, 1.7, 0));
  const liq = c.own(new CylinderGeometry(0.8, 0.8, 3, 16).translate(0, 1.7, 0));
  const sol = solid(c);
  const tick = c.own(new BoxGeometry(1.0, 0.05, 0.05));
  const tickMat = colour(c, '#ffffff', { emissive: 0.6 });
  const gl = c.own(new MeshStandardMaterial({ color: '#d9f3ff', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false, side: DoubleSide }));
  return (color: string) => {
    const g = new Group();
    const f = new Mesh(frame, sol);
    f.castShadow = true;
    const l = new Mesh(liq, colour(c, color, { emissive: 0.25, roughness: 0.3 }));
    g.add(f, l, new Mesh(glass, gl));
    // graduation: a tick at a quarter, a half, three quarters and the top of the capacity (the liquid rises to 0.92 of the glass)
    [0.25, 0.5, 0.75, 1].forEach((q) => {
      const t = new Mesh(tick, tickMat);
      t.position.set(0, 2.94 * q, 0.9);
      t.scale.x = q === 0.5 || q === 1 ? 1.5 : 1;
      g.add(t);
    });
    g.position.z = 0.8;
    c.root.add(g);
    return { g, l };
  };
}

export function tanks(c: Ctx, p: P<'tanks'>) {
  const mk = tankKit(c);
  const sp = sparkles(c);
  const COL = [PAL.amber, PAL.teal, PAL.pink, PAL.lime];
  const n = p.vals.length;
  const smalls = p.vals.map((v, i) => ({ ...mk(COL[i % 4]!), v, tag: plate(c, `${v} L`, 'q', 0, 4.9, 0.8) }));
  const big = p.total !== null ? { ...mk(PAL.gold), tag: plate(c, `${p.total} L`, 'win', 4.3, 5.8, 0.4, 1.2) } : null;
  if (big) big.g.position.set(4.3, 0, 0.4);
  let fired = false;
  c.tick((a) => {
    smalls.forEach((s, i) => {
      const x = (i - (n - 1) / 2) * 2.3 - 2.0 * ease(a.e * 2.5);
      s.g.position.x = x;
      s.tag.position.x = x;
      s.g.scale.setScalar(Math.max(pop((a.enter * 2 - 0.2 - i * 0.2) / 0.7), 0.001));
      s.l.scale.y = Math.max(0.02, (s.v / p.capSmall) * ease(a.enter * 2 - 0.5) * 0.92);
    });
    if (big && p.total !== null && p.capBig) {
      big.g.scale.setScalar(Math.max(pop(a.e * 2.2 - 0.3), 0.001) * 1.3);
      big.l.scale.y = Math.max(0.02, (p.total / p.capBig) * ease(a.e * 1.4 - 0.45) * 0.92);
      if (!fired && a.ok && a.e > 0.8) {
        fired = true;
        sp.go(4.3, 4.2, 0.4);
      }
    }
  });
}

/** Cards with long texts (times, sums, rooms, descriptions): one row per card on a board that leans toward the camera (equal depth, one x per column): the object at the left, its text on a plate, the partner text further right; the reveal slides the rows into rank order. */
function tagsList(c: Ctx, p: P<'tags'>) {
  const n = p.labels.length;
  const rockety = p.token === 'mini';
  const geo = c.own(rockety ? rocketGeo().scale(0.5, 0.5, 0.5) : tokenGeo(p.token).scale(1.7, 1.7, 1.7));
  const sol = solid(c);
  const narrow = (c.aspect ?? 1.7) < 1.5;
  const xf = narrow ? 0.6 : 1; // narrow stage: the columns of the list come closer
  const asp = c.aspect ?? 1.7;
  const ps = (c.h ?? 300) > 400 ? 0.95 : 1.25; // a tall stage makes every plate big: the list plates stay smaller
  const tiny = (c.h ?? 300) < 230 && !p.pair; // a very short stage: one-line plates
  const wrapN = tiny ? 34 : asp < 1.3 ? 16 : narrow ? 22 : 26;
  const gap = 3.0 + 0.9 * (Math.max(...[...p.labels, ...(p.pair ?? [])].map((t) => Math.ceil(t.length / wrapN)), 1) - 1);
  let rk = 1; // the engine stretches the rows when its plates are taller than the row pitch at this zoom, the columns when they are wider
  let sk = 1;
  const yOf = (i: number) => (((n - 1 - i) - (n - 1) / 2) * gap) * rk;
  const g = new Group();
  g.rotation.x = -0.555;
  g.position.set(0, (n * gap) / 2 + 0.6, 0);
  c.root.add(g);
  const board = new Mesh(c.own(new BoxGeometry(17 * xf, n * gap + 0.8, 0.4)), colour(c, '#fff8e6', { opacity: 0.55, roughness: 0.9 }));
  board.position.set(0, 0, -0.6);
  g.add(board);
  const sp = sparkles(c);
  const rows = p.labels.map((t, i) => {
    // "4 groupes de 5": the row's object is its groups, drawn as that many small stacks
    const gm = /^(\d+) groupes? de (\d+)/i.exec(t);
    const m: Object3D = gm ? new Group() : new Mesh(geo, sol);
    if (gm) {
      const ng = Math.min(Number(gm[1]), 5);
      for (let k = 0; k < ng; k++) {
        const b = new Mesh(c.own(new BoxGeometry(0.65, 0.45, 0.65)), colour(c, k % 2 ? PAL.gold : PAL.teal, { emissive: 0.2 }));
        b.position.set((k - (ng - 1) / 2) * 0.78, 0, 0);
        m.add(b);
      }
    }
    m.castShadow = true;
    g.add(m);
    const lab = plate(c, t, p.win === i ? 'win' : 'q', 0, 0, 0.6, ps, wrapN);
    const par = p.pair?.[i] ? plate(c, `= ${p.pair[i]}`, 'win', 0, 0, 0.6, ps, wrapN) : null;
    const rk2 = p.rank && !p.pair?.[i] ? plate(c, `${p.rank[i]! + 1}`, 'win', 0, 0, 0.6, ps) : null;
    g.add(lab);
    if (par) g.add(par);
    if (rk2) g.add(rk2);
    return { m, lab, par, rk: rk2, to: p.rank ? p.rank[i]! : i };
  });
  const fixedPlates = rows.flatMap((r) => [r.lab, ...(r.par ? [r.par] : []), ...(r.rk ? [r.rk] : [])]);
  fixedPlates.forEach((pl) => (pl.userData.fixed = true));
  const pairs = rows.flatMap((r) => [...(r.par ? [[r.lab, r.par] as [Sprite, Sprite]] : []), ...(r.rk ? [[r.rk, r.lab] as [Sprite, Sprite]] : [])]);
  c.cols = {
    left: rows.map((r) => r.lab),
    right: rows.flatMap((r) => (r.par ? [r.par] : [])),
    pairs,
    setPitch: (k) => {
      rk *= k;
      board.scale.y = rk;
    },
    setSpread: (k) => {
      sk *= k;
      board.scale.x = sk;
    },
  };
  const ansTag = p.ans !== null && p.ans !== undefined ? plate(c, `${p.ans}`, 'win', 0, 0, 0.6, 1.5) : null;
  let fired = false;
  c.tick((a) => {
    rows.forEach((r, i) => {
      const y = yOf(i) + (yOf(r.to) - yOf(i)) * ease(a.e * 1.6);
      r.m.position.set(-7.0 * xf * sk, y - 0.5, 0.2);
      r.m.scale.setScalar(Math.max(pop((a.enter * 2 - 0.1 - i * 0.15) / 0.5), 0.001));
      r.lab.position.set(-1.6 * xf * sk, y, 0.6);
      if (r.par) {
        r.par.position.set(5.0 * xf * sk, y, 0.6);
        fit(r.par, ease(a.e * 2 - 0.5 - i * 0.12));
      }
      if (r.rk) {
        r.rk.position.set(-8.4 * xf * sk, y, 0.6);
        fit(r.rk, ease(a.e * 2 - 0.4 - i * 0.12));
      }
    });
    if (ansTag) {
      ansTag.position.set(0, yOf(0) + gap * rk, 0.6);
      fit(ansTag, ease(a.e * 2 - 0.9));
    }
    if (!fired && a.ok && a.e > 0.7 && (p.rank || p.pair)) {
      fired = true;
      sp.go(0, 2, 0.6);
    }
  });
}

/** A match (relie): the source cards in a left column, the partner cards in a right column, equal rows; at the reveal a connector grows from each source to its partner and each pair takes its own colour. */
function matchBoard(c: Ctx, p: P<'tags'>) {
  const n = p.labels.length;
  const right = p.right!;
  const lines = Math.max(...[...p.labels, ...right].map((t) => Math.ceil(t.length / ((c.aspect ?? 1.7) < 1.5 ? 11 : 14))), 1);
  const rowH = 3.2 + 1.1 * (lines - 1); // taller rows for longer cards: the plates keep their legible size, so the rows must grow
  let rk = 1; // the engine stretches the rows when its plates are taller than the row pitch at this zoom
  const yOf = (i: number) => ((n - 1 - i) * rowH - ((n - 1) * rowH) / 2) * rk; // local to the board, which leans back so its plane is square to the camera: equal depth, one x per column
  const narrow = (c.aspect ?? 1.7) < 1.5; // a tall or squarish stage: closer columns, no icons
  let sk = 1; // column spread, widened by the engine when the plates are wider than the gap between the columns
  const LX = () => (narrow ? -3.3 : -5.2) * sk;
  const RX = () => (narrow ? 3.3 : 5.2) * sk;
  const g = new Group();
  g.rotation.x = -0.555;
  g.position.set(0, (n * rowH) / 2 + 0.6, 0);
  c.root.add(g);
  const COL = ['#ff8a5c', '#4fd1c5', '#a58bff', '#ffd166', '#6bbf4a', '#ff8fb1'];
  const board = new Mesh(c.own(new BoxGeometry(narrow ? 11.5 : 17.5, n * rowH + 0.8, 0.4)), colour(c, '#fff8e6', { opacity: 0.55, roughness: 0.9 }));
  board.position.set(0, 0, -0.6);
  g.add(board);
  const geo = c.own(tokenGeo(p.token).scale(1.6, 1.6, 1.6));
  const sol = solid(c);
  const sp = sparkles(c);
  const toks: Mesh[] = [];
  const left = p.labels.map((t, i) => {
    const m = new Mesh(geo, sol);
    m.position.set(LX() - 3.6, yOf(i) - 0.5, 0.2);
    m.visible = !narrow;
    toks.push(m);
    g.add(m);
    const pl = plate(c, t, 'q', LX(), yOf(i), 0.6, 1.25, narrow ? 11 : 14);
    g.add(pl);
    return pl;
  });
  const rightP = right.map((t, j) => {
    const pl = plate(c, t, 'q', RX(), yOf(j), 0.6, 1.25, narrow ? 11 : 14);
    g.add(pl);
    return pl;
  });
  left.concat(rightP).forEach((pl) => (pl.userData.fixed = true)); // the rows of a board are laid out, never nudged
  c.cols = {
    left,
    right: rightP,
    margin: 0.24,
    pairs: left.map((l, i) => [l, rightP[i]!] as [Sprite, Sprite]),
    setPitch: (k) => {
      rk *= k;
      left.forEach((pl, i) => (pl.position.y = yOf(i)));
      rightP.forEach((pl, j) => (pl.position.y = yOf(j)));
      toks.forEach((m, i) => (m.position.y = yOf(i) - 0.5));
      board.scale.y = rk;
    },
    setSpread: (k) => {
      sk *= k;
      left.forEach((pl) => (pl.position.x = LX()));
      rightP.forEach((pl) => (pl.position.x = RX()));
      toks.forEach((m) => (m.position.x = LX() - 3.6));
      board.scale.x = sk;
    },
  };
  const links = (p.pairTo ?? []).map((j, i) => {
    const col = COL[i % COL.length]!;
    const bar = new Mesh(c.own(new BoxGeometry(1, 0.22, 0.22)), colour(c, col, { emissive: 0.6 }));
    const dot = (x: number, y: number) => {
      const d = new Mesh(c.own(new SphereGeometry(0.34, 10, 8)), colour(c, col, { emissive: 0.5 }));
      d.position.set(x, y, 0.7);
      g.add(d);
      return d;
    };
    g.add(bar);
    return { bar, i, j, d1: dot(LX() + (narrow ? 1.5 : 2.2), yOf(i)), d2: dot(RX() - (narrow ? 1.5 : 2.2), yOf(j)) };
  });
  c.root.userData.links = links.length; // read by the alignment report: a revealed match must draw one connector per card
  let fired = false;
  c.tick((a) => {
    left.forEach((l, i) => fit(l, ease(a.enter * 2 - 0.1 - i * 0.12)));
    rightP.forEach((r, j) => fit(r, ease(a.enter * 2 - 0.2 - j * 0.12)));
    links.forEach((k) => {
      const f = ease(a.e * 2.2 - 0.2 - k.i * 0.25);
      const d = c.dist?.() ?? 14;
      const x0 = LX() + (left[0]!.scale.x / 2) * d + 0.2; // from the inner edge of the left plate to the inner edge of the right one
      const x1 = RX() - (rightP[0]!.scale.x / 2) * d - 0.2;
      const y0 = yOf(k.i);
      const y1 = yOf(k.j);
      const len = Math.hypot(x1 - x0, y1 - y0) * f;
      k.bar.visible = f > 0.01;
      k.bar.scale.x = Math.max(len, 0.001);
      k.bar.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      k.bar.position.set(x0 + ((x1 - x0) * f) / 2, y0 + ((y1 - y0) * f) / 2, 0.7);
      k.d1.visible = k.d2.visible = f > 0.01;
      k.d1.position.set(x0, y0, 0.7);
      k.d2.position.set(x1, y1, 0.7);
    });
    if (!fired && a.ok && links.length && a.e > 0.85) {
      fired = true;
      sp.go(0, yOf(0), 0.7);
    }
  });
}

/** Stations told by a number each ("Labo, 4 cases", "Dock, colonne 4"): they stand in the order of the cards at the question; the reveal slides each one to its place on a ruler, at its number, so distance and order are seen, not only written. */
function tagsAxis(c: Ctx, p: P<'tags'>, vals: number[]) {
  c.focus = true;
  c.pitch = 1.15;
  const n = p.labels.length;
  const geo = c.own(tokenGeo(p.token).scale(2.4, 2.4, 2.4));
  const sol = solid(c);
  const mx = Math.max(...vals);
  const X = (v: number) => -5.4 + (10.8 * v) / Math.max(mx, 1);
  const eq = (i: number) => -5.4 + (10.8 * (i + 0.5)) / n;
  const slab = mesh(c, new BoxGeometry(12.4, 0.2, 1.8), colour(c, '#4a3f66', { roughness: 0.7 }));
  slab.position.set(0, 0.1, 0.4);
  const ticks = counted(c, new BoxGeometry(0.1, 0.12, 1.1), colour(c, '#ffffff', { roughness: 0.5 }), mx + 1);
  ticks.mesh.userData.counted = false;
  for (let v = 0; v <= mx; v++) ticks.set(v, X(v), 0.22, 0.4, 1);
  ticks.commit();
  plate(c, '0', 'n', X(0), 0.3, 1.7, 1);
  const wrap = (c.aspect ?? 1.7) < 1.5 ? 11 : 16;
  const items = p.labels.map((t, i) => {
    const m = new Mesh(geo, sol);
    m.castShadow = true;
    c.root.add(m);
    const tag = plate(c, t, 'q', eq(i), 3.4, 0.6, 1.2, wrap);
    const num = p.rank ? plate(c, `${vals[i]}`, 'win', X(vals[i]!), 0.3, 1.7, 1.1) : null;
    return { m, tag, num, v: vals[i]! };
  });
  const order = p.rank ? [...items].sort((a, b) => a.v - b.v) : items;
  void order;
  const sp = sparkles(c);
  let fired = false;
  c.tick((a) => {
    const f = p.rank ? ease(a.e * 1.6) : 0;
    items.forEach((it, i) => {
      const px = eq(i) + (X(it.v) - eq(i)) * f;
      it.m.position.set(px, 0.3 + Math.sin(f * Math.PI) * 0.6, 0.4);
      it.m.scale.setScalar(Math.max(pop((a.enter * 2 - 0.1 - i * 0.15) / 0.5), 0.001));
      it.tag.position.set(px, 3.0 + (i % 2) * 1.5 + f * 0.5, 0.6);
      if (it.num) fit(it.num, ease(a.e * 2 - 0.5 - i * 0.05));
    });
    if (!fired && a.ok && p.rank && a.e > 0.7) {
      fired = true;
      sp.go(0, 2, 0.6);
    }
  });
}

export function tags(c: Ctx, p: P<'tags'>) {
  if (p.right) return matchBoard(c, p);
  const nums = p.labels.map((l) => /,\s*(?:colonne\s*)?(\d+)\s*\p{L}*\s*$/u.exec(l)?.[1]);
  if (!p.pair && p.labels.length >= 3 && nums.every((v) => v !== undefined)) return tagsAxis(c, p, nums.map(Number));
  if (p.labels.some((l) => l.length > 11) || (p.pair ?? []).some((l) => l.length > 11)) return tagsList(c, p);
  const rockety = p.token === 'mini';
  const geo = c.own(rockety ? rocketGeo() : tokenGeo(p.token).scale(3.2, 3.2, 3.2));
  const sol = solid(c);
  const flameMat = c.own(new MeshBasicMaterial({ color: PAL.amber, blending: AdditiveBlending, transparent: true }));
  const flameGeo = c.own(new ConeGeometry(0.3, 1.2, 8));
  const n = p.labels.length;
  const gap = Math.min(4.6, 12 / n);
  const x = (i: number) => (i - (n - 1) / 2) * gap;
  const top = rockety ? (n > 3 ? 5.8 : 7.6) : 3.4; // the digit sits just above its own object
  const sp = sparkles(c);
  const items = p.labels.map((t, i) => {
    const g = new Group();
    const r = new Mesh(geo, sol);
    r.castShadow = true;
    const f = new Mesh(flameGeo, flameMat);
    f.position.y = -0.5;
    f.rotation.x = Math.PI;
    g.add(r);
    if (rockety) g.add(f);
    c.root.add(g);
    const to = p.rank ? x(p.rank[i]!) : x(i);
    const extra = p.pair?.[i] ? plate(c, `= ${p.pair[i]}`, 'win', x(i), 1.2, 2.4, 0.9) : p.rank ? plate(c, `${p.rank[i]! + 1}`, 'win', x(i), 1.2, 2.4, 0.7) : null;
    const line = p.pair?.[i] ? new Mesh(c.own(new BoxGeometry(0.06, 0.06, 1)), colour(c, PAL.gold, { emissive: 0.6 })) : null;
    if (line) {
      line.position.set(x(i), 0.6, 1.5);
      c.root.add(line);
    }
    return { g, f, to, extra, line, tag: plate(c, t, p.win === i ? 'win' : 'q', x(i), top + (n > 3 && p.labels.some((l) => l.length > 8) ? (Math.min(i, n - 1 - i) % 2) * 1.8 : 0), 0.6, 1.7), lit: p.win === i };
  });
  if (p.win !== null) {
    const l = new PointLight('#ffe29a', 30, 9);
    l.position.set(x(p.win), 5, 3.6);
    c.root.add(l);
  }
  const ansTag = p.ans !== null && p.ans !== undefined ? plate(c, `${p.ans}`, 'win', 0, 6.4, 0.6, 1.2) : null;
  let fired = false;
  c.tick((a) => {
    if (ansTag) fit(ansTag, ease(a.e * 2 - 0.9));
    items.forEach((it, i) => {
      const grow = Math.max(pop((a.enter * 2 - 0.3 - i * 0.25) / 0.8), 0.001);
      const px = MathUtils.lerp(x(i), it.to, ease(a.e * 1.6));
      const up = it.lit ? ease(a.e * 2) : 0;
      it.g.position.set(px, up * 0.9 + Math.sin(a.t * 1.3 + i) * 0.03, 0.6);
      it.g.scale.setScalar(grow * (rockety ? (n > 3 ? 1.5 : 2.0) : Math.min(1.5, (gap * 0.82) / 3.2)));
      it.g.rotation.y = Math.sin(a.t * 0.4 + i) * 0.1;
      it.f.visible = it.lit && up > 0.05;
      it.f.scale.set(1, Math.max(up * (0.85 + 0.15 * Math.sin(a.t * 30)), 0.001), 1);
      it.tag.position.set(px, (it.lit ? top + 0.7 : top) + (n > 3 && p.labels.some((l) => l.length > 8) ? (Math.min(i, n - 1 - i) % 2) * 1.8 : 0), 0.6);
      const f2 = ease(a.e * 2 - 0.5 - i * 0.12);
      if (it.extra) {
        it.extra.position.x = px;
        fit(it.extra, f2);
      }
      if (it.line) {
        it.line.position.set(px, 0.5, 0.6 + 0.9 * f2);
        it.line.scale.z = Math.max(1.8 * f2, 0.001);
      }
    });
    if (!fired && a.ok && p.win !== null && a.e > 0.6) {
      fired = true;
      sp.go(x(p.win), 5.4, 0.6);
    }
  });
}

export function share(c: Ctx, p: P<'share'>) {
  const { a: total, b, holders, left, deal } = p;
  const per = deal ? Math.floor(total / b) : b;
  const mini = p.token === 'mini';
  const rock = counted(c, tokenGeo(p.token).scale(mini ? 1.33 : 1, mini ? 1.33 : 1, mini ? 1.33 : 1), solid(c), total);
  const crateG = c.own(crateGeo(2));
  const sol = solid(c);
  const H = Math.max(holders ?? 0, 1);
  const cx = (h: number) => -0.2 + (h % 4) * 2.0;
  const cz = (h: number) => 1.0 - Math.floor(h / 4) * 2.2;
  const crates = Array.from({ length: H }, (_, h) => {
    const m = new Mesh(crateG, sol);
    m.castShadow = true;
    m.receiveShadow = true;
    m.position.set(cx(h), 0, cz(h));
    c.root.add(m);
    return m;
  });
  plate(c, `${total}`, 'q', -3.6, 3.2, 0.8);
  plate(c, deal ? `${total}÷${b}` : `${b}`, 'q', cx(0), 2.2, cz(0), 0.9);
  if (holders !== null) {
    plate(c, `${holders}`, 'win', cx(0) + 1.2, 3.6, 0, 1.1);
    plate(c, `+${left}`, 'n', -3.6, 1.7, 1.6 - Math.ceil((holders * per) / 6) * 0.8 + 0.4, 0.9);
    // holders that are not plain crates (days, crew members) carry their number on a sign
    if (p.holder !== 'crate' && p.holder !== 'box') for (let h = 0; h < holders; h++) plate(c, `${h + 1}`, 'n', cx(h), 1.3, cz(h) + 1.1, 0.9);
  }
  c.tick((a) => {
    for (let k = 0; k < total; k++) {
      const hx = -6.2 + (k % 6) * 0.95 + (Math.floor(k / 6) % 2) * 0.3;
      const hz = 1.6 - Math.floor(k / 6) * 0.8;
      let px = hx;
      let pz = hz;
      let py = 0;
      if (holders !== null && k < holders * per) {
        const h = Math.floor(k / per);
        const s = k % per;
        const f = ease((a.e * 3 - 0.9 - k * 0.05) / 0.8);
        px = MathUtils.lerp(hx, cx(h) + ((s % 3) - 1) * 0.5, f);
        pz = MathUtils.lerp(hz, cz(h) + (Math.floor(s / 3) - 0.5) * 0.6, f);
        py = Math.sin(f * Math.PI) * 2.5 + f * 0.25;
      }
      rock.set(k, px, py, pz, ease((a.enter * 2 - 0.2 - k * 0.04) / 0.5));
    }
    rock.commit();
    crates.forEach((m, h) => {
      const shown = h === 0 ? ease(a.enter * 2 - 0.4) : holders !== null ? ease(a.e * 3 - 0.2 - h * 0.12) : 0;
      m.visible = shown > 0.01;
      m.scale.setScalar(Math.max(shown, 0.001) * 0.92);
    });
  });
}
