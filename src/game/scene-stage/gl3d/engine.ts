// Imperative three.js engine for the 3D scenes: no react-three-fiber, named imports only (small lazy chunk).
// One engine per canvas: renderer (dpr capped at 2, soft shadows), camera rigs, one rAF loop that sleeps when off screen, pointer parallax,
// an fps guard and context-loss hook, and disposal of every geometry, material and texture a scene made.
import { type Fog, Group, type InstancedMesh, MathUtils, type Mesh, Matrix4, type Object3D, PCFSoftShadowMap, PerspectiveCamera, Scene, type Sprite, Vector3, WebGLRenderer } from 'three';
import { buildEnv, type EnvTheme } from './kit';

export type Anim = { t: number; dt: number; /** 0..1 entrance */ enter: number; /** 0..1 reveal */ e: number; ok: boolean; reduced: boolean };
type Disposable = { dispose(): void };
export type Ctx = {
  root: Group;
  /** The plates of this content (collected by kit.plate, laid out by kit.separatePlates after the build). */
  plates?: Sprite[];
  /** Set by a scene that counts objects: how many the story says (the alignment gate compares it with what is drawn). */
  expect?: number;
  /** Match boards declare their two columns: the alignment gate checks that each column shares one x and that the rows are equally spaced. */
  cols?: { left: Sprite[]; right: Sprite[]; /** multiply the row pitch by k (the engine asks when the plates are taller than the rows) */ setPitch?: (k: number) => void; /** pairs of plates that share a row (label and partner): widened apart by setSpread when they overlap */ pairs?: [Sprite, Sprite][]; setSpread?: (k: number) => void; margin?: number };
  /** Canvas width / height when the content was built (a narrow stage gets a narrower layout; the engine rebuilds when the class changes). */
  aspect?: number;
  /** The framing distance now (plates are a screen size: half a plate in world units is scale.x / 2 * dist). */
  dist?: () => number;
  /** Canvas height in CSS px when the content was built: scenes on a very short stage trade secondary text for shorter plates. */
  h?: number;
  /** A focused scene hides the gantry and the window: nothing behind the objects competes with them. */
  focus?: boolean;
  /** Camera height over the floor as a ratio of the distance (0.62 default, ~32 degrees): layouts on the floor ask for a steeper view. */
  pitch?: number;
  /** True while the engine runs the content's ticks only to measure it: no sparkles, no side effects. */
  dry?: boolean;
  anim: Anim;
  /** Register anything with dispose() (geometry, material, texture): it is freed when the content is replaced or the engine ends. */
  own<T extends Disposable>(x: T): T;
  /** Per-frame callback of this content. */
  tick(fn: (a: Anim) => void): void;
};
export type Opts = { reduced: boolean; variant?: number; theme: EnvTheme; light: string; camera: { preset: string; drift: string }; onWeak: () => void };
export type Engine = {
  /** Replace the drawn content (question to reveal swaps it; the entrance is not replayed). */
  setContent(build: (c: Ctx) => void, revealed: boolean, ok: boolean, instant?: boolean): void;
  setVisible(v: boolean): void;
  dispose(): void;
};

const ease = (x: number) => 1 - (1 - MathUtils.clamp(x, 0, 1)) ** 3;

