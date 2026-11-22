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
    clock: /horloge|pendule|\bclock\b/i,
  },
  medecine: {
    dog: /chiens?|chiots?|\bdogs?\b|puppy|puppies/i,
    cat: /\bchats?\b|chatons?|\bcats?\b|kittens?/i,
    rabbit: /lapins?|rabbits?|bunny|bunnies/i,
    mouse: /souris|\bmice\b|\bmouse\b/i,
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
  },
};

/** Objects the question names in a text (story and prompt). The gate runs it on both languages. */
export function namedObjects(world: World, text: string): string[] {
  return Object.entries(V[world])
    .filter(([, re]) => re.test(text))
    .map(([id]) => id);
}
