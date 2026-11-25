// Solar wings of the station: the panels lie in rows on the bay floor seen from above (one instanced draw call), the row count at the side and the column count above.
// The reveal runs a light along the rows and shows the total (or the estimate when the question asks for one).
import { BoxGeometry, CylinderGeometry, Mesh } from 'three';
import type { Ctx } from '../engine';
import { tokenGeo } from '../geo';
import { colour, counted, ease, fit, mesh, plate, pop, solid, sparkles } from '../kit';
import type { BayPlan } from '../plan';

export function wing(c: Ctx, p: Extract<BayPlan, { kind: 'wing' }>) {
  c.focus = true;
  c.pitch = 2.4;
  const nW = p.dims.length;
  const slot = 10.8 / nW;
  const s = Math.min((slot - 1.0) / Math.max(...p.dims.map((d) => d.cols)), 6.4 / Math.max(...p.dims.map((d) => d.rows)), 1.5);
  const sp = sparkles(c);
  const panels = p.dims.map((d, w) => {
    const cx = -5.4 + slot * (w + 0.5);
    const inst = counted(c, new BoxGeometry(s * 0.9, 0.14, s * 0.9), colour(c, '#ffffff', { roughness: 0.3 }), d.rows * d.cols);
    const depth = d.rows * s;
    plate(c, `${d.cols}`, 'n', cx, 0.4, -depth / 2 - 0.9, 1.2);
    plate(c, `${d.rows}`, 'q', cx - (d.cols * s) / 2 - 0.7, 0.4, 0, 1.2);
    return { inst, d, cx };
  });
  if (p.sat) {
    const probe = mesh(c, tokenGeo('probe').scale(2, 2, 2), solid(c));
    probe.position.set(5.2, 3.2, -3.2);
    c.tick((a) => (probe.position.y = 3.2 + Math.sin(a.t * 1.4) * 0.15));
  }
  const maxDepth = Math.max(...p.dims.map((d) => d.rows * s));
  const totalTag = p.total !== null ? plate(c, p.est ?? `= ${p.total}`, 'win', 0, 0.6, maxDepth / 2 + 1.3, 1.6) : null;
  let fired = false;
  c.tick((a) => {
    panels.forEach(({ inst, d, cx }, w) => {
      for (let r = 0; r < d.rows; r++) {
        const lit = p.total !== null ? ease(a.e * 2.4 - r * 0.13) * (0.6 + 0.4 * Math.sin(a.t * 5 - r)) : 0;
        for (let q = 0; q < d.cols; q++) {
          const k = r * d.cols + q;
          const broken = p.broken > 0 && w === nW - 1 && d.rows * d.cols - k <= p.broken;
          inst.set(k, cx + (q - (d.cols - 1) / 2) * s, 0.1, (r - (d.rows - 1) / 2) * s, Math.max(pop((a.enter * 2 - 0.2 - w * 0.2 - r * 0.04) / 0.6), 0.001));
          if (broken) inst.tint(k, 0.25, 0.25, 0.3);
          else inst.tint(k, 0.25 + 0.75 * lit, 0.5 + 0.45 * lit, 1 - 0.4 * lit);
        }
      }
      inst.commit();
    });
    if (totalTag) {
      const k = ease(a.e * 2 - 0.9);
      fit(totalTag, 1.3 * k);
    }
    if (!fired && a.ok && p.total !== null && a.e > 0.85) {
      fired = true;
      sp.go(0, 2.2, 0);
    }
  });
}
void CylinderGeometry;
void Mesh;
