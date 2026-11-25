import { BoxGeometry, Mesh, MathUtils, TorusGeometry } from 'three';
import type { Ctx } from '../engine';
import { tokenGeo } from '../geo';
import { PAL, colour, counted, ease, fit, plate, pop, solid, sparkles, stag } from '../kit';
import type { BayPlan } from '../plan';

/** Chip of one jump: a ratio only when the whole sequence multiplies, otherwise the real difference. */
const jumpLabel = (all: number[], k: number) => {
  const a = all[k]!;
  const b = all[k + 1]!;
  const geo = all.length >= 3 && all.every((v, i) => i === 0 || (all[i - 1]! !== 0 && v % all[i - 1]! === 0 && v / all[i - 1]! === all[1]! / all[0]!)) && all[1]! / all[0]! > 1;
  return geo ? `×${all[1]! / all[0]!}` : b >= a ? `+${b - a}` : `−${a - b}`;
};

// A constellation as stepping stones: big numbered stars (facing the camera) on a row, or on rising steps on a narrow stage so the picture uses its height, a labelled jump arc
// between each two, and an empty ghost star at the end. The reveal fills the ghost with the next term and labels the last jump. The next value shows only at the reveal.
export function chain(c: Ctx, p: Extract<BayPlan, { kind: 'chain' }>) {
  c.focus = true;
  const stairs = (c.aspect ?? 1.7) < 1.3;
  c.pitch = stairs ? 0.45 : 0.95;
  const stepOnly = p.step !== null; // the text gives only the step: four empty stars joined by arcs marked with it
  const n = stepOnly ? 4 : p.vals.length + 1;
  const token = (p.token as string) === 'comet' ? 'star' : p.token;
  const all = p.next !== null ? [...p.vals, p.next] : p.vals;
  const sx = (stairs ? 9.4 : 10.8) / Math.max(n - 1, 1);
  const sc = Math.min(stairs ? 2.8 : 3.2, sx * 0.95);
  const rise = stairs ? Math.min(1.7, 7.5 / Math.max(n - 1, 1)) : 0;
  const pos = Array.from({ length: n }, (_, k) => ({ x: (stairs ? -4.7 : -5.4) + sx * k, y: 0.9 + rise * k }));
  const stars = counted(c, tokenGeo(token as never), solid(c), Math.max(n - 1, 1));
  stars.mesh.count = stepOnly ? 0 : n - 1;
  const ghost = new Mesh(c.own(tokenGeo(token as never)), colour(c, '#cfe8ff', { opacity: 0.35, emissive: 0.4 }));
  ghost.position.set(pos[n - 1]!.x, pos[n - 1]!.y, 0);
  c.root.add(ghost);
  const gh = [ghost];
  if (stepOnly) {
    for (let k = 0; k < n - 1; k++) {
      const m = new Mesh(ghost.geometry, ghost.material);
      m.position.set(pos[k]!.x, pos[k]!.y, 0);
      c.root.add(m);
      gh.push(m);
    }
  }
  if (stairs) {
    pos.forEach((q, k) => {
      const h = q.y - 0.5;
      const pil = new Mesh(c.own(new BoxGeometry(sx * 0.8, Math.max(h, 0.2), 1.6)), colour(c, k % 2 ? PAL.gold : PAL.teal, { opacity: 0.8, emissive: 0.15 }));
      pil.position.set(q.x, Math.max(h, 0.2) / 2, 0);
      pil.receiveShadow = true;
      c.root.add(pil);
    });
  }
  const arcs = pos.slice(1).map((b, k) => {
    const a = pos[k]!;
    const m = new Mesh(c.own(new TorusGeometry(1, 0.08, 6, 24, Math.PI)), colour(c, '#bfe6ff', { emissive: 0.9 }));
    m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.8, 0);
    m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
    m.scale.set(Math.hypot(b.x - a.x, b.y - a.y) / 2, 0.001, 1);
    c.root.add(m);
    return m;
  });
  const lab = (k: number) => (stepOnly ? `+${p.step}` : k + 1 < all.length ? jumpLabel(all, k) : '?');
  const numY = (k: number) => (stairs ? pos[k]!.y - 1.0 : 0.3);
  const numZ = stairs ? 1.1 : 1.5;
  p.vals.forEach((v, k) => plate(c, `${v}`, 'n', pos[k]!.x, numY(k), numZ, 1.3));
  if (stepOnly) for (let k = 0; k < n - 1; k++) plate(c, '?', 'q', pos[k]!.x, numY(k), numZ, 1.3);
  if (p.next === null) plate(c, '?', 'q', pos[n - 1]!.x, numY(n - 1), numZ, 1.3); // the blank is replaced by the answer at the reveal
  const known = stepOnly ? n - 1 : p.vals.length - 1;
  const told = (k: number) => stepOnly || (k < known ? !p.rule || p.next !== null : p.next !== null); // a rule question hides its rule until the reveal
  const jumps = arcs.map((_, k) => (told(k) ? plate(c, lab(k), 'out', (pos[k]!.x + pos[k + 1]!.x) / 2, (pos[k]!.y + pos[k + 1]!.y) / 2 + 2.6, 0, 1.2) : null));
  const tags = p.next !== null ? plate(c, `${p.next}`, 'win', pos[n - 1]!.x, numY(n - 1), numZ, 1.5) : null;
  const sp = sparkles(c);
  let fired = false;
  c.tick((a) => {
    for (let k = 0; k < n - 1; k++) stars.set(k, pos[k]!.x, pos[k]!.y + Math.sin(a.t * 1.6 + k) * 0.08, 0, pop((a.enter * 2 - 0.15 - k * 0.15) / 0.5) * sc, 0); // always facing the camera
    stars.commit();
    const f = ease(a.e * 1.6 - 0.3);
    gh.forEach((m, i) => {
      m.scale.setScalar(Math.max(pop(a.enter * 2 - 0.2 - 0.15 * (n - 1)), 0.001) * sc * (i === 0 ? 1 + f * 0.1 : 1));
      m.position.y = (i === 0 ? pos[n - 1]!.y : pos[i - 1]!.y) + Math.sin(a.t * 1.6) * 0.08;
    });
    (ghost.material as import('three').MeshStandardMaterial).opacity = MathUtils.lerp(0.35, 1, f);
    arcs.forEach((m, k) => {
      const last = !stepOnly && k >= known;
      m.scale.y = Math.max(1.3 * ease(a.enter * 1.5 - 0.2 - k * 0.12) * (last ? (p.next === null ? 0.5 : f) : 1), 0.001);
    });
    if (tags) fit(tags, 1.2 * f);
    jumps.forEach((s, k) => {
      if (!s) return;
      const last = !stepOnly && k >= known;
      fit(s, last || p.rule ? ease(a.e * 2 - 0.4 - k * 0.05) : ease(a.enter * 1.6 - 0.4 - k * 0.1));
    });
    if (!fired && a.ok && p.next !== null && f > 0.9) {
      fired = true;
      sp.go(pos[n - 1]!.x, pos[n - 1]!.y + 0.5, 0);
    }
  });
}

