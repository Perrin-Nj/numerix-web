// Low-poly geometry made in code: one vertex-coloured BufferGeometry per object, so each counted object is one draw call (or one InstancedMesh).
import { BoxGeometry, BufferAttribute, ExtrudeGeometry, Shape, type BufferGeometry, Color, ConeGeometry, CylinderGeometry, Euler, Matrix4, OctahedronGeometry, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const at = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(rx, ry, rz)), new Vector3(1, 1, 1));
export function paint(g: BufferGeometry, hex: number, m: Matrix4): BufferGeometry {
  const p = g.toNonIndexed();
  p.applyMatrix4(m);
  const c = new Color(hex);
  const n = p.attributes.position!.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  p.setAttribute('color', new BufferAttribute(a, 3));
  p.deleteAttribute('uv');
  g.dispose();
  return p;
}
export const merge = (parts: BufferGeometry[]) => {
  const g = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return g;
};

/** A rocket standing on y=0, about 3.7 units tall. */
export function rocketGeo(): BufferGeometry {
  const fin = (a: number) => paint(new BoxGeometry(0.1, 0.9, 0.7), 0xe8553d, at(Math.sin(a) * 0.6, 0.45, Math.cos(a) * 0.6, 0, a, 0));
  return merge([
    paint(new CylinderGeometry(0.45, 0.52, 2.2, 8), 0xfff1d6, at(0, 1.2, 0)),
    paint(new CylinderGeometry(0.47, 0.47, 0.18, 8), 0xe8553d, at(0, 1.9, 0)),
    paint(new ConeGeometry(0.45, 0.95, 8), 0xe8553d, at(0, 2.775, 0)),
    paint(new SphereGeometry(0.2, 6, 4), 0x6ec6ff, at(0, 1.5, 0.42)),
    paint(new CylinderGeometry(0.3, 0.38, 0.2, 8), 0x7a6a5a, at(0, 0.05, 0)),
    fin(0),
    fin((Math.PI * 2) / 3),
    fin((Math.PI * 4) / 3),
  ]);
}
/** An open wooden crate, w wide, walls 0.7 high. */
export function crateGeo(w = 2): BufferGeometry {
  const wall = (x: number, z: number, sx: number, sz: number) => paint(new BoxGeometry(sx, 0.7, sz), 0xc98a4b, at(x, 0.35, z));
  const h = w / 2;
  return merge([paint(new BoxGeometry(w, 0.12, w), 0x9b6633, at(0, 0.06, 0)), wall(0, h, w, 0.12), wall(0, -h, w, 0.12), wall(h, 0, 0.12, w), wall(-h, 0, 0.12, w), paint(new BoxGeometry(w + 0.04, 0.1, 0.2), 0xe8b04a, at(0, 0.62, h + 0.02))]);
}
/** Steel base, lid and a pipe of a tank, 3.3 tall; the glass and the liquid are separate meshes. */
export function tankFrameGeo(): BufferGeometry {
  return merge([paint(new CylinderGeometry(0.95, 1.0, 0.25, 16), 0x6b5b7a, at(0, 0.12, 0)), paint(new CylinderGeometry(0.9, 0.9, 0.2, 16), 0x6b5b7a, at(0, 3.2, 0)), paint(new CylinderGeometry(0.1, 0.1, 3.1, 6), 0xe8b04a, at(0.95, 1.6, 0))]);
}
/** Gantry: two towers, cross beams and braces, about 11 wide and 8 tall. */
export function gantryGeo(): BufferGeometry {
  const b = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rz = 0) => paint(new BoxGeometry(sx, sy, sz), 0xe8b04a, at(x, y, z, 0, 0, rz));
  const parts: BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    parts.push(b(s * 4.6, 4, 0, 0.3, 8, 0.3), b(s * 5.4, 4, 0, 0.3, 8, 0.3));
    for (let k = 0; k < 4; k++) parts.push(b(s * 5, 1 + k * 2, 0, 0.9, 0.12, 0.12, 0.7 * (k % 2 ? 1 : -1)));
  }
  parts.push(b(0, 7.9, 0, 11, 0.3, 0.3)); // no low cross beam: it would cut through the plates
  return merge(parts);
}

