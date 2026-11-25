// Mission-control wall clock: a big dial on the back wall (canvas-drawn face, one draw call), real hour and minute hands, rockets on the pad.
// The hands show the question's own time. Right: the hour hand glows, chime rings leave the clock, the rocket rises and settles.
import { BoxGeometry, CanvasTexture, CircleGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace, TorusGeometry } from 'three';
import type { Ctx } from '../engine';
import { rocketGeo, stationGeo, tokenGeo } from '../geo';
import { PAL, colour, ease, mesh, pop, solid, sparkles } from '../kit';
import type { BayPlan } from '../plan';

function face(c: Ctx) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#fff8e6';
  g.beginPath();
  g.arc(256, 256, 250, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.ink;
  g.strokeStyle = PAL.ink;
  for (let k = 0; k < 60; k++) {
    const a = (k * Math.PI) / 30;
    const r0 = k % 5 ? 228 : 214;
    g.lineWidth = k % 5 ? 3 : 7;
    g.beginPath();
    g.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0);
    g.lineTo(256 + Math.sin(a) * 240, 256 - Math.cos(a) * 240);
    g.stroke();
  }
  g.font = 'bold 56px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let h = 1; h <= 12; h++) g.fillText(String(h), 256 + Math.sin((h * Math.PI) / 6) * 175, 256 - Math.cos((h * Math.PI) / 6) * 175);
  const tex = c.own(new CanvasTexture(cv));
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export function clock(c: Ctx, p: Extract<BayPlan, { kind: 'clock' }>) {
  const R = 2.5;
  const cy = 4.6;
  const cz = -3.0;
  const dial = new Mesh(c.own(new CircleGeometry(R, 48)), c.own(new MeshBasicMaterial({ map: face(c) })));
  dial.position.set(0, cy, cz);
  c.root.add(dial);
  const rim = mesh(c, new TorusGeometry(R + 0.1, 0.16, 8, 40), colour(c, '#e8b04a', { roughness: 0.4 }));
  rim.position.set(0, cy, cz + 0.05);
  const hourMat = c.own(new MeshStandardMaterial({ color: PAL.red, emissive: PAL.gold, emissiveIntensity: 0, roughness: 0.5 }));
  const hand = (len: number, w: number, m: MeshStandardMaterial) => {
    const g = new Group();
    const b = new Mesh(c.own(new BoxGeometry(w, len, 0.08)), m);
    b.position.y = len / 2 - 0.15;
    g.add(b);
    g.position.set(0, cy, cz + 0.2);
    c.root.add(g);
    return g;
  };
  const hh = hand(1.4, 0.2, hourMat);
  const mh = hand(2.0, 0.12, colour(c, PAL.ink));
  const hub = mesh(c, new TorusGeometry(0.1, 0.1, 6, 10), colour(c, PAL.ink), false);
  hub.position.set(0, cy, cz + 0.28);
  const ring = mesh(c, new TorusGeometry(R + 0.3, 0.05, 6, 40), c.own(new MeshBasicMaterial({ color: PAL.gold, transparent: true, opacity: 0 })), false);
  ring.position.set(0, cy, cz + 0.1);
  const geo = c.own(rocketGeo());
  const sol = solid(c);
  const rockets = (p.pets ?? Array.from({ length: p.rockets }, () => 'mini')).map((tk, i, all) => {
    const m = new Mesh(tk === 'mini' ? geo : c.own(tokenGeo(tk).scale(2.4, 2.4, 2.4)), sol);
    m.castShadow = true;
    c.root.add(m);
    const n2 = all.length;
    return { m, x: n2 === 1 ? 4.2 : -5 + (i * 10) / Math.max(n2 - 1, 1) * (n2 > 3 ? 1 : 0.7) + (n2 > 3 ? 0 : 3) };
  });
  const station = p.view === 'pad' || p.view === 'clinic' ? null : mesh(c, stationGeo(), solid(c));
  station?.position.set(4.2, 6.2, -2.4);
  station?.scale.setScalar(1.1);
  const sp = sparkles(c);
  const hourA = ((p.hour % 12) + p.minute / 60) * 30;
  const minA = p.minute * 6;
  let fired = false;
  c.tick((a) => {
    const sweep = ease(a.enter * 1.6 - 0.1); // the hands sweep from 12 to the time, never past it
    hh.rotation.z = (-hourA * Math.PI * sweep) / 180;
    mh.rotation.z = (-minA * Math.PI * sweep) / 180;
    hourMat.emissiveIntensity = ease(a.e * 2) * (0.6 + 0.4 * Math.sin(a.t * 6));
    const rs = ease((a.e - 0.1) / 0.3);
    ring.scale.setScalar(1 + rs * 0.5);
    (ring.material as MeshBasicMaterial).opacity = rs > 0 && rs < 1 ? 1 - rs : 0;
    rockets.forEach((r, i) => {
      if (station) r.m.position.set(p.view === 'docked' ? 2.7 : 0.8 + (1 - ease(a.enter * 1.5)) * -4, 5.6 + Math.sin(a.t * 1.2) * 0.1 + Math.sin(Math.PI * ease(a.e * 1.4 - 0.2)) * 0.3, -2.2);
      else r.m.position.set(r.x, Math.sin(Math.PI * ease(a.e * 1.4 - 0.2)) * 1.2, 1.5);
      r.m.scale.setScalar(Math.max(pop((a.enter * 2 - 0.3 - i * 0.2) / 0.8), 0.001) * (station ? 0.6 : p.pets ? 1 : 1.1));
    });
    if (!fired && a.ok && a.e > 0.4) {
      fired = true;
      sp.go(0, cy + R, cz + 0.5);
    }
  });
}