export function mountEngine(canvas: HTMLCanvasElement, o: Opts): Engine {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1.7, 0.5, 70);
  const envOwned: Disposable[] = [];
  buildEnv(scene, o.theme, o.light, (x) => (envOwned.push(x), x), o.variant ?? 0);
  const root = new Group();
  scene.add(root);
  let owned: Disposable[] = [];
  let ticks: ((a: Anim) => void)[] = [];
  const A: Anim = { t: 0, dt: 0, enter: o.reduced ? 1 : 0, e: 0, ok: true, reduced: o.reduced };
  let revealed = false;
  let revealAt = -1;
  let raf = 0;
  let last = 0;
  let visible = true;
  let dead = false;
  let px = 0;
  let py = 0;
  const cam = { x: 0, y: 0 };
  const guard = { n: 0, sum: 0 };
  let meter = 0;
  let first = false;

  const size = () => {
    const w = canvas.clientWidth || 390;
    const h = canvas.clientHeight || 230;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (content && `${(content.ctx.aspect ?? 1.7) < 1.5}${(content.ctx.h ?? 300) < 230}` !== `${w / h < 1.5}${h < 230}`) {
      engine.setContent(content.build, revealed, A.ok, true); // narrow and wide stages are laid out differently; the reveal stays where it was
      return;
    }
    if (content) {
      applyPlateUnit(content.ctx.plates ?? []);
      (content.ctx.plates ?? []).forEach((sp) => {
        sp.userData.nudge = 0;
        sp.userData.nudgeX = 0;
      });
      fitCur = fitCamera();
      adjustPitch();
      resolvePlates();
      fitCur = fitCamera();
      fitFrom = null;
      canvas.dataset.align = JSON.stringify(align());
    }
    if (o.reduced) render();
  };

  // AUTO-FRAMING: after a content is built the camera is fitted to the projected box of every counted object, plate and the answer plate (settled
  // state, question and reveal together), centred and filling about 80% of the canvas; the camera rigs move around that fit, never away from it.
  type Fit = { tx: number; ty: number; tz: number; dist: number };
  let fitCur: Fit = { tx: 0, ty: 2.5, tz: 0, dist: 14.5 };
  let fitFrom: Fit | null = null;
  let fitK = 1;
  let content: { build: (c: Ctx) => void; ctx: Ctx; expect?: number } | null = null;
  const DIR = new Vector3(0, 0.62, 1).normalize();
  const setPitch = (y: number) => DIR.set(0, y, 1).normalize(); // seen from above: rows of objects read as a layout on the floor, not as a strip at the back
  const tanH = Math.tan((38 * Math.PI) / 360);
  const tmpM = new Matrix4();
  const v3 = new Vector3();

  type Pts = { objs: Vector3[]; plates: { p: Vector3; hw: number; hh: number; lines: number; texH?: number; t?: string; sp?: Sprite }[]; drawn: number };
  function collect(): Pts {
    root.updateMatrixWorld(true);
    const out: Pts = { objs: [], plates: [], drawn: 0 };
    const corners = (m: Matrix4, g: Mesh['geometry']) => {
      if (!g.boundingBox) g.computeBoundingBox();
      const b = g.boundingBox!;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) out.objs.push(new Vector3(x, y, z).applyMatrix4(m));
    };
    const walk = (o: Object3D) => {
      if (!o.visible) return;
      if ((o as Sprite).isSprite) {
        const sp = o as Sprite;
        if (sp.scale.x < sp.userData.sx * 0.12) return; // a faded plate is not on screen
        sp.getWorldPosition(v3);
        out.plates.push({ p: v3.clone(), hw: sp.scale.x / 2, hh: sp.scale.y / 2, lines: sp.userData.lines ?? 1, texH: sp.userData.texH ?? 128, t: sp.userData.text, sp });
        return;
      }
      if ((o as InstancedMesh).isInstancedMesh) {
        const im = o as InstancedMesh;
        for (let k = 0; k < im.count; k++) {
          im.getMatrixAt(k, tmpM);
          const e = tmpM.elements;
          if (Math.hypot(e[0]!, e[1]!, e[2]!) < 0.03) continue; // an instance scaled to nothing is not drawn
          tmpM.premultiply(im.matrixWorld);
          corners(tmpM, im.geometry);
          if (im.userData.counted) out.drawn++;
        }
      } else if ((o as Mesh).isMesh) corners((o as Mesh).matrixWorld, (o as Mesh).geometry);
      o.children.forEach(walk);
    };
    root.children.forEach(walk);
    return out;
  }

  /** Normalised device box of the points (plates count with their on-screen size). */
  function ndcBox(pts: Pts) {
    let minX = 9;
    let maxX = -9;
    let minY = 9;
    let maxY = -9;
    const add = (x: number, y: number) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    };
    pts.objs.forEach((p) => {
      v3.copy(p).project(camera);
      add(v3.x, v3.y);
    });
    const rects = pts.plates.map((q) => {
      const hw = q.hw / (tanH * camera.aspect); // a plate is a fraction of the canvas whatever its depth
      const hh = q.hh / tanH;
      v3.copy(q.p).project(camera);
      add(v3.x - hw, v3.y - hh);
      add(v3.x + hw, v3.y + hh);
      return { x: v3.x, y: v3.y, hw, hh, t: q.t, sp: q.sp };
    });
    return { minX, maxX, minY, maxY, rects };
  }

  /** Smallest plate font in CSS px at this canvas size (84 px of the plate texture is the digit). */
  function minFont(all: Pts): number {
    const H = canvas.clientHeight || 230;
    let m = 999;
    all.plates.forEach((q) => {
      const texH = q.texH ?? 128;
      m = Math.min(m, (q.hh / tanH) * H * (84 / texH));
    });
    return m;
  }

  /** Plates are sized from the canvas: one digit is at least 19 px tall at the smallest stage, up to 40 px on a big one. */
  function applyPlateUnit(plates: Sprite[]) {
    const H = canvas.clientHeight || 230;
    const px = MathUtils.clamp(0.09 * H, 18, 44);
    const unit = (2 * px * tanH) / H;
    plates.forEach((sp) => {
      sp.userData.sy = unit * sp.userData.krel * sp.userData.hm;
      sp.userData.sx = sp.userData.sy * sp.userData.ar;
      sp.scale.set(sp.userData.sx, sp.userData.sy, 1);
    });
  }

  /** Every pass of the content's ticks keeps the screen-space nudges (set by resolvePlates) on top of what the scenes author. */
  function runTicks() {
    const pl = content?.ctx.plates ?? [];
    const k = (fitCur.dist * tanH) / 0.85; // nudges are stored in screen units, so they stay right when the framing changes
    const kx = k * camera.aspect * 0.85;
    pl.forEach((sp) => {
      sp.position.y -= sp.userData.applied ?? 0;
      sp.position.x -= sp.userData.appliedX ?? 0;
    });
    ticks.forEach((f) => f(A));
    pl.forEach((sp) => {
      sp.userData.applied = (sp.userData.nudge ?? 0) * k;
      sp.userData.appliedX = (sp.userData.nudgeX ?? 0) * kx;
      sp.position.y += sp.userData.applied;
      sp.position.x += sp.userData.appliedX;
    });
  }

  let extraTop = 0;
  function fitCamera(depth = 0): Fit {
    if (depth === 0) extraTop = 0;
    const keep = { enter: A.enter, e: A.e, ok: A.ok, dt: A.dt };
    A.enter = 1;
    A.ok = false;
    A.dt = 0;
    const all: Pts = { objs: [], plates: [], drawn: 0 };
    if (content) content.ctx.dry = true;
    for (const e of revealed ? [0, 1] : [0]) {
      A.e = e;
      runTicks();
      const c = collect();
      all.objs.push(...c.objs);
      all.plates.push(...c.plates);
    }
    if (content) content.ctx.dry = false;
    A.enter = keep.enter;
    A.e = keep.e;
    A.ok = keep.ok;
    A.dt = keep.dt;
    if (!all.objs.length && !all.plates.length) return fitCur;
    // start from the centre of the box, then alternate re-centring and re-scaling in screen space
    const lo = new Vector3(1e9, 1e9, 1e9);
    const hi = new Vector3(-1e9, -1e9, -1e9);
    [...all.objs, ...all.plates.map((q) => q.p)].forEach((p) => {
      lo.min(p);
      hi.max(p);
    });
    const target = lo.clone().add(hi).multiplyScalar(0.5);
    canvas.dataset.box = JSON.stringify({ lo: lo.toArray().map((v) => +v.toFixed(1)), hi: hi.toArray().map((v) => +v.toFixed(1)), n: all.objs.length, pl: all.plates.length, oy: Math.max(...all.objs.map((v) => v.y)), py: all.plates.map((q) => [+q.p.y.toFixed(1), +q.hh.toFixed(1)]) });
    let dist = 14;
    const H = canvas.clientHeight || 230;
    const top = Math.min(0.55, Math.max(0.12, (2 * 58) / H)) + extraTop; // room for the replay button and the check badge
    const yMax = 1 - top;
    const yMin = -0.9;
    const fillX = 0.84;
    const fillY = (yMax - yMin) / 2;
    const yMid = (yMax + yMin) / 2;
    for (let it = 0; it < 10; it++) {
      camera.position.copy(target).addScaledVector(DIR, dist);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      const b = ndcBox(all);
      const cx = (b.minX + b.maxX) / 2;
      const cy = (b.minY + b.maxY) / 2;
      const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(right, cx * dist * tanH * camera.aspect).addScaledVector(up, (cy - yMid) * dist * tanH);
      const sx = (b.maxX - b.minX) / 2 / fillX;
      const sy = (b.maxY - b.minY) / 2 / fillY;
      dist = MathUtils.clamp(dist * Math.max(sx, sy, 0.2), 5, 42);
    }
    // plates still under the replay button or the check badge: give the top more room and fit once more
    const b2 = ndcBox(all);
    const W2 = canvas.clientWidth || 390;
    const zy = 1 - (2 * 56) / H;
    let clash = 0;
    b2.rects.forEach((r) => {
      if (r.x + r.hw > 1 - (2 * 56) / W2 && r.y + r.hh > zy) clash = Math.max(clash, r.y + r.hh - zy);
      if (revealed && r.x - r.hw < -1 + (2 * 100) / W2 && r.y + r.hh > 1 - (2 * 40) / H) clash = Math.max(clash, r.y + r.hh - (1 - (2 * 40) / H));
    });
    if (clash > 0.005 && extraTop < 0.5 && depth < 3) {
      extraTop += clash + 0.02;
      return fitCamera(depth + 1);
    }
    return { tx: target.x, ty: target.y, tz: target.z, dist };
  }

  /** Screen-space plate layout: plates that overlap on screen (in the question or in the reveal state) are nudged up by the missing height, then the frame is fitted again. */
  function resolvePlates() {
    const plates = content?.ctx.plates ?? [];
    if (plates.length < 2) return;
    for (let pass = 0; pass < 8; pass++) {
      let moved = false;
      const keep = { enter: A.enter, e: A.e, ok: A.ok, dt: A.dt };
      A.enter = 1;
      A.ok = false;
      A.dt = 0;
      if (content) content.ctx.dry = true;
      for (const e of revealed ? [0, 1] : [0]) {
        A.e = e;
        runTicks();
        camera.position.set(fitCur.tx, fitCur.ty, fitCur.tz).addScaledVector(DIR, fitCur.dist);
        camera.lookAt(fitCur.tx, fitCur.ty, fitCur.tz);
        camera.updateMatrixWorld(true);
        const live = plates.filter((sp) => sp.visible && !sp.userData.fixed && sp.scale.x >= sp.userData.sx * 0.12).map((sp) => {
          sp.getWorldPosition(v3);
          const depth = Math.max(0.5, -v3.clone().applyMatrix4(camera.matrixWorldInverse).z);
          v3.project(camera);
          return { sp, x: v3.x, y: v3.y, hw: sp.scale.x / 2 / (tanH * camera.aspect), hh: sp.scale.y / 2 / tanH, depth };
        });
        const W = canvas.clientWidth || 390;
        const H = canvas.clientHeight || 230;
        for (const q of live) {
          // keep every plate inside the canvas and out of the replay button and badge corners
          const u = q.sp.userData;
          if (q.x - q.hw < -0.97) (u.nudgeX = (u.nudgeX ?? 0) + (-0.97 - (q.x - q.hw))), (q.x += -0.97 - (q.x - q.hw)), (moved = true);
          else if (q.x + q.hw > 0.97) (u.nudgeX = (u.nudgeX ?? 0) - (q.x + q.hw - 0.97)), (q.x -= q.x + q.hw - 0.97), (moved = true);
          if (q.y + q.hh > 0.97) (u.nudge = (u.nudge ?? 0) - (q.y + q.hh - 0.97)), (q.y -= q.y + q.hh - 0.97), (moved = true);
          else if (q.y - q.hh < -0.97) (u.nudge = (u.nudge ?? 0) + (-0.97 - (q.y - q.hh))), (q.y += -0.97 - (q.y - q.hh)), (moved = true);
          const rz = { x: 1 - (2 * 56) / W, y: 1 - (2 * 56) / H };
          const bz = { x: revealed ? -1 + (2 * 100) / W : -2, y: 1 - (2 * 40) / H };
          if (q.x + q.hw > rz.x && q.y + q.hh > rz.y) (u.nudge = (u.nudge ?? 0) - (q.y + q.hh - rz.y + 0.01)), (q.y -= q.y + q.hh - rz.y + 0.01), (moved = true);
          if (q.x - q.hw < bz.x && q.y + q.hh > bz.y) (u.nudge = (u.nudge ?? 0) - (q.y + q.hh - bz.y + 0.01)), (q.y -= q.y + q.hh - bz.y + 0.01), (moved = true);
        }
        for (let i = 0; i < live.length; i++) {
          for (let j = i + 1; j < live.length; j++) {
            const a = live[i]!;
            const b = live[j]!;
            const dx = Math.abs(a.x - b.x);
            const dy = Math.abs(a.y - b.y);
            if (dx < 0.004 && dy < 0.004 && a.sp.userData.seq && b.sp.userData.seq) continue; // a deliberate sequence on one spot (running totals)
            if (dx < (a.hw + b.hw) * 0.98 && dy < (a.hh + b.hh) * 0.98) {
              const need = a.hh + b.hh - dy + 0.02; // NDC height to gain
              b.sp.userData.nudge = (b.sp.userData.nudge ?? 0) + need;
              b.y += need;
              moved = true;
            }
          }
        }
      }
      if (content) content.ctx.dry = false;
      A.enter = keep.enter;
      A.e = keep.e;
      A.ok = keep.ok;
      A.dt = keep.dt;
      if (!moved) break;
      fitCur = fitCamera();
    }
  }

  /** Rows of a board never overlap: when the plates (a constant screen size) are taller than the rows at this zoom, the rows are pulled apart and the frame is fitted again. */
  function adjustPitch() {
    const mc = content?.ctx.cols;
    if (!mc?.setPitch) return;
    for (let pass = 0; pass < 5; pass++) {
      camera.position.set(fitCur.tx, fitCur.ty, fitCur.tz).addScaledVector(DIR, fitCur.dist);
      camera.lookAt(fitCur.tx, fitCur.ty, fitCur.tz);
      camera.updateMatrixWorld(true);
      const keep = { enter: A.enter, e: A.e, ok: A.ok, dt: A.dt };
      A.enter = 1;
      A.ok = false;
      A.dt = 0;
      if (content) content.ctx.dry = true;
      let worst = 1;
      for (const e of revealed ? [0, 1] : [0]) {
        A.e = e;
        runTicks();
        for (const col of [mc.left, mc.right]) {
          const rows = col.filter((sp) => sp.scale.x >= sp.userData.sx * 0.12).map((sp) => {
            sp.getWorldPosition(v3);
            v3.project(camera);
            return { y: v3.y, hh: sp.scale.y / tanH };
          }).sort((m, n) => n.y - m.y);
          for (let i = 1; i < rows.length; i++) {
            const pitch = rows[i - 1]!.y - rows[i]!.y;
            const need = (rows[i - 1]!.hh + rows[i]!.hh) / 2 * 1.1 + 0.02; // half heights of the two plates plus a margin, in NDC
            worst = Math.max(worst, need / Math.max(pitch, 0.01));
          }
        }
      }
      if (content) content.ctx.dry = false;
      A.enter = keep.enter;
      A.e = keep.e;
      A.ok = keep.ok;
      A.dt = keep.dt;
      let worstX = 1;
      if (mc.pairs && mc.setSpread) {
        for (const [L, Rr] of mc.pairs) {
          if (L.scale.x < L.userData.sx * 0.12 || Rr.scale.x < Rr.userData.sx * 0.12) continue;
          L.getWorldPosition(v3);
          v3.project(camera);
          const lx = v3.x;
          Rr.getWorldPosition(v3);
          v3.project(camera);
          const need = (L.scale.x + Rr.scale.x) / 2 / (tanH * camera.aspect) * 1.05 + (mc.margin ?? 0.03); // a match board leaves room between the two plates for the connector
          worstX = Math.max(worstX, need / Math.max(Math.abs(v3.x - lx), 0.01));
        }
      }
      if (worst <= 1 && worstX <= 1) break;
      if (worst > 1) mc.setPitch(Math.min(worst * 1.03, 2));
      if (worstX > 1) mc.setSpread?.(Math.min(worstX * 1.03, 1.8));
      fitCur = fitCamera();
    }
  }

  /** The alignment report of the settled content (read by the render audit and the scene gate). */
  function align() {
    const keep = { enter: A.enter, e: A.e, ok: A.ok, dt: A.dt };
    A.enter = 1;
    A.e = revealed ? 1 : 0;
    A.ok = false;
    A.dt = 0;
    if (content) content.ctx.dry = true;
    runTicks();
    const pts = collect();
    if (content) content.ctx.dry = false;
    A.enter = keep.enter;
    A.e = keep.e;
    A.ok = keep.ok;
    A.dt = keep.dt;
    camera.position.set(fitCur.tx, fitCur.ty, fitCur.tz).addScaledVector(DIR, fitCur.dist);
    camera.lookAt(fitCur.tx, fitCur.ty, fitCur.tz);
    camera.updateMatrixWorld(true);
    const b = ndcBox(pts);
    const W = canvas.clientWidth || 390;
    const H = canvas.clientHeight || 230;
    let overlaps = 0;
    let clipped = 0;
    const pairs: string[] = [];
    b.rects.forEach((r, i) => {
      for (let j = i + 1; j < b.rects.length; j++) {
        const q = b.rects[j]!;
        if (Math.abs(r.x - q.x) < (r.hw + q.hw) * 0.96 && Math.abs(r.y - q.y) < (r.hh + q.hh) * 0.96) overlaps++, pairs.push(`${q.t}|${r.t}`);
      }
      const edge = r.x - r.hw < -1 || r.x + r.hw > 1 || r.y - r.hh < -1 || r.y + r.hh > 1;
      const underReplay = r.x + r.hw > 1 - (2 * 56) / W && r.y + r.hh > 1 - (2 * 56) / H; // the replay button, top right
      const underBadge = revealed && r.x - r.hw < -1 + (2 * 100) / W && r.y + r.hh > 1 - (2 * 40) / H; // the check badge, top left (only after the answer)
      if (edge || underReplay || underBadge) clipped++;
    });
    let colsReport: { ok: boolean; lx: number; rx: number } | null = null;
    const mc = content?.ctx.cols;
    if (mc) {
      const proj = (sp: Sprite) => {
        sp.getWorldPosition(v3);
        v3.project(camera);
        return { x: v3.x, y: v3.y };
      };
      const L = mc.left.map(proj);
      const Rr = mc.right.map(proj);
      const spread = (a: { x: number; y: number }[], k: 'x' | 'y') => Math.max(...a.map((q) => q[k])) - Math.min(...a.map((q) => q[k]));
      const equal = (a: { x: number; y: number }[]) => {
        const ys = a.map((q) => q.y).sort((m, n) => m - n);
        const d = ys.slice(1).map((y, i) => y - ys[i]!);
        return !d.length || Math.max(...d) - Math.min(...d) < 0.03;
      };
      colsReport = { ok: spread(L, 'x') < 0.02 && spread(Rr, 'x') < 0.02 && equal(L) && equal(Rr), lx: +spread(L, 'x').toFixed(3), rx: +spread(Rr, 'x').toFixed(3) };
    }
    const mf = minFont(pts);
    return { links: content?.ctx.root.userData.links ?? null, cols: colsReport, pairs: pairs.slice(0, 3), minFont: mf === 999 ? null : +mf.toFixed(1), vw: W, vh: H, cx: +((b.minX + b.maxX) / 4).toFixed(3), widthFrac: +((b.maxX - b.minX) / 2).toFixed(3), heightFrac: +((b.maxY - b.minY) / 2).toFixed(3), overlaps, clipped, drawn: pts.drawn, expect: content?.ctx.expect ?? null, pitch: +DIR.y.toFixed(2), objs: pts.objs.length, plates: b.rects.length, texts: b.rects.map((r) => r.t).filter(Boolean), sig: b.rects.map((r) => `${r.t}@${r.x.toFixed(2)},${r.y.toFixed(2)}`).join('|') };
  }

  function rig() {
    const k = o.reduced ? 1 : ease(A.t / 3);
    if (fitFrom && fitK < 1) fitK = Math.min(1, fitK + A.dt / 0.6);
    const f = fitFrom && fitK < 1 ? { tx: MathUtils.lerp(fitFrom.tx, fitCur.tx, ease(fitK)), ty: MathUtils.lerp(fitFrom.ty, fitCur.ty, ease(fitK)), tz: MathUtils.lerp(fitFrom.tz, fitCur.tz, ease(fitK)), dist: MathUtils.lerp(fitFrom.dist, fitCur.dist, ease(fitK)) } : fitCur;
    let dist = f.dist;
    let yaw = 0;
    let lift = 0;
    if (o.camera.preset === 'dolly-in') dist *= 1 + 0.2 * (1 - k);
    else if (o.camera.preset === 'rise') lift = -0.22 * (1 - k);
    else if (o.camera.preset === 'orbit') yaw = o.reduced ? 0 : Math.sin(A.t * 0.2) * 0.1;
    else yaw = -0.12 * (1 - k);
    const sw = o.reduced || o.camera.drift === 'none' ? 0 : Math.sin(A.t * 0.25) * 0.03;
    cam.x += (px * 0.05 - cam.x) * Math.min(1, A.dt * 4);
    cam.y += (py * 0.03 - cam.y) * Math.min(1, A.dt * 4);
    const dir = new Vector3(Math.sin(yaw + sw + cam.x), DIR.y + lift - cam.y, Math.cos(yaw + sw + cam.x)).normalize();
    if (scene.fog) {
      (scene.fog as Fog).near = dist * 1.7; // the fog follows the framing distance, so a wide scene is not greyed out
      (scene.fog as Fog).far = dist * 5;
    }
    camera.position.set(f.tx, f.ty, f.tz).addScaledVector(dir, dist);
    camera.lookAt(f.tx, f.ty, f.tz);
  }

  function render() {
    A.dt = 0;
    rig();
    runTicks();
    renderer.render(scene, camera);
  }

  function frame(now: number) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const rawDt = last ? (now - last) / 1000 : 0.016;
    last = now;
    A.dt = Math.min(rawDt, 0.1);
    A.t += A.dt;
    A.enter = Math.min(1, A.enter + A.dt / 2.2);
    A.e = revealed && revealAt >= 0 ? MathUtils.clamp((A.t - revealAt) / 3.2, 0, 1) : 0;
    guard.n++;
    if (guard.n > 20 && guard.n <= 100) guard.sum += rawDt;
    if (guard.n === 100 && guard.sum / 80 > 0.05) o.onWeak(); // under 20 fps once warm: the caller draws the 2.5D scene instead
    rig();
    runTicks();
    renderer.render(scene, camera);
    if (meter++ % 30 === 1) {
      canvas.dataset.calls = String(renderer.info.render.calls); // read by the visual check
      canvas.dataset.tris = String(renderer.info.render.triangles);
    }
  }

  const onMove = (ev: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    px = ((ev.clientX - r.left) / r.width - 0.5) * 2;
    py = ((ev.clientY - r.top) / r.height - 0.5) * 2;
    if (o.reduced) render();
  };
  const onLost = (ev: Event) => {
    ev.preventDefault();
    o.onWeak();
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('webglcontextlost', onLost);
  const ro = new ResizeObserver(size);
  ro.observe(canvas);
  size();
  if (!o.reduced) raf = requestAnimationFrame(frame);

  const clear = () => {
    owned.forEach((d) => d.dispose());
    owned = [];
    ticks = [];
    root.clear();
  };

  const engine: Engine = {
    setContent(build, rv, ok, instant) {
      clear();
      revealed = rv;
      A.ok = ok;
      if (o.reduced) {
        A.enter = 1;
        A.e = rv ? 1 : 0;
      } else if (rv) revealAt = instant ? A.t - 4 : A.t + (A.enter < 1 ? (1 - A.enter) * 2.2 : 0.15); // a reveal born on a fresh mount waits for the entrance
      else revealAt = -1;
      const plates: Sprite[] = [];
      const ctx: Ctx = { root, plates, aspect: (canvas.clientWidth || 390) / (canvas.clientHeight || 230), h: canvas.clientHeight || 230, dist: () => fitCur.dist, anim: A, own: (x) => (owned.push(x), x), tick: (f) => void ticks.push(f) };
      setPitch(0.62);
      build(ctx);
      if (ctx.pitch) setPitch(ctx.pitch);
      content = { build, ctx };
      applyPlateUnit(plates);
      scene.children.forEach((b) => b.userData.backdrop && (b.visible = !ctx.focus));
      fitFrom = fitCur;
      fitCur = fitCamera();
      adjustPitch();
      resolvePlates();
      fitCur = fitCamera(); // the nudges moved the box: centre it again
      fitK = o.reduced || !first ? 1 : 0; // the first content snaps to its frame; later ones glide
      first = true;
      if (o.reduced) render();
      canvas.dataset.align = JSON.stringify(align());
    },
    setVisible(v) {
      if (o.reduced || v === visible) return;
      visible = v;
      cancelAnimationFrame(raf);
      last = 0;
      if (v) raf = requestAnimationFrame(frame);
    },
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('webglcontextlost', onLost);
      clear();
      envOwned.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  return engine;
}
