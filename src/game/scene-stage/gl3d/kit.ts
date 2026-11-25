// Shared 3D kit: environments per world, number plates, counted-object instancing, sparkles, reveal helpers. Kind low-poly look, warm palette.
import {
  AmbientLight, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, DirectionalLight, DynamicDrawUsage, Fog, HemisphereLight, InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  type Material, Object3D, PlaneGeometry, Points, PointsMaterial, SRGBColorSpace, Sprite, SpriteMaterial, type Scene,
} from 'three';
import type { Ctx } from './engine';
import { gantryGeo } from './geo';
import { clinicProps, hallFloorTexture, hallProps } from './env-props';

export const ease = (x: number) => 1 - (1 - MathUtils.clamp(x, 0, 1)) ** 3;
/** Overshoot pop-in, 0 to 1 (then settles). */
export const pop = (x: number) => {
  const c = MathUtils.clamp(x, 0, 1) - 1;
  return 1 + 2.7 * c ** 3 + 1.7 * c ** 2;
};
/** Arc between two points: f in 0..1, h is the peak height. */
export const arc = (a: number, b: number, f: number, h: number): { v: number; y: number } => ({ v: MathUtils.lerp(a, b, f), y: Math.sin(Math.PI * MathUtils.clamp(f, 0, 1)) * h });
/** Staggered progress of item i of n inside a window [from, to] of the reveal: 0..1. */
export const stag = (e: number, i: number, n: number, from = 0.15, to = 0.85, len = 0.25) => ease((e - (from + ((to - from - len) * i) / Math.max(n - 1, 1))) / len);

export const PAL = { gold: '#ffd166', amber: '#ffb347', teal: '#4fd1c5', pink: '#ff8fb1', lime: '#b6e35a', cream: '#fff3d6', ink: '#2d2140', red: '#e8553d' } as const;

export type EnvTheme = 'space' | 'hall' | 'clinic';
const THEME = {
  space: { bg: '#2a2342', wall: '#6a5584', floor: '#d9b58a', win: '#0f1636', hemi: ['#ffe9c7', '#6b4f7a'] as const },
  hall: { bg: '#7a5230', wall: '#e3b98a', floor: '#ecdcb4', win: '#c3e5f8', hemi: ['#fff6e0', '#a07850'] as const },
  clinic: { bg: '#dff5ee', wall: '#c8eee4', floor: '#f6ecd6', win: '#f3fffb', hemi: ['#ffffff', '#8fcfc0'] as const },
};
const LIGHT: Record<string, { c: string; p: [number, number, number] }> = {
  'warm-left': { c: '#ffd9a0', p: [-7, 9, 5] },
  'cool-top': { c: '#dce9ff', p: [0, 11, 4] },
  'rim-right': { c: '#ffd2b0', p: [7, 8, 3] },
  sunrise: { c: '#ffc78a', p: [-6, 6, 6] },
  'cool-morning': { c: '#e0ecff', p: [-4, 10, 5] },
  'ceiling-lamp': { c: '#fff0cf', p: [0, 11, 3] },
  'window-morning': { c: '#fff1d6', p: [3, 9, 6] },
  'pastel-evening': { c: '#ffd6e5', p: [5, 8, 5] },
};

