// Props of the chess hall and the clinic: window with a sky and clouds, banners, trophy shelf, table with a chess set, lamp pool; pastel walls, rug, plants, shelf, paw sign.
// All merged into a few vertex-coloured meshes (a handful of draw calls), generated in code.
import { AdditiveBlending, BoxGeometry, CanvasTexture, CircleGeometry, type BufferGeometry, ConeGeometry, CylinderGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, RepeatWrapping, type Scene, SphereGeometry, SRGBColorSpace } from 'three';
import { at, merge, paint, tokenGeo } from './geo';

type Own = <T extends { dispose(): void }>(x: T) => T;

const canvasTex = (own: Own, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  const t = own(new CanvasTexture(cv));
  t.colorSpace = SRGBColorSpace;
  return t;
};

/** The sky seen through the window: gradient and soft clouds. */
function sky(own: Own, scene: Scene, top: string, bottom: string) {
  const tex = canvasTex(own, 256, 128, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [x, y, r] of [[50, 40, 18], [70, 44, 22], [92, 42, 16], [180, 70, 20], [204, 74, 16], [160, 74, 14]] as const) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  });
  const m = new Mesh(own(new PlaneGeometry(9.4, 4.4)), own(new MeshBasicMaterial({ map: tex })));
  m.position.set(0, 4.6, -4.95);
  scene.add(m);
  // frame and cross bars
  const f = own(new MeshStandardMaterial({ color: '#fff8ea', roughness: 0.6 }));
  const bar = (w: number, h: number, x: number, y: number) => {
    const b = new Mesh(own(new BoxGeometry(w, h, 0.25)), f);
    b.position.set(x, y, -4.85);
    scene.add(b);
  };
  bar(9.8, 0.25, 0, 6.9);
  bar(9.8, 0.25, 0, 2.3);
  bar(0.25, 4.7, -4.8, 4.6);
  bar(0.25, 4.7, 4.8, 4.6);
  bar(0.12, 4.4, 0, 4.6);
  bar(9.4, 0.12, 0, 4.6);
}

const ring = (own: Own, scene: Scene, x: number, z: number, hex: string, r: number, opacity: number) => {
  const m = new Mesh(own(new CircleGeometry(r, 28)), own(new MeshBasicMaterial({ color: hex, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false })));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  scene.add(m);
};

export function hallProps(scene: Scene, own: Own) {
  sky(own, scene, '#6fc0ee', '#eaf7ff');
  const solid = own(new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7 }));
  const add = (g: BufferGeometry, x: number, y: number, z: number) => {
    const m = new Mesh(own(g), solid);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  };
  // pennants on a string across the wall
  const pennants: BufferGeometry[] = [];
  const cols = [0xe8553d, 0xffd166, 0x4fd1c5, 0xff8fb1];
  for (let k = 0; k < 12; k++) pennants.push(paint(new CircleGeometry(0.4, 3), cols[k % 4]!, at(-5.5 + k * 1.0, 7.4 - Math.sin((k / 11) * Math.PI) * -0.3 - 0.2 - Math.sin((k / 11) * Math.PI) * 0.5, 0, 0, 0, Math.PI)));
  add(merge(pennants), 0, 0, -4.7);
  // trophy shelf, left
  const shelf: BufferGeometry[] = [paint(new BoxGeometry(3.2, 0.14, 0.7), 0x9b6633, at(0, 0, 0))];
  for (const [x, s] of [[-1.1, 1], [0, 1.25], [1.1, 1]] as const) shelf.push(paint(tokenGeo('trophy').scale(s, s, s), 0xffffff, at(x, 0.08, 0)));
  add(merge(shelf), -7.4, 3.6, -4.4);
  // table with a chess set, right
  const table: BufferGeometry[] = [paint(new BoxGeometry(3.4, 0.16, 1.5), 0xc98a4b, at(0, 1.4, 0))];
  for (const x of [-1.5, 1.5]) for (const z of [-0.6, 0.6]) table.push(paint(new BoxGeometry(0.16, 1.4, 0.16), 0x9b6633, at(x, 0.7, z)));
  table.push(paint(new BoxGeometry(1.5, 0.06, 1.5), 0xf1d9b5, at(0, 1.5, 0)));
  for (const [x, n] of [[-0.4, 'king'], [0.1, 'queen'], [0.5, 'knight']] as const) table.push(paint(tokenGeo(n).scale(0.6, 0.6, 0.6), 0xffffff, at(x, 1.5, 0.1)));
  add(merge(table), 7.0, 0, -3.2);
  // hanging lamp over the middle and its warm pool of light on the floor
  add(merge([paint(new CylinderGeometry(0.03, 0.03, 2, 4), 0x2d2140, at(0, 8, 0)), paint(new ConeGeometry(0.9, 0.6, 12), 0xe8553d, at(0, 6.9, 0))]), 0, 0, -1.5);
  ring(own, scene, 0, 0.6, '#ffe2a8', 6.5, 0.22);
  const lamp = new PointLight('#ffd9a0', 18, 14);
  lamp.position.set(0, 6.4, -0.5);
  scene.add(lamp);
}