/** Nights of star counts: one separate tray per night with its stars inside (countable) and the night number under it. The asked night is a ghost tray that lights up with the answer at the reveal. */
export function cols(c: Ctx, p: Extract<BayPlan, { kind: 'cols' }>) {
  c.focus = true;
  c.pitch = 1.3;
  const given = p.vals.length;
  const nCol = given + (p.ask ? 1 : 0);
  const ghostIdx = p.ask ? given : p.hideLast ? given - 1 : -1;
  const revealVal = p.ask ? p.askVal : null;
  const vOf = (i: number) => (i < given ? p.vals[i]! : revealVal ?? 0);
  const mx = Math.max(...p.vals, revealVal && revealVal <= 20 ? revealVal : 0, 1);
  const k0 = Math.min(4, Math.ceil(Math.sqrt(mx)));
  const slot = 11.4 / nCol;
  const trayW = slot * 0.88;
  const rowsMax = Math.ceil(mx / k0);
  const sz = Math.min(1.1, (trayW * 0.9) / k0, 4.2 / rowsMax);
  const trayD = rowsMax * sz + 0.7;
  const cx = (i: number) => -5.7 + slot * (i + 0.5);
  const trayGeo = c.own(new BoxGeometry(trayW, 0.2, trayD));
  const trays = Array.from({ length: nCol }, (_, i) => {
    const m = new Mesh(trayGeo, colour(c, i === ghostIdx ? '#cfe8ff' : i % 2 ? PAL.gold : PAL.teal, { emissive: i === ghostIdx ? 0.4 : 0.18, opacity: i === ghostIdx ? 0.45 : 0.85 }));
    m.position.set(cx(i), 0.1, 0);
    m.receiveShadow = true;
    c.root.add(m);
    return m;
  });
  const items: { x: number; z: number; k: number; col: number }[] = [];
  const drawn = (i: number) => (i === ghostIdx ? (p.ask && revealVal && revealVal <= 20 ? revealVal : 0) : vOf(i));
  for (let i = 0; i < nCol; i++) {
    const v = drawn(i);
    const cc = Math.min(k0, Math.max(v, 1));
    const rows = Math.ceil(v / cc);
    for (let j = 0; j < v; j++) items.push({ x: cx(i) + ((j % cc) - (cc - 1) / 2) * sz * 1.05, z: (Math.floor(j / cc) - (rows - 1) / 2) * sz * 1.05, k: items.length, col: i });
  }
  const inst = counted(c, tokenGeo(p.token), solid(c), Math.max(items.length, 1));
  inst.mesh.count = items.length;
  if (!p.ask && !p.hideLast) c.expect = items.length;
  for (let i = 0; i < nCol; i++) {
    plate(c, `#${i === given && p.ask ? p.ask : i + 1}`, 'n', cx(i), 0.3, trayD / 2 + 0.9, 1.0);
    if (i === ghostIdx && !(p.ask ? revealVal !== null : !p.hideLast)) plate(c, '?', 'q', cx(i), 1.8, 0, 1.6);
    else if (i === ghostIdx && p.ask) plate(c, `${revealVal}`, 'win', cx(i), 1.8, 0, 1.6);
    else plate(c, `${vOf(i)}`, 'n', cx(i), 1.8, -trayD / 2 - 0.3, 1.2);
  }
  const sp = sparkles(c);
  let fired = false;
  c.tick((a) => {
    trays.forEach((m, i) => m.scale.setScalar(Math.max(pop((a.enter * 2 - 0.1 - i * 0.12) / 0.6), 0.001)));
    items.forEach((it) => {
      const late = it.col === ghostIdx ? ease((a.e - 0.3) * 2) : 1;
      inst.set(it.k, it.x, 0.3 + Math.sin(stag(a.e, it.k, items.length, 0.1, 0.8) * Math.PI) * 0.4, it.z, sz * 1.9 * pop((a.enter * 2 - 0.1 - it.col * 0.12 - (it.k % 20) * 0.02) / 0.5) * late, 0, -Math.atan(c.pitch ?? 0.62));
    });
    inst.commit();
    if (!fired && a.ok && a.e > 0.7 && (revealVal !== null || p.hideLast)) {
      fired = true;
      sp.go(cx(Math.max(ghostIdx, 0)), 2, 0);
    }
  });
}
