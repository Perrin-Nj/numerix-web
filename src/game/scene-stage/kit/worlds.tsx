import type { CSSProperties } from 'react';
import { Station } from './espace';
import './worlds.css';

/** World kits shared by the grid, chart and sky archetypes: a skin (palette, default glyph, mascot) and a backdrop (room) per world. */
export type Skin = { c1: string; c2: string; frame: string; glyph: string; mascot: string; mote: string; wall: [string, string]; table: string };
const SKINS: Record<string, Skin> = {
  echecs: { c1: '#f1d9b5', c2: '#b58863', frame: '#5a3a24', glyph: 'pawn', mascot: 'pawn', mote: 'rgb(255 236 190 / 0.9)', wall: ['#7a65b8', '#4b3b78'], table: '#6d4a33' },
  medecine: { c1: '#f2fbf8', c2: '#bfe6dc', frame: '#8ac7ba', glyph: 'mat', mascot: 'dog', mote: 'rgb(255 255 255 / 0.9)', wall: ['#e9f7f3', '#bfe6dc'], table: '#d9eee8' },
  espace: { c1: '#1d2d5e', c2: '#2a4084', frame: '#6f86b8', glyph: 'star', mascot: 'astronaut', mote: 'rgb(200 240 255 / 0.9)', wall: ['#1d3a7a', '#0c1633'], table: '#25365f' },
};
export const skinOf = (w: string): Skin => SKINS[w] ?? SKINS.echecs!;

/** Room objects a backdrop can draw when the question names them (they join `can` of every archetype that uses the backdrop). */
export const BACKDROP_CAN: Record<string, readonly string[]> = {
  echecs: ['trophy', 'clock', 'chair', 'board'],
  medecine: ['clock', 'scale', 'vial', 'plush', 'box', 'bag'],
  espace: ['station', 'clock', 'planet', 'sun', 'moon', 'star'],
};

export const ROOMS: Record<string, readonly string[]> = { echecs: ['club', 'hall', 'study'], medecine: ['clinic', 'waiting', 'pets', 'reception', 'cupboard', 'exam'], espace: ['control', 'cargo', 'greenhouse', 'surface'] };

/** The room a question stands in: the words of its text first (chairs and tables: the tournament hall; a crate: the cargo bay), then its id for variety. */
export function roomFor(world: string, text: string, id: string): string {
  const list = ROOMS[world] ?? ROOMS.echecs!;
  const t = text.toLowerCase();
  if (world === 'echecs' && /chaise|chair|table|tournoi|tournament|joueur|player/.test(t)) return 'hall';
  if (world === 'medecine' && /horloge|horaire|clock|attente|waiting/.test(t)) return 'waiting';
  if (world === 'medecine' && /rendez-vous|appointment|registre|register|dossier|fiche|inscrit|visites?|visits?|carnet|notebook/.test(t)) return 'reception';
  if (world === 'medecine' && /pansement|trousse|placard|bandage|first.aid|gants?|gloves?|stock|réserve|sacs?|bags?|boîtes?|boxes|box|rangement|livraison|delivery/.test(t)) return 'cupboard';
  if (world === 'medecine' && /pèse|peser|balance|scale|masse|mass|dose|goutte|drops?|flacon|vial|température|temperature/.test(t)) return 'exam';
  if (world === 'medecine' && /chien|chat|lapin|souris|dog|cat|rabbit|mouse|puppy|chiot|kitten/.test(t)) return 'pets';
  if (world === 'espace' && /caisse|crate|cargo|fusée|rocket|colis|paquet/.test(t)) return 'cargo';
  if (world === 'espace' && /panneau|panel|plante|plant|serre|greenhouse|jardin/.test(t)) return 'greenhouse';
  if (world === 'espace' && /planète|planet|surface|mars|lune|moon/.test(t)) return 'surface';
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
  return list[h % list.length]!;
}

export function Backdrop({ world, requires, room, seed, lean }: { world: string; requires: readonly string[]; room?: string; seed?: string; lean?: boolean }) {
  const sk = skinOf(world);
  const has = (o: string) => requires.includes(o);
  return (
    <div className="wd-wall" style={{ '--w1': sk.wall[0], '--w2': sk.wall[1], '--tb': sk.table, '--fr': sk.frame } as CSSProperties} data-world={world} data-room={room ?? ROOMS[world]?.[0]}>
      <i className="wd-win" />
      <i className="wd-shelf" />
      <i className="wd-table" />
      {world === 'espace' && <div className="wd-station"><Station /></div>}
      {has('trophy') && <i className="wd-ob wd-trophy" />}
      {has('clock') && <i className="wd-ob wd-clock" />}
      {has('scale') && <i className="wd-ob wd-scale" />}
      {has('vial') && <i className="wd-ob wd-vial" />}
      {has('plush') && <i className="wd-ob wd-plush" />}
      {has('chair') && <i className="wd-ob wd-chair" />}
      {has('box') && <i className="wd-ob wd-box" />}
      {has('bag') && <i className="wd-ob wd-bag" />}
      {(has('planet') || has('moon') || has('sun') || has('star')) && world === 'espace' && <i className="wd-ob wd-planet" />}
    </div>
  );
}