export function clinicProps(scene: Scene, own: Own) {
  sky(own, scene, '#8fd3f4', '#f4fcff');
  const solid = own(new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7 }));
  const add = (g: BufferGeometry, x: number, y: number, z: number) => {
    const m = new Mesh(own(g), solid);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  };
  // soft wainscot band along the wall
  add(paint(new BoxGeometry(34, 1.6, 0.2), 0xfff3d6, at(0, 0, 0)), 0, 0.8, -4.9);
  // plants in pots, both sides
  const plant = (): BufferGeometry => merge([paint(new CylinderGeometry(0.45, 0.35, 0.7, 10), 0xe8956b, at(0, 0.35, 0)), ...[0, 1, 2, 3, 4].map((k) => paint(new SphereGeometry(0.4, 8, 6), k % 2 ? 0x6bbf4a : 0x8fd35a, at(Math.cos(k * 1.3) * 0.3, 1.0 + (k % 3) * 0.3, Math.sin(k * 1.3) * 0.3)))]);
  add(plant(), -7.2, 0, -3.5);
  add(plant(), 7.2, 0, -3.5);
  // shelf with boxes and a bottle row, left wall
  const shelf: BufferGeometry[] = [paint(new BoxGeometry(3.2, 0.14, 0.7), 0xe8b04a, at(0, 0, 0))];
  [0xff8fb1, 0x4fd1c5, 0xffd166, 0xb6e35a].forEach((c, k) => shelf.push(paint(new BoxGeometry(0.55, 0.5 + (k % 2) * 0.2, 0.5), c, at(-1.1 + k * 0.75, 0.35, 0))));
  add(merge(shelf), -7.6, 3.4, -4.5);
  // friendly sign: a paw print on a round plaque (no cross)
  const paw = merge([paint(new CylinderGeometry(0.9, 0.9, 0.12, 20), 0xfff3d6, at(0, 0, 0, Math.PI / 2, 0, 0)), paint(new SphereGeometry(0.28, 8, 6), 0xff8fb1, at(0, -0.15, 0.1)), ...[[-0.35, 0.25], [-0.12, 0.45], [0.12, 0.45], [0.35, 0.25]].map(([x, y]) => paint(new SphereGeometry(0.12, 6, 4), 0xff8fb1, at(x!, y!, 0.1)))]);
  add(paw, 7.4, 4.6, -4.7);
  // round rug in the middle, soft pink with a lighter ring
  const rug = new Mesh(own(new CylinderGeometry(4.4, 4.4, 0.04, 36)), own(new MeshStandardMaterial({ color: '#ffc9d6', roughness: 1 })));
  rug.position.set(0, 0.02, 0.6);
  rug.receiveShadow = true;
  scene.add(rug);
  const rug2 = new Mesh(own(new CylinderGeometry(3.4, 3.4, 0.05, 36)), own(new MeshStandardMaterial({ color: '#fff0f4', roughness: 1 })));
  rug2.position.set(0, 0.03, 0.6);
  scene.add(rug2);
  ring(own, scene, 0, 0.6, '#fff5d6', 6.5, 0.16);
}

/** A checkered floor texture for the hall (warm cream and caramel squares). */
export function hallFloorTexture(own: Own) {
  const t = canvasTex(own, 128, 128, (g) => {
    g.fillStyle = '#f3e3bd';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#cf9a62';
    g.fillRect(0, 0, 64, 64);
    g.fillRect(64, 64, 64, 64);
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(9, 5);
  return t;
}
