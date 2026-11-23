// Story-element vocabulary (rule "story-objects" of check-scene-spec). Every object a question's own text names must be listed in the spec's
// `requires` and be drawable by its archetype (ARCHETYPE_META.can). A scene that cannot draw a named object does not cover that question.
export type World = 'echecs' | 'medecine' | 'espace';

const V: Record<World, Record<string, RegExp>> = {
  echecs: {
    pawn: /\bpions?\b|\bpawns?\b/i,
    rook: /\btours?\b(?! de)|\brooks?\b/i,
    knight: /cavalier|knight/i,
    bishop: /\bfous?\b|bishop/i,
    queen: /\bdames?\b|\breines?\b|queen/i,
    king: /\brois?\b|\bkings?\b/i,
    board: /échiquier|echiquier|chessboard|\bboard\b/i,
    chair: /chaises?|\bchairs?\b/i,
    trophy: /trophée|trophy|\bcoupes?\b/i,
    person: /joueu(?:r|se)s?|players?|enfants?|children|élèves|pupils/i,
    table: /\btables?\b/i,
    clock: /horloge|pendule|\bclock\b/i,
  },
  medecine: {
    dog: /chiens?|chiots?|\bdogs?\b|puppy|puppies/i,
    cat: /\bchats?\b|chatons?|\bcats?\b|kittens?/i,
    rabbit: /lapins?|rabbits?|bunny|bunnies/i,
    mouse: /souris|\bmice\b|\bmouse\b/i,
    hamster: /hamsters?/i,
    guinea: /cochons? d.inde|guinea pigs?/i,
    ferret: /furets?|ferrets?/i,
    giraffe: /girafes?|giraffes?/i,
    bandage: /pansements?|bandages?/i,
    drop: /gouttes?|\bdrops?\b/i,
    box: /boîtes?|\bboxe?s?\b/i,
    glove: /gants?|gloves?/i,
    treat: /friandises?|\btreats?\b/i,
    kibble: /croquettes?|kibble/i,
    bag: /\bsacs?\b|trousses?|\bbags?\b|\bkits?\b/i,
    mat: /tapis|\bmats?\b|tuiles?|\btiles?\b/i,
    clock: /horloge|pendule|\bclock\b/i,
    vial: /flacon|\bvial\b/i,
    scale: /balance|\bscales?\b/i,
    plush: /peluches?|plush|teddy|\bours\b/i,
  },
  espace: {
    rocket: /fusées?|fusee|rockets?/i,
    station: /station/i,
    planet: /planètes?|planete|planets?/i,
    star: /étoiles?|etoiles?|\bstars?\b|constellations?/i,
    moon: /\blunes?\b|\bmoons?\b/i,
    astronaut: /astronautes?|équipage|equipage|\bcrew\b/i,
    comet: /comètes?|comete|comets?/i,
    satellite: /satellites?/i,
    clock: /horloge|\bclock\b/i,
    capsule: /capsules?/i,
    sun: /soleil|\bsun\b/i,
    // nouns the glyph kit cannot draw: a question that names them is refused rather than drawn with a substitute (a star is not a person)
    people: /personnes?|\bgens\b|people|passagers?|passengers?|techniciens?|technicians?/i,
    suit: /combinaisons?|space ?suits?|\bsuits? (?:of|for|up)\b/i,
    panel: /panneaux?|panels?/i,
    crate: /caisses?|\bcrates?\b|cargaisons?/i,
  },
};

/** Container words of "n groups of m" stories, per language: they are the grouping device, drawn as a tray, a table or a crate. */
/** Story object id to the glyph that draws it, when they differ (people are drawn as people, space suits as astronauts in suits). */
export const GLYPH_OF: Record<string, string> = { people: 'person', suit: 'astronaut' };
export const glyphOf = (o: string) => GLYPH_OF[o] ?? o;

