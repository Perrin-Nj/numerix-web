// Fuel and water in litres as real glass tanks: add and sub (the level moves), steps (down then up), two (two tanks poured into a third), cmp (two tanks and their gap).
import { BoxGeometry, type Group, Mesh } from 'three';
import { tokenGeo } from '../geo';
import type { Ctx } from '../engine';
import { PAL, colour, ease, fit, plate, pop, solid, sparkles } from '../kit';
import type { BayPlan } from '../plan';
import { tankKit } from './bay';

export function gauge(c: Ctx, p: Extract<BayPlan, { kind: 'gauge' }>) {
  const mk = tankKit(c);
  const sp = sparkles(c);
  const { a, b, cap } = p;
  const two = p.mode === 'two' || p.mode === 'cmp';
  const t1 = mk(PAL.amber);
  const t2 = two ? mk(PAL.teal) : null;
  const t3 = p.mode === 'two' && p.end !== null ? mk(PAL.gold) : null;
  const px = p.mode === 'two' ? [-4.6, -1.6, 3.4] : p.mode === 'cmp' ? [-2.4, 2.4, 0] : [0, 0, 0];
  t1.g.position.x = px[0]!;
  if (t2) t2.g.position.x = px[1]!;
  if (t3) t3.g.position.x = px[2]!;
  const hose = new Mesh(c.own(new BoxGeometry(0.16, 0.16, 1)), colour(c, p.mode === 'add' ? PAL.teal : PAL.red, { emissive: 0.5 }));
  c.root.add(hose);
  plate(c, `${a} L`, 'q', px[0]!, 5.2, 0.8);
  if (two) plate(c, `${b} L`, 'q', px[1]!, 5.2, 0.8);
  else plate(c, `${p.mode === 'add' ? '+' : '−'} ${b} L`, p.mode === 'add' ? 'q' : 'out', 3.4, 3.4, 1.2, 0.9);
  if (p.mode === 'steps') plate(c, `+ ${p.c} L`, 'q', 3.4, 2.1, 1.2, 0.9);
  const endTag = p.label ? plate(c, p.label, 'win', p.mode === 'two' ? px[2]! : p.mode === 'cmp' ? 0 : px[0]!, p.mode === 'two' ? 5.6 : p.mode === 'cmp' ? 6.2 : 6.4, 0.8, 1.2) : null;
  let fired = false;
  c.tick((anim) => {
    const big = two ? 1 : 1.3;
    const grow = (g: Group, k: number) => g.scale.setScalar(Math.max(pop((anim.enter * 2 - 0.2 - k * 0.2) / 0.7), 0.001) * big);
    grow(t1.g, 0);
    if (t2) grow(t2.g, 1);
    const f = ease(anim.e * 1.4 - 0.25);
    const fill = ease(anim.enter * 2 - 0.5);
    let lvl1 = a / cap;
    if (!two) {
      const end = p.end ?? a;
      const mid = p.mode === 'steps' ? a - b : end;
      const v = p.mode === 'steps' ? (f < 0.5 ? a + (mid - a) * ease(f * 2) : mid + (end - mid) * ease(f * 2 - 1)) : a + (end - a) * f;
      lvl1 = v / cap;
      hose.visible = p.end !== null && f > 0.02 && f < 0.98; // the hose glows while the level moves
      hose.position.set(2.0, 3.6 - lvl1 * 1.5, 0.8);
      hose.scale.z = 2.2;
      hose.rotation.y = Math.PI / 2;
    } else hose.visible = false;
    t1.l.scale.y = Math.max(0.02, lvl1 * fill * 0.92);
    if (t2) t2.l.scale.y = Math.max(0.02, (b / cap) * fill * 0.92);
    if (t3 && p.end !== null) {
      t3.g.scale.setScalar(Math.max(pop(anim.e * 2.2 - 0.3), 0.001) * 1.2);
      t3.l.scale.y = Math.max(0.02, (p.end / (cap * 1.4)) * ease(anim.e * 1.4 - 0.45) * 0.92);
    }
    if (endTag) {
      const k = ease(anim.e * 2 - 0.6);
      fit(endTag, 1.2 * k);
    }
    if (!fired && anim.ok && anim.e > 0.8) {
      fired = true;
      sp.go(px[p.mode === 'two' ? 2 : 0]!, 4.4, 0.8);
    }
  });
}

/** A dose vial: the given drops are in, the rest of the vial is empty until the reveal fills it up and shows what was missing. */
export function vial(c: Ctx, p: Extract<BayPlan, { kind: 'vial' }>) {
  const mk = tankKit(c);
  const t = mk('#4aa8ff');
  t.g.position.x = 1.6;
  const sp = sparkles(c);
  let pet: Mesh | null = null;
  if (p.pet) {
    pet = new Mesh(c.own(tokenGeo(p.pet).scale(2.6, 2.6, 2.6)), solid(c));
    pet.castShadow = true;
    pet.position.set(-3.2, 0, 1.2);
    c.root.add(pet);
  }
  plate(c, `${p.given}`, 'q', -0.6, 2.2, 0.9, 1);
  plate(c, `${p.total}`, 'n', 4.2, 5.0, 0.9, 1);
  const tag = p.left !== null ? plate(c, `${p.left}`, 'win', 4.2, 3.2, 0.9, 1.3) : null;
  let fired = false;
  c.tick((a) => {
    t.g.scale.setScalar(Math.max(pop((a.enter * 2 - 0.2) / 0.7), 0.001) * 1.4);
    pet?.scale.setScalar(Math.max(pop((a.enter * 2 - 0.4) / 0.7), 0.001));
    if (pet) pet.position.y = ease(a.e * 2 - 0.4) * Math.abs(Math.sin(a.t * 6)) * 0.4;
    const fill = ease(a.enter * 2 - 0.5);
    const f = ease(a.e * 1.4 - 0.25);
    const lvl = (p.given / p.total + (p.left !== null ? (1 - p.given / p.total) * f : 0)) * 0.92;
    t.l.scale.y = Math.max(0.02, lvl * fill);
    if (tag) fit(tag, ease(a.e * 2 - 0.9));
    if (!fired && a.ok && p.left !== null && a.e > 0.8) {
      fired = true;
      sp.go(0, 5, 0.9);
    }
  });
}