export type Token = string;
/** The counted objects, each about 0.8 tall and standing on y=0, one vertex-coloured geometry (one instanced draw call). */
export function tokenGeo(t: Token): BufferGeometry {
  switch (t) {
    case 'mini': {
      const g = rocketGeo();
      g.scale(0.3, 0.3, 0.3);
      return g;
    }
    case 'panel':
      return merge([paint(new BoxGeometry(0.8, 0.8, 0.08), 0x3d6fd1, at(0, 0.5, 0, -0.35, 0, 0)), paint(new BoxGeometry(0.06, 0.4, 0.06), 0xe8b04a, at(0, 0.2, -0.1))]);
    case 'flask':
      return merge([paint(new CylinderGeometry(0.1, 0.34, 0.6, 8), 0x8fe3d6, at(0, 0.3, 0)), paint(new CylinderGeometry(0.1, 0.1, 0.28, 8), 0xdff7f2, at(0, 0.72, 0))]);
    case 'tool':
      return merge([paint(new CylinderGeometry(0.06, 0.06, 0.8, 6), 0x9b6633, at(0, 0.4, 0)), paint(new BoxGeometry(0.46, 0.16, 0.12), 0xb8c2cc, at(0, 0.78, 0))]);
    case 'card': {
      const plate = new CylinderGeometry(0.5, 0.5, 0.1, 20);
      plate.scale(1.25, 1, 1);
      return merge([paint(plate, 0xfff3d6, at(0, 0.45, 0, Math.PI / 2, 0, 0)), paint(new SphereGeometry(0.14, 6, 4), 0xff8fb1, at(0, 0.45, 0.07)), paint(new SphereGeometry(0.07, 6, 4), 0xff8fb1, at(-0.2, 0.62, 0.07)), paint(new SphereGeometry(0.07, 6, 4), 0xff8fb1, at(0.2, 0.62, 0.07))]);
    }
    case 'comet':
      return merge([paint(new OctahedronGeometry(0.34, 0), 0xcfe8ff, at(0, 0.5, 0)), paint(new ConeGeometry(0.28, 1.1, 6), 0x8fc7ff, at(-0.7, 0.5, 0, 0, 0, Math.PI / 2))]);
    case 'probe':
      return merge([paint(new SphereGeometry(0.3, 8, 6), 0xdfe6ee, at(0, 0.5, 0)), paint(new BoxGeometry(0.9, 0.04, 0.4), 0x3d6fd1, at(0, 0.5, 0)), paint(new CylinderGeometry(0.03, 0.03, 0.5, 4), 0xe8b04a, at(0, 0.95, 0))]);
    case 'canister':
      return merge([paint(new CylinderGeometry(0.3, 0.3, 0.8, 10), 0x4fd1c5, at(0, 0.4, 0)), paint(new CylinderGeometry(0.31, 0.31, 0.12, 10), 0xe8b04a, at(0, 0.55, 0)), paint(new CylinderGeometry(0.1, 0.1, 0.14, 6), 0x6b5b7a, at(0, 0.86, 0))]);
    case 'star': {
      // a real five-point star, standing and facing the camera
      const sh = new Shape();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 0.2 : 0.5;
        const a = Math.PI / 2 + (k * Math.PI) / 5;
        k ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      sh.closePath();
      const g = new ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }).translate(0, 0, -0.1);
      return merge([paint(g, 0xffd166, at(0, 0.55, 0))]);
    }
    case 'person':
      return merge([paint(new CylinderGeometry(0.22, 0.3, 0.55, 8), 0xff8a5c, at(0, 0.28, 0)), paint(new SphereGeometry(0.24, 8, 6), 0xfff1d6, at(0, 0.72, 0)), paint(new SphereGeometry(0.17, 6, 4), 0x6ec6ff, at(0, 0.72, 0.12))]);
    case 'ball':
      return merge([paint(new SphereGeometry(0.34, 8, 6), 0xe8553d, at(0, 0.34, 0)), paint(new ConeGeometry(0.1, 0.14, 5), 0x6bbf4a, at(0, 0.72, 0))]);
    case 'meal':
      return merge([paint(new CylinderGeometry(0.34, 0.3, 0.3, 10), 0xffb347, at(0, 0.15, 0)), paint(new CylinderGeometry(0.28, 0.28, 0.1, 10), 0xb6e35a, at(0, 0.34, 0))]);
    default: {
      return merge([paint(new BoxGeometry(0.7, 0.7, 0.7), 0xc98a4b, at(0, 0.35, 0)), paint(new BoxGeometry(0.72, 0.12, 0.2), 0xe8b04a, at(0, 0.5, 0.36))]);
    }
  }
}
/** Glyph ids of the 2.5D kit (route rows) to the 3D token that stands for them. */
export const tokenOf = (g: string): Token => (({ mini: 'mini', rocket: 'mini', canister: 'canister', tank: 'canister', star: 'star', crew: 'person', astronaut: 'person', suit: 'person', meal: 'meal', tomato: 'ball', panel: 'panel', flask: 'flask', tool: 'tool', card: 'card', comet: 'comet', probe: 'probe', person: 'person' }) as Record<string, string>)[g] ?? 'crate';

/** A little space station: a horizontal hull, a dome, two solar wings and a docking arm; about 5 wide. */
export function stationGeo(): BufferGeometry {
  return merge([
    paint(new CylinderGeometry(0.6, 0.6, 2.6, 10), 0xe9eef5, at(0, 0, 0, 0, 0, Math.PI / 2)),
    paint(new SphereGeometry(0.75, 8, 6), 0xffffff, at(-0.2, 0.55, 0)),
    paint(new SphereGeometry(0.28, 6, 4), 0x6ec6ff, at(-0.2, 0.7, 0.62)),
    paint(new BoxGeometry(1.5, 0.05, 1.0), 0x3d6fd1, at(-1.2, 0, 1.4)),
    paint(new BoxGeometry(1.5, 0.05, 1.0), 0x3d6fd1, at(1.2, 0, 1.4)),
    paint(new BoxGeometry(1.5, 0.05, 1.0), 0x3d6fd1, at(-1.2, 0, -1.4)),
    paint(new BoxGeometry(1.5, 0.05, 1.0), 0x3d6fd1, at(1.2, 0, -1.4)),
    paint(new CylinderGeometry(0.2, 0.2, 1.0, 6), 0xe8b04a, at(1.6, -0.5, 0, 0, 0, 0.6)),
  ]);
}