export const CONTAINERS = /(?:paquets?|sacs?|boîtes?|rangées?|tables?|packs?|bags?|boxes|rows?|plateaux|trays?|étagères?|shelves|groupes?|groups?|équipes?|teams?|paniers?|baskets?|caisses?|crates?|trousses?|kits?|sachets?|pochettes?|lots?|cartons?|colis|barquettes?|flacons?|vials?|bouquets?|piles?|stacks?|tas|bols?|bowls?|assiettes?|plates?|jars?|pots?)/i;

/** Objects the question names in a text (story and prompt). The gate runs it on both languages. */
export function namedObjects(world: World, text: string): string[] {
  return Object.entries(V[world])
    .filter(([, re]) => re.test(text))
    .map(([id]) => id);
}

/** Words for the accessible labels: fr singular, fr plural, en singular, en plural. Only objects the glyph kit draws. */
export const NOUN: Record<string, [string, string, string, string]> = {
  panel: ['panneau', 'panneaux', 'panel', 'panels'], crate: ['caisse', 'caisses', 'crate', 'crates'], cell: ['bloc', 'blocs', 'block', 'blocks'], pawn: ['pion', 'pions', 'pawn', 'pawns'], rook: ['tour', 'tours', 'rook', 'rooks'], knight: ['cavalier', 'cavaliers', 'knight', 'knights'],
  bishop: ['fou', 'fous', 'bishop', 'bishops'], queen: ['dame', 'dames', 'queen', 'queens'], king: ['roi', 'rois', 'king', 'kings'],
  person: ['joueur', 'joueurs', 'player', 'players'], chair: ['chaise', 'chaises', 'chair', 'chairs'], dog: ['chien', 'chiens', 'dog', 'dogs'],
  cat: ['chat', 'chats', 'cat', 'cats'], rabbit: ['lapin', 'lapins', 'rabbit', 'rabbits'], mouse: ['souris', 'souris', 'mouse', 'mice'], hamster: ['hamster', 'hamsters', 'hamster', 'hamsters'], guinea: ['cochon d’Inde', 'cochons d’Inde', 'guinea pig', 'guinea pigs'], ferret: ['furet', 'furets', 'ferret', 'ferrets'], giraffe: ['girafe', 'girafes', 'giraffe', 'giraffes'],
  plush: ['peluche', 'peluches', 'plush toy', 'plush toys'], bandage: ['pansement', 'pansements', 'bandage', 'bandages'], drop: ['goutte', 'gouttes', 'drop', 'drops'],
  box: ['boîte', 'boîtes', 'box', 'boxes'], glove: ['gant', 'gants', 'glove', 'gloves'], treat: ['friandise', 'friandises', 'treat', 'treats'],
  kibble: ['croquette', 'croquettes', 'kibble piece', 'kibble pieces'], bag: ['sac', 'sacs', 'bag', 'bags'], mat: ['tapis', 'tapis', 'mat', 'mats'],
  star: ['étoile', 'étoiles', 'star', 'stars'], planet: ['planète', 'planètes', 'planet', 'planets'], moon: ['lune', 'lunes', 'moon', 'moons'],
  rocket: ['fusée', 'fusées', 'rocket', 'rockets'], astronaut: ['astronaute', 'astronautes', 'astronaut', 'astronauts'], comet: ['comète', 'comètes', 'comet', 'comets'],
  satellite: ['satellite', 'satellites', 'satellite', 'satellites'], capsule: ['capsule', 'capsules', 'capsule', 'capsules'], sun: ['soleil', 'soleils', 'sun', 'suns'],
};
/** `{name:one|many}` alt fragment for an object, e.g. nounAlt('items', 'pawn') = "{items} {items:pion|pions}" in fr. */
export function nounAlt(name: string, g: string): { fr: string; en: string } {
  const n = NOUN[g] ?? NOUN.star!;
  return { fr: `{${name}} {${name}:${n[0]}|${n[1]}}`, en: `{${name}} {${name}:${n[2]}|${n[3]}}` };
}