/** The lit room: floor, back wall with a window onto the world's horizon, a key light with soft shadows, fill, and the world's backdrop prop (gantry for space). */
const VARIANT: Record<string, { wall: string; floor?: string; bg: string }[]> = {
  hall: [{ wall: '#e3b98a', bg: '#7a5230' }, { wall: '#d9a9a0', bg: '#6b3f3f' }, { wall: '#c9c08a', bg: '#5d5a2e' }],
  clinic: [{ wall: '#c8eee4', bg: '#dff5ee' }, { wall: '#f6d9e6', bg: '#fbe9f1' }, { wall: '#dcd7f5', bg: '#ece9fb' }],
  space: [{ wall: '#6a5584', bg: '#2a2342' }, { wall: '#4f6a8a', bg: '#1f2d45' }, { wall: '#7a5a74', bg: '#35243a' }],
};
export function buildEnv(scene: Scene, theme: EnvTheme, light: string, own: <T extends { dispose(): void }>(x: T) => T, variant = 0) {
  const T = { ...THEME[theme], ...VARIANT[theme]![variant % 3]! };
  const L = LIGHT[light] ?? LIGHT['cool-top']!;
  scene.background = new Color(T.bg);
  scene.fog = new Fog(T.bg, 18, 40);
  scene.add(new HemisphereLight(T.hemi[0], T.hemi[1], 0.9));
  scene.add(new AmbientLight('#ffffff', 0.15));
  const sun = new DirectionalLight(L.c, 2.1);
  sun.position.set(...L.p);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -4 });
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 4;
  scene.add(sun);
  const slab = (w: number, h: number, color: string, x: number, y: number, z: number, rx = 0, basic = false) => {
    const g = own(new PlaneGeometry(w, h));
    const m = own(basic ? new MeshBasicMaterial({ color }) : new MeshStandardMaterial({ color, roughness: 0.95 }));
    const mesh = new Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    mesh.receiveShadow = !basic;
    scene.add(mesh);
  };
  if (theme === 'hall') {
    const fl = new Mesh(own(new PlaneGeometry(34, 18)), own(new MeshStandardMaterial({ map: hallFloorTexture(own), roughness: 0.8 })));
    fl.rotation.x = -Math.PI / 2;
    fl.receiveShadow = true;
    scene.add(fl);
  } else slab(34, 18, T.floor, 0, 0, 0, -Math.PI / 2);
  slab(34, 12, T.wall, 0, 4, -5);
  if (theme === 'space') slab(9.4, 4.4, T.win, 0, 4.6, -4.95, 0, true);
  scene.children.forEach((o) => theme === 'space' && o.position.z === -4.95 && (o.userData.backdrop = true));
  if (theme === 'space') {
    const a = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) a.set([(((i * 37) % 100) / 100) * 9 - 4.5, (((i * 61) % 100) / 100) * 3.8 + 2.8, -4.85], i * 3);
    const g = own(new BufferGeometry().setAttribute('position', new BufferAttribute(a, 3)));
    const stars = new Points(g, own(new PointsMaterial({ color: '#fff3c4', size: 0.07, sizeAttenuation: true })));
    stars.userData.backdrop = true;
    scene.add(stars);
    const gm = new Mesh(own(gantryGeo()), own(new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7 })));
    gm.position.set(0, 0, -4.4);
    gm.castShadow = true;
    gm.userData.backdrop = true;
    scene.add(gm);
  } else {
    if (theme === 'hall') hallProps(scene, own);
    else clinicProps(scene, own);
  }
}

/** Solid-colour material for vertex-coloured geometry; one per content. */
export function solid(c: Ctx, roughness = 0.65) {
  return c.own(new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness }));
}
/** A plain colour material (liquids, glass). */
export function colour(c: Ctx, hex: string, o: { emissive?: number; opacity?: number; roughness?: number } = {}) {
  return c.own(new MeshStandardMaterial({ color: hex, emissive: o.emissive ? hex : '#000000', emissiveIntensity: o.emissive ?? 0, roughness: o.roughness ?? 0.4, transparent: o.opacity !== undefined, opacity: o.opacity ?? 1, depthWrite: o.opacity === undefined }));
}
export function mesh(c: Ctx, g: BufferGeometry, m: Material, shadow = true) {
  const x = new Mesh(c.own(g), m);
  x.castShadow = shadow;
  x.receiveShadow = shadow;
  c.root.add(x);
  return x;
}

/** A number plate: a camera-facing sprite with canvas-drawn digits. */
export function plate(c: Ctx, text: string, tone: 'n' | 'q' | 'win' | 'out', x: number, y: number, z: number, s = 1, wrap = 9): Sprite {
  const k = Math.max(s, 1.25); // below 1.25 the digits fall under 11 px on a 390 px phone
  // a long text wraps on word boundaries (`wrap` characters a line, up to 4 lines) so a plate never grows wider than its slot
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > wrap) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  if (lines.length > 4) lines.splice(3, lines.length - 3, lines.slice(3 - 0).join(' ').slice(0, 12));
  const longest = Math.max(...lines.map((l) => l.length));
  const W = Math.min(1100, Math.max(120, 56 + 46 * longest));
  const H = 128 + (lines.length - 1) * 92;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = tone === 'win' ? PAL.gold : tone === 'q' ? PAL.cream : tone === 'out' ? '#ffd9d0' : '#ffffff';
  g.strokeStyle = '#4a3a5a';
  g.lineWidth = 8;
  g.beginPath();
  g.roundRect(8, 8, W - 16, H - 16, 30);
  g.fill();
  g.stroke();
  g.fillStyle = PAL.ink;
  g.font = 'bold 84px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((l, q) => g.fillText(l, W / 2, (H / (lines.length * 2)) * (2 * q + 1) + 4, W - 30));
  const tex = c.own(new CanvasTexture(cv));
  tex.colorSpace = SRGBColorSpace;
  const sp = new Sprite(c.own(new SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: false })));
  sp.position.set(x, y, z);
  // a plate is a screen-constant sprite: the engine sets sx and sy (a fraction of the canvas) from its own size, so a digit reads the same on a 320 px phone and on a TV
  sp.userData.krel = k / 1.25;
  sp.userData.ar = W / H;
  sp.userData.hm = H / 128;
  sp.userData.sx = 0.05 * (k / 1.25) * (H / 128) * (W / H);
  sp.userData.sy = 0.05 * (k / 1.25) * (H / 128);
  sp.userData.text = text;
  sp.userData.lines = lines.length;
  sp.userData.texH = H; // the font is 84 px of a 128 px (one line) or 200 px (two lines) texture: the legibility floor reads it back
  sp.scale.set(sp.userData.sx, sp.userData.sy, 1);
  sp.renderOrder = 10;
  c.root.add(sp);
  c.plates?.push(sp);
  return sp;
}
/** Scale a plate to k times its natural size (0 hides it): the pop-in of a reveal plate. */
export const fit = (sp: Sprite, k: number) => sp.scale.set(sp.userData.sx * k, sp.userData.sy * k, 1);

