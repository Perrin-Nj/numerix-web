// A standing star-chart table: the map tiles with their named places, edge numbers; the reveal walks a crew member (path), lights and counts cells (count) or rings the asked cell.
import { Group, Mesh, TorusGeometry, BoxGeometry } from 'three';
import type { Ctx } from '../engine';
import { tokenGeo } from '../geo';
import { PAL, colour, counted, ease, plate, pop, solid, sparkles } from '../kit';
import type { BayPlan } from '../plan';

export function grid(c: Ctx, p: Extract<BayPlan, { kind: 'grid' }>) {
  const t = Math.min(9.5 / p.cols, 5.2 / p.rows, 1.6);
  const g = new Group();
  g.position.set(0, 2.5, 0.3);
  g.rotation.x = -0.5;
  c.root.add(g);
  const px = (x: number) => (x - (p.cols + 1) / 2) * t;
  const py = (y: number) => -(y - (p.rows + 1) / 2) * t;
  const tiles = counted(c, new BoxGeometry(t * 0.93, t * 0.93, 0.18).translate(0, 0, -0.09), colour(c, '#ffffff', { roughness: 0.8 }), p.cols * p.rows);
  tiles.mesh.removeFromParent();
  g.add(tiles.mesh);
  // warm checker through the instance tint
  for (let r = 1; r <= p.rows; r++) {
    for (let q = 1; q <= p.cols; q++) {
      tiles.set((r - 1) * p.cols + q - 1, px(q), py(r), 0, 1);
      tiles.tint((r - 1) * p.cols + q - 1, (q + r) % 2 ? 0.9 : 0.6, (q + r) % 2 ? 0.8 : 0.55, (q + r) % 2 ? 1 : 0.9);
    }
  }
  tiles.commit();
  const sp = sparkles(c);
  for (let q = 1; q <= p.cols; q++) g.add(plate(c, `${q}`, 'n', px(q), py(p.rows + 1) + 0.15, 0.4, 0.5));
  for (let r = 1; r <= p.rows; r++) g.add(plate(c, `${r}`, 'n', px(0), py(r), 0.4, 0.5));
  const markGeo = tokenGeo('crate').rotateX(Math.PI / 2).scale(t * 0.9, t * 0.9, t * 0.9);
  const marks = counted(c, markGeo, solid(c), p.cells.length);
  marks.mesh.removeFromParent();
  g.add(marks.mesh);
  p.cells.forEach((cell, k) => {
    if (p.target === k) g.add(plate(c, '?', 'q', px(cell.x), py(cell.y), 0.9, 0.9));
    else if (cell.label) g.add(plate(c, cell.label, 'q', px(cell.x), py(cell.y) + t * 0.55, 0.8, 0.8));
  });
  const walker = new Mesh(c.own(tokenGeo('person').rotateX(Math.PI / 2).scale(t * 1.1, t * 1.1, t * 1.1)), solid(c));
  walker.visible = (p.mode === 'path' && p.sel.length >= 2) || (p.mode === 'rover' && p.legs !== null);
  const route = p.mode === 'rover' && p.legs && p.sel.length ? (() => {
    const A0 = p.cells[p.sel[0]!]!;
    const pts = [{ x: A0.x, y: A0.y }];
    for (let k = 1; k <= Math.abs(p.legs!.right); k++) pts.push({ x: A0.x + Math.sign(p.legs!.right) * k, y: A0.y });
    for (let k = 1; k <= Math.abs(p.legs!.down); k++) pts.push({ x: A0.x + p.legs!.right, y: A0.y + Math.sign(p.legs!.down) * k });
    return pts;
  })() : [];
  route.slice(1).forEach((q, k) => g.add(plate(c, `${k + 1}`, 'win', px(q.x), py(q.y), 1.1, 0.9)));
  g.add(walker);
  const ring = new Mesh(c.own(new TorusGeometry(t * 0.5, 0.07, 6, 20)), colour(c, PAL.gold, { emissive: 0.6 }));
  ring.visible = false;
  g.add(ring);
  const lit = p.sel.map((k) => p.cells[k]!);
  if (p.mode === 'count' && p.ans !== null) lit.forEach((cell, j) => g.add(plate(c, `${j + 1}`, 'win', px(cell.x), py(cell.y) - t * 0.75, 1.1, 0.6)));
  if (p.mode === 'ring' && p.sel.length) g.add(plate(c, `${lit[0]!.x} · ${lit[0]!.y}`, 'win', px(lit[0]!.x), py(lit[0]!.y) + t * 0.6, 1.1, 0.9));
  let fired = false;
  c.tick((a) => {
    p.cells.forEach((cell, k) => marks.set(k, px(cell.x), py(cell.y), 0.0, pop((a.enter * 2 - 0.2 - k * 0.1) / 0.6)));
    marks.commit();
    if (p.sel.length) {
      const A = lit[0]!;
      if (p.mode === 'rover') {
        const f = ease((a.e - 0.1) / 0.7) * (route.length - 1);
        const k = Math.min(Math.floor(f), route.length - 2);
        const A1 = route[Math.max(k, 0)]!;
        const B1 = route[Math.min(k + 1, route.length - 1)]!;
        const u = f - k;
        walker.position.set(px(A1.x + (B1.x - A1.x) * u), py(A1.y + (B1.y - A1.y) * u), 0.3);
      } else if (p.mode === 'path') {
        const B = lit[1]!;
        const f = ease((a.e - 0.1) / 0.6);
        walker.position.set(px(A.x + (B.x - A.x) * f), py(A.y + (B.y - A.y) * f), 0.25 + Math.sin(f * Math.PI) * 0.4);
      } else {
        ring.visible = a.e > 0.1;
        const j = p.mode === 'count' ? Math.min(lit.length - 1, Math.floor(a.e * lit.length * 1.3)) : 0;
        ring.position.set(px(lit[j]!.x), py(lit[j]!.y), 0.3);
        ring.scale.setScalar(1 + 0.12 * Math.sin(a.t * 6));
      }
      if (!fired && a.ok && a.e > 0.7) {
        fired = true;
        sp.go(px(A.x), 2.5 + py(A.y) * 0.9, 1.2);
      }
    }
  });
}
