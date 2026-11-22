// Real seed questions, one per new archetype (copied from the content repos), routed by route.ts. Used by stories and tests.
import { routeQuestion, type RawQuestion } from '../route';
import type { World } from '../objects';
import type { PilotScene } from './pilot';

const RAW: Record<string, RawQuestion> = {
 "echecsGrid": {
  "id": "echecs.cases.001",
  "quest": "echecs.cases",
  "grade": 1,
  "story": {
   "fr": "Léa joue sur un échiquier de 4 colonnes. On compte depuis la gauche.",
   "en": "Lea plays on a board with 4 columns. We count from the left."
  },
  "prompt": {
   "fr": "Dans quelle colonne est le pion ?",
   "en": "Which column is the pawn in?"
  },
  "visual": {
   "kind": "grid",
   "data": {
    "cols": 4,
    "rows": 4,
    "board": true,
    "cells": [
     {
      "x": 3,
      "y": 2,
      "label": {
       "fr": "img:chess-pawn-b",
       "en": "img:chess-pawn-b"
      }
     }
    ],
    "axes": "numbers",
    "after": {
     "marks": [
      {
       "x": 3,
       "y": 1,
       "tone": "info"
      },
      {
       "x": 3,
       "y": 3,
       "tone": "info"
      },
      {
       "x": 3,
       "y": 4,
       "tone": "info"
      },
      {
       "x": 3,
       "y": 2,
       "tone": "good"
      }
     ]
    }
   }
  },
  "answer": {
   "kind": "numeric",
   "value": 3,
   "calc": "3"
  }
 },
 "echecsBars": {
  "id": "echecs.valeurs.001",
  "quest": "echecs.valeurs",
  "grade": 1,
  "story": {
   "fr": "Aux échecs, un pion vaut 1 point. Un cavalier vaut 3 points.",
   "en": "In chess, a pawn is worth 1 point. A knight is worth 3 points."
  },
  "prompt": {
   "fr": "Combien de points en tout ?",
   "en": "How many points in all?"
  },
  "visual": {
   "kind": "bars",
   "data": {
    "title": {
     "fr": "Points",
     "en": "Points"
    },
    "bars": [
     {
      "label": {
       "fr": "pion",
       "en": "pawn"
      },
      "value": 1,
      "icon": "chess-pawn-b"
     },
     {
      "label": {
       "fr": "cavalier",
       "en": "knight"
      },
      "value": 3,
      "icon": "chess-knight"
     }
    ],
    "max": 5
   }
  },
  "answer": {
   "kind": "numeric",
   "value": 4,
   "calc": "1+3"
  }
 },
 "echecsPicto": {
  "id": "echecs.valeurs.009",
  "quest": "echecs.valeurs",
  "grade": 2,
  "story": {
   "fr": "L’équipe de Noah a 8 pions de 1 point. Elle a aussi 2 tours de 5 points.",
   "en": "Noah’s team has 8 pawns worth 1 point. It also has 2 rooks worth 5 points."
  },
  "prompt": {
   "fr": "Combien de points en tout ?",
   "en": "How many points in all?"
  },
  "visual": {
   "kind": "pictograph",
   "data": {
    "title": {
     "fr": "Pièces",
     "en": "Pieces"
    },
    "each": 1,
    "rows": [
     {
      "label": {
       "fr": "pions (1 point)",
       "en": "pawns (1 point)"
      },
      "count": 8,
      "icon": "chess-pawn-b"
     },
     {
      "label": {
       "fr": "tours (5 points)",
       "en": "rooks (5 points)"
      },
      "count": 2,
      "icon": "chess-rook"
     }
    ]
   }
  },
  "answer": {
   "kind": "numeric",
   "value": 18,
   "calc": "8+2*5"
  }
 },
 "medGrid": {
  "id": "medecine.pansements.001",
  "quest": "medecine.pansements",
  "grade": 3,
  "story": {
   "fr": "Léa range des boîtes de pansements dans la trousse.",
   "en": "Lea puts boxes of bandages in the kit."
  },
  "prompt": {
   "fr": "Il y a 3 boîtes. Chaque boîte contient 5 pansements. Combien de pansements en tout ?",
   "en": "There are 3 boxes. Each box holds 5 bandages. How many bandages in all?"
  },
  "visual": {
   "kind": "grid",
   "data": {
    "cols": 5,
    "rows": 3,
    "cells": [
     {
      "x": 1,
      "y": 1,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 2,
      "y": 1,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 3,
      "y": 1,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 4,
      "y": 1,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 5,
      "y": 1,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 1,
      "y": 2,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 2,
      "y": 2,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 3,
      "y": 2,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 4,
      "y": 2,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 5,
      "y": 2,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 1,
      "y": 3,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 2,
      "y": 3,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 3,
      "y": 3,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 4,
      "y": 3,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     },
     {
      "x": 5,
      "y": 3,
      "label": {
       "fr": "img:bandage",
       "en": "img:bandage"
      }
     }
    ]
   }
  },
  "answer": {
   "kind": "numeric",
   "value": 15,
   "calc": "3*5"
  }
 },
 "medBars": {
  "id": "medecine.dossier.002",
  "quest": "medecine.dossier",
  "grade": 2,
  "story": {
   "fr": "Le diagramme montre les animaux venus cette semaine.",
   "en": "The chart shows the animals that came this week."
  },
  "prompt": {
   "fr": "Combien de chats de plus que d’oiseaux sont venus ?",
   "en": "How many more cats than birds came?"
  },
  "visual": {
   "kind": "bars",
   "data": {
    "title": {
     "fr": "Animaux venus",
     "en": "Animals that came"
    },
    "bars": [
     {
      "label": {
       "fr": "lapins",
       "en": "rabbits"
      },
      "value": 8,
      "icon": "rabbit"
     },
     {
      "label": {
       "fr": "chats",
       "en": "cats"
      },
      "value": 12,
      "icon": "cat"
     },
     {
      "label": {
       "fr": "chiens",
       "en": "dogs"
      },
      "value": 10,
      "icon": "dog"
     },
     {
      "label": {
       "fr": "oiseaux",
       "en": "birds"
      },
      "value": 6
     }
    ],
    "max": 14
   }
  },
  "answer": {
   "kind": "numeric",
   "value": 6,
   "calc": "12-6"
  }
 },
 "medClock": {
  "id": "medecine.horaire.001",
  "quest": "medecine.horaire",
  "grade": 2,
  "story": {
   "fr": "Noah regarde l’horloge de la salle d’attente.",
   "en": "Noah looks at the waiting room clock."
  },
  "prompt": {
   "fr": "Quelle heure est-il ?",
   "en": "What time is it?"
  },
  "visual": {
   "kind": "clock",
   "data": {
    "hour": 4,
    "minute": 0
   }
  },
  "answer": {
   "kind": "choice",
   "correct": "c"
  },
  "choices": [
   {
    "id": "a",
    "text": {
     "fr": "8 h",
     "en": "8:00"
    },
    "misconception": "mis_clock_hands"
   },
   {
    "id": "b",
    "text": {
     "fr": "12 h",
     "en": "12:00"
    },
    "misconception": "mis_clock_hands"
   },
   {
    "id": "c",
    "text": {
     "fr": "4 h",
     "en": "4:00"
    }
   },
   {
    "id": "d",
    "text": {
     "fr": "4 h 15",
     "en": "4:15"
    },
    "random": true
   }
  ]
 },
 "spaceSky": {
  "id": "espace.constellations.101",
  "quest": "espace.constellations",
  "grade": 1,
  "story": {
   "fr": "Numéros des étoiles : 2, 4, 6, 8.",
   "en": "Star numbers: 2, 4, 6, 8."
  },
  "prompt": {
   "fr": "Quel numéro porte l’étoile suivante ?",
   "en": "Which number does the next star have?"
  },
  "answer": {
   "kind": "choice",
   "correct": "a"
  },
  "choices": [
   {
    "id": "a",
    "text": {
     "fr": "10",
     "en": "10"
    }
   },
   {
    "id": "b",
    "text": {
     "fr": "9",
     "en": "9"
    },
    "misconception": "mis_pattern_wrong_rule"
   },
   {
    "id": "c",
    "text": {
     "fr": "12",
     "en": "12"
    },
    "misconception": "mis_skip_count"
   }
  ]
 },
 "spaceGrid": {
  "id": "espace.carte.101",
  "quest": "espace.carte",
  "grade": 1,
  "story": {
   "fr": "Léa va de la serre au dock. Elle passe par le labo. Les colonnes vont de gauche à droite.",
   "en": "Lea goes from the greenhouse to the dock. She passes the lab. Columns go left to right."
  },
  "prompt": {
   "fr": "Dans quelle direction marche-t-elle sur la carte ?",
   "en": "Which way does she walk on the map?"
  },
  "visual": {
   "kind": "grid",
   "data": {
    "cols": 3,
    "rows": 1,
    "cells": [
     {
      "x": 1,
      "y": 1,
      "label": {
       "fr": "serre",
       "en": "greenhouse"
      }
     },
     {
      "x": 2,
      "y": 1,
      "label": {
       "fr": "labo",
       "en": "lab"
      }
     },
     {
      "x": 3,
      "y": 1,
      "label": {
       "fr": "dock",
       "en": "dock"
      }
     }
    ],
    "theme": "space"
   }
  },
  "answer": {
   "kind": "choice",
   "correct": "a"
  },
  "choices": [
   {
    "id": "a",
    "text": {
     "fr": "Vers la droite",
     "en": "To the right"
    }
   },
   {
    "id": "b",
    "text": {
     "fr": "Vers la gauche",
     "en": "To the left"
    },
    "misconception": "mis_direction"
   },
   {
    "id": "c",
    "text": {
     "fr": "Vers le haut",
     "en": "Up"
    },
    "random": true
   }
  ]
 }
};
const go = (w: World, k: string): PilotScene => {
  const r = routeQuestion(w, RAW[k]!);
  if ('skip' in r) throw new Error(`${k}: ${r.skip}`);
  return r;
};
export const SAMPLES = {
  echecsGrid: go('echecs', 'echecsGrid'),
  echecsBars: go('echecs', 'echecsBars'),
  echecsPicto: go('echecs', 'echecsPicto'),
  medGrid: go('medecine', 'medGrid'),
  medBars: go('medecine', 'medBars'),
  medClock: go('medecine', 'medClock'),
  spaceSky: go('espace', 'spaceSky'),
  spaceGrid: go('espace', 'spaceGrid'),
};