const tc = new Color();
/** n identical objects as ONE instanced draw call. `set` places object k (position, uniform scale, y rotation, optional colour). */
export function counted(c: Ctx, geo: BufferGeometry, m: MeshStandardMaterial, n: number) {
  const im = new InstancedMesh(c.own(geo), m, Math.max(n, 1));
  im.instanceMatrix.setUsage(DynamicDrawUsage);
  im.castShadow = true;
  im.receiveShadow = true;
  im.frustumCulled = false;
  im.count = n;
  im.userData.counted = true;
  c.root.add(im);
  const o = new Object3D();
  return {
    mesh: im,
    set(k: number, x: number, y: number, z: number, s = 1, ry = 0, rx = 0) {
      o.position.set(x, y, z);
      o.scale.setScalar(Math.max(s, 0.001));
      o.rotation.set(rx, ry, 0);
      o.updateMatrix();
      im.setMatrixAt(k, o.matrix);
    },
    /** Tint object k (multiplies its vertex colours): 1,1,1 is untouched. */
    tint(k: number, r: number, g: number, b: number) {
      im.setColorAt(k, tc.setRGB(r, g, b));
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    },
    commit() {
      im.instanceMatrix.needsUpdate = true;
    },
  };
}

/** A small burst of golden sparkles (one Points draw call). Call `go(x, y, z)` to fire it; it fades by itself. */
export function sparkles(c: Ctx, n = 28) {
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const g = c.own(new BufferGeometry().setAttribute('position', new BufferAttribute(pos, 3)));
  const m = c.own(new PointsMaterial({ color: PAL.gold, size: 0.22, transparent: true, opacity: 0, depthWrite: false }));
  const pts = new Points(g, m);
  pts.frustumCulled = false;
  c.root.add(pts);
  let life = 0;
  c.tick((a) => {
    if (life <= 0) return;
    life -= a.dt;
    for (let i = 0; i < n; i++) {
      pos[i * 3] += vel[i * 3]! * a.dt;
      pos[i * 3 + 1] += (vel[i * 3 + 1]! -= 5 * a.dt) * a.dt;
      pos[i * 3 + 2] += vel[i * 3 + 2]! * a.dt;
    }
    g.attributes.position!.needsUpdate = true;
    m.opacity = Math.max(0, Math.min(1, life * 1.5));
  });
  return {
    go(x: number, y: number, z: number) {
      if (c.dry) return;
      for (let i = 0; i < n; i++) {
        const th = (i / n) * Math.PI * 2;
        pos.set([x, y, z], i * 3);
        vel.set([Math.cos(th) * (1.2 + (i % 3) * 0.5), 2.2 + (i % 4) * 0.6, Math.sin(th) * 1.2], i * 3);
      }
      life = 1.1;
    },
  };
}

/** One layout rule for every plate of a content: plates that overlap on screen are pushed apart (the later one moves up, then sideways) so no label sits on another. */
export function separatePlates(plates: Sprite[]) {
  const live = plates.filter((p) => p.parent);
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i]!;
        const b = live[j]!;
        const dx = Math.abs(a.position.x - b.position.x);
        const dy = Math.abs(a.position.y - b.position.y);
        if (dx < 0.01 && dy < 0.01) continue; // plates that share a spot are a deliberate sequence (running totals): never pushed apart
        const w = (a.userData.sx + b.userData.sx) / 2;
        const h = (a.userData.sy + b.userData.sy) / 2;
        if (dx < w * 0.98 && dy < h * 0.98 && Math.abs(a.position.z - b.position.z) < 3) {
          b.position.y += h - dy + 0.05;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}
