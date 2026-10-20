// The scene library: 8 topic families x 6 set-ups x (wrong, right) = 96 scenes, and how a beat finds its family. Pure.
export const RIGS = ['tower', 'bridge', 'scale', 'jug', 'shelf', 'collide'] as const;
export type Rig = (typeof RIGS)[number];

export const FAMILIES = ['number', 'addsub', 'multdiv', 'fractions', 'measure', 'geometry', 'data', 'time'] as const;
export type Family = (typeof FAMILIES)[number];
export type SceneDef = { id: string; family: Family; rig: Rig; good: boolean };

export const sceneId = (family: Family, rig: Rig, good: boolean) => `${family}.${rig}.${good ? 'ok' : 'ko'}`;
export const SCENES: SceneDef[] = FAMILIES.flatMap((family) => RIGS.flatMap((rig) => [false, true].map((good) => ({ id: sceneId(family, rig, good), family, rig, good }))));
export const SCENE_BY_ID = new Map(SCENES.map((s) => [s.id, s]));

/** Real-object photos (public/objects) each family builds with; the second one is swapped for the world's own object by the component. */
export const SKIN: Record<Family, [string, string]> = {
  number: ['game-die', 'pebble'],
  addsub: ['puzzle-piece', 'chess-pawn'],
  multdiv: ['cookie', 'red-apple'],
  fractions: ['tangerine', 'cookie'],
  measure: ['pencil', 'wrench'],
  geometry: ['puzzle-piece', 'game-die'],
  data: ['coin', 'acorn'],
  time: ['pinecone', 'umbrella'],
};

const VISUAL_FAMILY: Record<string, Family> = { clock: 'time', bars: 'data', pictograph: 'data', fraction: 'fractions', grid: 'geometry', numberline: 'number', dice: 'number' };

/**
 * Topic family of a beat. Order: the server hint `scene_key` ("fractions" or "fractions:misconception-id"), then the
 * kind of picture the question shows, then the skill id (ARI-SEN number sense, A06 or DIV multiply and divide, the rest add and subtract).
 */
export function familyOf(o: { sceneKey?: string | null; visualKind?: string | null; skillId?: string | null }): Family {
  const hint = o.sceneKey?.split(':')[0] as Family | undefined;
  if (hint && (FAMILIES as readonly string[]).includes(hint)) return hint;
  if (o.visualKind && VISUAL_FAMILY[o.visualKind]) return VISUAL_FAMILY[o.visualKind];
  const id = (o.skillId ?? '').toUpperCase();
  if (id.includes('SEN')) return 'number';
  if (/A06|MUL|A07|SOP-A03|DIV/.test(id)) return 'multdiv';
  return 'addsub';
}
