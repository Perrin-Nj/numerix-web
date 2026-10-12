// Story kit per world, fr and en. Slots: {h} hero name, {r} hero role, {p} place, {o} object (plural).
// Each pair is [fr, en]. h: [name, role fr, role en]. op = scene openers, ok = success, dt = detour (typical error),
// su = surprise (random error). No answer is ever written here.
export const KIT = {
  nature: {
    h: [['Mira', 'la jardinière', 'the gardener'], ['Tobi', 'le garde forestier', 'the forest ranger']],
    p: ['dans la forêt de Brume', 'in Mist Forest'],
    o: ['graines', 'seeds'],
    t: [['Le secret des graines endormies', 'The secret of the sleeping seeds'], ['La clairière qui chantait', 'The glade that sang'], ['Le sentier des lucioles', 'The trail of the fireflies']],
    op: [
      ['Le soleil se glisse entre les feuilles {p}. {h}, {r}, marche pieds nus dans la rosée et entend un drôle de bruissement sous la mousse.', 'Sunlight slips between the leaves {p}. {h}, {r}, walks barefoot through the dew and hears a funny rustle under the moss.'],
      ['{h}, {r}, s’arrête au bord de la rivière {p}. Les libellules dansent en rond, comme si elles voulaient montrer un chemin.', '{h}, {r}, stops by the river {p}. The dragonflies dance in circles, as if they wanted to show a path.'],
      ['Une odeur de pluie flotte {p}. {h}, {r}, range sa petite pelle et découvre que le vieux chêne garde un secret dans son tronc.', 'The smell of rain drifts {p}. {h}, {r}, puts down a little shovel and finds that the old oak is hiding a secret in its trunk.'],
    ],
    ok: [
      ['Les {o} frémissent, puis une lueur verte monte du sol. {h} sourit en grand : le chemin s’ouvre devant vous, et c’est ton calcul qui a fait le travail. Bravo, tu avances bien !', 'The {o} quiver, then a green glow rises from the ground. {h} grins: the path opens in front of you, and your math did the work. Well done, you are moving along nicely!'],
      ['Un oiseau siffle trois notes joyeuses et les branches s’écartent. {h} te fait un clin d’œil : c’était exactement ça ! Les {o} brillent comme de petites lampes sur le sentier.', 'A bird whistles three happy notes and the branches part. {h} winks at you: that was exactly it! The {o} shine like little lamps along the trail.'],
      ['La mousse devient toute douce sous les pieds de {h}. Tout s’est mis en place comme prévu grâce à toi. Vous reprenez la route d’un pas léger, les {o} plein les poches.', 'The moss turns soft under the feet of {h}. Everything fell into place as planned, thanks to you. You set off again with a light step, pockets full of {o}.'],
    ],
    dt: [
      ['Les {o} roulent sur un petit sentier voisin. {h} rit doucement : un détour, rien de grave, et il y a de jolies choses à voir par là.', 'The {o} roll onto a little side trail. {h} laughs softly: a detour, nothing serious, and there are pretty things to see that way.'],
      ['Le chemin tourne vers la gauche et {h} suit le ruisseau. Ce n’est pas la route prévue, mais l’eau chante et personne n’est pressé.', 'The path turns left and {h} follows the stream. It is not the planned route, but the water sings and nobody is in a hurry.'],
      ['Une branche basse vous fait changer de direction. {h} hausse les épaules : voilà un détour inattendu, on en profite pour respirer l’air frais.', 'A low branch makes you change direction. {h} shrugs: what an unexpected detour, so you take the chance to breathe the fresh air.'],
    ],
    su: [
      ['Un coup de vent mélange les feuilles et les {o} sautent dans tous les sens. {h} éclate de rire : on respire, on se remet en route, la forêt n’a pas fini de vous surprendre.', 'A gust of wind shuffles the leaves and the {o} jump in every direction. {h} bursts out laughing: take a breath, set off again, the forest is not done surprising you.'],
      ['Plouf ! Une grenouille saute juste devant {h} et tout le monde sursaute. Après un fou rire, les {o} reprennent leur place et l’aventure continue sans souci.', 'Splash! A frog jumps right in front of {h} and everyone startles. After a fit of giggles, the {o} get back in place and the adventure goes on without a worry.'],
      ['Les nuages passent devant le soleil et la clairière devient toute rose. {h} chantonne un air tranquille : rien ne presse, les {o} attendent patiemment la suite.', 'Clouds drift across the sun and the glade turns all pink. {h} hums a calm tune: no rush, the {o} wait patiently for what comes next.'],
    ],
  },
  espace: {
    h: [['Nova', 'la pilote', 'the pilot'], ['Orion', 'l’astronaute', 'the astronaut']],
    p: ['à bord de la station Aurore', 'aboard Aurora Station'],
    o: ['cristaux', 'crystals'],
    t: [['La comète aux trois queues', 'The comet with three tails'], ['Le signal de la lune bleue', 'The blue moon signal'], ['Le voyage de la station Aurore', 'The journey of Aurora Station']],
    op: [
      ['La station Aurore tourne doucement autour d’une planète rose. {h}, {r}, regarde par le hublot et voit passer une pluie de poussière brillante.', 'Aurora Station turns slowly around a pink planet. {h}, {r}, looks out of the porthole and watches a rain of shiny dust drift by.'],
      ['Le tableau de bord clignote {p}. {h}, {r}, ajuste son casque et écoute un petit bip qui n’a jamais sonné comme ça.', 'The dashboard blinks {p}. {h}, {r}, adjusts the helmet and listens to a little beep that never sounded like this before.'],
      ['Il fait nuit partout dehors, mais les lumières de la cabine sont chaudes. {h}, {r}, flotte vers la grande carte du ciel quand un voyant s’allume.', 'It is night everywhere outside, but the cabin lights are warm. {h}, {r}, floats toward the big sky map when a signal lights up.'],
    ],
    ok: [
      ['Le voyant passe au vert et les {o} s’alignent en spirale. {h} lève le pouce : le moteur ronronne, et c’est ton calcul qui a réveillé la bonne commande. Cap sur la prochaine étoile !', 'The light turns green and the {o} line up in a spiral. {h} gives a thumbs up: the engine purrs, and your math woke the right control. Next star, here we come!'],
      ['La station vibre doucement, puis une porte s’ouvre sur un couloir tout illuminé. {h} te remercie d’un grand sourire : les {o} brillent plus fort grâce à toi.', 'The station hums softly, then a door opens onto a brightly lit corridor. {h} thanks you with a big smile: the {o} shine brighter because of you.'],
      ['Bip bip bip, trois notes joyeuses ! Le tableau de bord affiche un grand « parfait » et {h} fait une pirouette en apesanteur. La route vers les étoiles est libre.', 'Beep beep beep, three happy notes! The dashboard shows a big “perfect” and {h} does a pirouette in zero gravity. The road to the stars is clear.'],
    ],
    dt: [
      ['La station dérive vers une petite lune voisine. {h} rit : un détour, pas un problème, et la vue est magnifique par ce hublot.', 'The station drifts toward a small neighboring moon. {h} laughs: a detour, not a problem, and the view from this porthole is wonderful.'],
      ['Le vaisseau tourne autour d’un astéroïde au lieu d’aller droit. {h} note la route dans son carnet : on ira voir ça de près avant de repartir.', 'The ship circles an asteroid instead of going straight. {h} writes the route in a notebook: you will take a close look before setting off again.'],
      ['Les {o} flottent vers une autre porte que prévu. {h} hausse les épaules en apesanteur : changement de cap, on découvre un couloir qu’on n’avait jamais vu.', 'The {o} float toward a different door than planned. {h} shrugs in zero gravity: a change of course, and you discover a corridor nobody had seen.'],
    ],
    su: [
      ['Pschiit ! Un petit nuage de vapeur s’échappe du tableau et les {o} tournent comme des toupies. {h} éclate de rire : tout va bien, on recommence tranquillement.', 'Pshhh! A little cloud of steam escapes from the panel and the {o} spin like tops. {h} bursts out laughing: all is well, you simply start again.'],
      ['Une étoile filante passe si près que la cabine s’éclaire en orange. {h} cligne des yeux en riant : le ciel adore les surprises, et vous n’êtes pas pressés.', 'A shooting star passes so close that the cabin glows orange. {h} blinks and laughs: the sky loves surprises, and you are in no hurry.'],
      ['Les {o} se mettent à flotter dans tous les sens. {h} les rattrape un par un en riant. Rien de grave : la mission continue avec un peu de poussière d’étoile.', 'The {o} start floating in every direction. {h} catches them one by one, laughing out loud. Nothing serious at all: the mission goes on with a little stardust.'],
    ],
  },
  cuisine: {
    h: [['Léo', 'le pâtissier', 'the pastry chef'], ['Inès', 'la cheffe', 'the head chef']],
    p: ['dans la cuisine du Moulin Doré', 'in the Golden Mill kitchen'],
    o: ['œufs', 'eggs'],
    t: [['La recette du dimanche', 'The Sunday recipe'], ['Le gâteau qui voulait grandir', 'The cake that wanted to grow'], ['Le grand marché des saveurs', 'The great market of flavors']],
    op: [
      ['Une bonne odeur de pain chaud flotte {p}. {h}, {r}, enfile son tablier et découvre un mot sous le saladier : la recette du jour est incomplète.', 'A good smell of warm bread drifts {p}. {h}, {r}, puts on an apron and finds a note under the mixing bowl: today’s recipe is incomplete.'],
      ['Le four ronronne {p}. {h}, {r}, goûte la sauce et fronce les sourcils : il manque un petit quelque chose avant de servir.', 'The oven hums {p}. {h}, {r}, tastes the sauce and frowns: something is missing before it can be served.'],
      ['Le marché vient d’ouvrir. {h}, {r}, remplit son panier d’{o} frais et cherche la bonne quantité pour ce soir.', 'The market has just opened. {h}, {r}, fills a basket with fresh {o} and looks for the right amount for tonight’s menu.'],
    ],
    ok: [
      ['Le gâteau lève tout doucement et la cuisine sent le caramel. {h} goûte et ferme les yeux de plaisir : c’est parfait, et c’est grâce à ton calcul. Les {o} peuvent enfin passer au four.', 'The cake rises ever so gently and the kitchen smells of caramel. {h} tastes it and closes both eyes with joy: it is perfect, thanks to your math. The {o} can finally go into the oven.'],
      ['Un grand « miam » résonne dans la cuisine ! {h} dresse l’assiette avec un geste de chef. Tout tombe juste, comme dans la meilleure recette de la maison.', 'A big “yum” rings through the kitchen! {h} plates the dish with a chef’s flourish. Everything comes out just right, like the best recipe in the house.'],
      ['La sauce nappe la cuillère à la perfection. {h} te tend un petit bout de pain à goûter : c’est exactement ce qu’il fallait. Les {o} sont prêts pour la fête.', 'The sauce coats the spoon perfectly. {h} hands you a little piece of bread to taste: it is exactly what was needed. The {o} are ready for the party.'],
    ],
    dt: [
      ['La pâte prend une drôle de forme, un peu plus plate que prévu. {h} sourit : on en fera des petites galettes, et tout le monde adorera ça.', 'The dough takes a funny shape, a bit flatter than planned. {h} smiles: you will make little flatbreads, and everybody will love them.'],
      ['Le plat part sur une autre recette que celle du carnet. {h} goûte et hoche la tête : ce n’est pas ce qui était prévu, mais ça sent très bon.', 'The dish heads toward a different recipe than the one in the notebook. {h} tastes and nods: it is not what was planned, but it smells wonderful.'],
      ['Les {o} finissent dans un autre saladier que prévu. {h} rit doucement : une petite variante de la recette, et la cuisine sent déjà bon.', 'The {o} end up in a different bowl than planned. {h} laughs softly: a little variation on the recipe, and the kitchen already smells good.'],
    ],
    su: [
      ['Pouf ! Un nuage de farine monte jusqu’au plafond et {h} devient tout blanc. Fou rire dans la cuisine, puis on essuie le plan de travail et on reprend.', 'Poof! A cloud of flour rises to the ceiling and {h} turns completely white. Giggles fill the kitchen, then you wipe the counter and carry on.'],
      ['La minuterie sonne juste au mauvais moment et les {o} dansent dans le saladier. {h} rigole : ce n’est qu’une petite bêtise, la recette n’est pas perdue.', 'The timer rings at just the wrong moment and the {o} dance in the bowl. {h} chuckles: it is only a small mishap, the recipe is not lost.'],
      ['Une cuillère glisse et tinte sur le carrelage. {h} la ramasse en riant, essuie son tablier et remet les {o} bien en ordre pour la suite.', 'A spoon slips and clinks on the tiles. {h} picks it up laughing, wipes the apron and puts the {o} back in order for what comes next.'],
    ],
  },
  sport: {
    h: [['Sam', 'le capitaine', 'the captain'], ['Jade', 'l’entraîneuse', 'the coach']],
    p: ['sur le terrain des Étoiles', 'on Star Field'],
    o: ['ballons', 'balls'],
    t: [['Le match des trois sifflets', 'The three whistle match'], ['Le tournoi du dernier but', 'The last goal tournament'], ['L’entraînement secret', 'The secret training']],
    op: [
      ['Le soleil tape sur le terrain. {h}, {r}, lace ses chaussures et compte les {o} alignés au bord de la ligne.', 'The sun beats down on the pitch. {h}, {r}, laces up and counts the {o} lined up along the touchline.'],
      ['Le sifflet retentit {p}. {h}, {r}, rassemble l’équipe en cercle et sort un petit tableau noir avec un défi pour la prochaine action.', 'The whistle blows {p}. {h}, {r}, gathers the team in a circle and pulls out a little blackboard with a challenge for the next play.'],
      ['Les gradins sont presque vides, mais le terrain vibre déjà. {h}, {r}, fait rebondir un ballon trois fois et te lance un regard complice.', 'The stands are almost empty, but the field already hums. {h}, {r}, bounces a ball three times and throws you a knowing look.'],
    ],
    ok: [
      ['Le ballon file droit et le filet tremble de joie ! {h} lève les bras vers toi : c’est exactement ce qu’il fallait pour marquer. Toute l’équipe crie ton nom en riant.', 'The ball flies straight and the net shakes with joy! {h} raises both arms toward you: that is exactly what was needed to score. The whole team shouts your name, laughing.'],
      ['Passe parfaite ! Les {o} roulent en rythme et {h} te tape dans la main. Le calcul était juste, et l’équipe prend confiance pour la suite du match.', 'Perfect pass! The {o} roll in rhythm and {h} gives you a high five. The math was right, and the team gains confidence for the rest of the match.'],
      ['Le public se lève d’un seul coup quand tu trouves la bonne action. {h} sourit jusqu’aux oreilles : voilà un jeu d’équipe qui roule comme une horloge.', 'The crowd rises at once when you find the right play. {h} grins from ear to ear: that is team play running like a clock.'],
    ],
    dt: [
      ['Le ballon part sur le côté, un peu plus loin que prévu. {h} le rattrape en riant : on change de plan, et la défense n’a rien vu venir.', 'The ball goes off to the side, a bit farther than planned. {h} catches up with it laughing: you change the plan, and the defense never saw it coming.'],
      ['L’équipe prend un autre chemin sur le terrain. {h} fait signe de suivre : ce n’est pas l’action prévue, mais elle peut aussi mener quelque part.', 'The team takes a different path across the field. {h} waves for you to follow: it is not the planned play, but it can lead somewhere too.'],
      ['Les {o} roulent vers la touche et {h} court les chercher. Petit détour, grand sourire : un bon joueur sait toujours s’adapter à la suite.', 'The {o} roll toward the sideline and {h} runs to fetch them. A small detour, a big smile: a good player always adapts to what comes next.'],
    ],
    su: [
      ['Une rafale de vent emporte le ballon dans les gradins. {h} éclate de rire et court le chercher. Le match reprend dans la bonne humeur, sans aucune pression.', 'A gust of wind carries the ball into the stands. {h} bursts out laughing and runs to get it. The match resumes in good spirits, with no pressure at all.'],
      ['Le sifflet de l’arbitre part tout seul, par erreur ! Tout le monde rigole sur le terrain, puis {h} remet les {o} en place et l’équipe repart.', 'The referee’s whistle goes off by itself, by mistake! Everyone laughs on the field, then {h} puts the {o} back in place and the team sets off again.'],
      ['Un lacet défait, un petit trébuchement : {h} se relève en riant. Les {o} roulent un instant, puis toute l’équipe se remet en place tranquillement, sans aucune pression.', 'An untied lace, a little stumble: {h} gets up laughing. The {o} roll for a moment, then the whole team calmly gets back in position, with no pressure at all.'],
    ],
  },
  construction: {
    h: [['Bao', 'le chef de chantier', 'the site foreman'], ['Lila', 'l’architecte', 'the architect']],
    p: ['sur le grand chantier du port', 'at the big harbor site'],
    o: ['briques', 'bricks'],
    t: [['Le pont des mille briques', 'The bridge of a thousand bricks'], ['La tour qui voulait toucher les nuages', 'The tower that wanted to touch the clouds'], ['Le chantier du matin', 'The morning building site']],
    op: [
      ['La grue grince doucement {p}. {h}, {r}, déplie un grand plan taché de café et pose un doigt sur l’endroit où il manque des {o}.', 'The crane creaks softly {p}. {h}, {r}, unfolds a big plan stained with coffee and puts a finger on the spot where {o} are missing.'],
      ['Le casque bien vissé, {h}, {r}, fait le tour du chantier endormi. Une poutre attend, des {o} sont empilées, et le plan demande un calcul.', 'With the helmet screwed on tight, {h}, {r}, walks around the sleepy site. A beam waits, {o} are stacked up, and the plan needs a calculation.'],
      ['Le camion de livraison klaxonne deux fois {p}. {h}, {r}, descend l’échelle en vitesse et lit la liste de commande avec un sourcil levé.', 'The delivery truck honks twice {p}. {h}, {r}, hurries down the ladder and reads the order list with one eyebrow raised.'],
    ],
    ok: [
      ['La poutre se pose pile au bon endroit, sans un seul grincement. {h} tape deux fois sur son casque en signe de victoire : ton calcul tient debout, tout comme le mur !', 'The beam lands exactly in the right spot, without a single creak. {h} taps the helmet twice in victory: your math stands strong, just like the wall!'],
      ['Clac ! Les {o} s’emboîtent comme dans un jeu de construction. {h} recule de trois pas pour admirer l’ensemble : c’est solide, droit, et c’est grâce à toi.', 'Clack! The {o} fit together like a building set. {h} steps back three paces to admire the whole thing: it is solid, straight, and it is thanks to you.'],
      ['La grue descend la dernière pièce en douceur. {h} lève le pouce vers toi : le chantier avance d’un joli pas, et la structure ne tremble même pas.', 'The crane lowers the last piece gently. {h} gives you a thumbs up: the site moves forward nicely, and the structure does not even wobble.'],
    ],
    dt: [
      ['Une poutre se place un peu à côté du plan. {h} penche la tête et sourit : on peut ajuster, et la vue depuis ce côté-là est plutôt jolie.', 'A beam lands a little beside the plan. {h} tilts the head and smiles: you can adjust, and the view from that side is rather pretty.'],
      ['Les {o} montent par l’autre escalier du chantier. {h} suit la file : ce n’est pas la route prévue, mais chacun a pu se dégourdir les jambes.', 'The {o} go up the other staircase of the site. {h} follows the line: it is not the planned route, but everyone got to stretch their legs.'],
      ['Le mur prend une petite courbe inattendue. {h} le regarde avec curiosité : un détour dans le plan, rien d’irréparable, on reprend les mesures ensemble.', 'The wall takes on a small unexpected curve. {h} looks at it with curiosity: a detour in the plan, nothing that cannot be fixed, you retake the measurements together.'],
    ],
    su: [
      ['Une rafale fait tourner le casque de {h} jusqu’au sommet de la grue. Tout le chantier rigole, puis un ouvrier le redescend et les {o} reprennent leur place.', 'A gust sends the helmet of {h} spinning up to the top of the crane. The whole site laughs, then a worker brings it down and the {o} go back in place.'],
      ['Boum ! Une pile de {o} glisse doucement sur le côté. Personne n’est touché, {h} éclate de rire et la file se reforme pour continuer.', 'Boom! A pile of {o} slides gently to the side. Nobody is hit, {h} bursts out laughing and the line forms up again to carry on.'],
      ['Le niveau à bulle fait un petit saut et la bulle s’échappe. {h} la rattrape en riant : le chantier reste de bonne humeur et la construction continue.', 'The spirit level gives a little hop and the bubble escapes. {h} catches it laughing: the site stays in good spirits and the building goes on.'],
    ],
  },
  medecine: {
    h: [['Noor', 'la docteure', 'the doctor'], ['Elio', 'l’infirmier', 'the nurse']],
    p: ['à la clinique des Tilleuls', 'at Linden Clinic'],
    o: ['pansements', 'bandages'],
    t: [['La clinique des peluches', 'The teddy bear clinic'], ['Le remède du petit dragon', 'The little dragon’s remedy'], ['La tournée du matin', 'The morning rounds']],
    op: [
      ['Le matin s’installe {p}. {h}, {r}, enfile sa blouse et vérifie la petite boîte de {o}. Aujourd’hui, ce sont les peluches malades qui font la file.', 'Morning settles in {p}. {h}, {r}, slips on a coat and checks the little box of {o}. Today it is sick stuffed animals lining up.'],
      ['Un nounours tousse dans la salle d’attente {p}. {h}, {r}, sort son stéthoscope et le pose délicatement sur sa poitrine de coton.', 'A teddy bear coughs in the waiting room {p}. {h}, {r}, takes out a stethoscope and gently places it on its cotton chest.'],
      ['La cloche de la clinique tinte deux fois. {h}, {r}, ouvre le grand carnet des soins et trouve une dose à préparer pour le petit dragon.', 'The clinic bell rings twice. {h}, {r}, opens the big care notebook and finds a dose to prepare for the little dragon.'],
    ],
    ok: [
      ['Le nounours respire mieux et ses yeux brillent de nouveau. {h} range le stéthoscope avec un grand sourire : le soin est exactement le bon, et il y a ton calcul derrière.', 'The teddy bear breathes better and its eyes shine again. {h} puts away the stethoscope with a big smile: the care is exactly right, and your math is behind it.'],
      ['Le petit dragon éternue, puis rit d’un coup. {h} te chuchote merci : la dose était juste, et les {o} peuvent retourner dans leur boîte.', 'The little dragon sneezes, then suddenly laughs. {h} whispers thank you: the dose was right, and the {o} can now go back in their little box.'],
      ['La salle d’attente applaudit doucement. {h} note tout dans le carnet avec soin : tout est en ordre, et le patient peut rentrer jouer dehors.', 'The waiting room applauds softly. {h} writes everything in the notebook with care: all is in order, and the patient can go home to play outside.'],
    ],
    dt: [
      ['Le soin prend un autre chemin que celui du carnet. {h} vérifie doucement : ce n’est pas ce qui était noté, mais le patient se sent déjà plus calme.', 'The treatment takes a different path than the one in the notebook. {h} checks gently: it is not what was written, but the patient already feels calmer.'],
      ['Les {o} passent d’abord par la salle d’à côté. {h} sourit : petit détour par la bibliothèque, le temps de lire une page avant de revenir.', 'The {o} first go through the room next door. {h} smiles: a small detour through the library, just long enough to read a page before coming back.'],
      ['La dose part un peu à côté de la ligne du carnet. {h} la remet calmement dans le bon sens : à la clinique, on prend toujours le temps.', 'The dose drifts a little off the notebook line. {h} calmly sets it right, without hurrying: at the clinic, you always take your time.'],
    ],
    su: [
      ['Atchoum ! Le nounours éternue et les {o} s’envolent dans la pièce. {h} éclate de rire, les ramasse un par un et la tournée continue sans souci.', 'Achoo! The teddy bear sneezes and the {o} fly across the room. {h} bursts out laughing, picks them up one by one and the rounds carry on without a worry.'],
      ['Le thermomètre glisse de la poche de {h} et fait un petit tour sur le sol. Tout le monde rigole, puis on reprend les soins tranquillement.', 'The thermometer slips out of the pocket of {h} and takes a little spin on the floor. Everyone laughs, then you calmly resume the care.'],
      ['Le petit dragon fait un hoquet de fumée rose. {h} agite la main pour la dissiper en riant : rien d’inquiétant, la visite peut simplement reprendre.', 'The little dragon hiccups a puff of pink smoke. {h} waves a hand to clear it, laughing: nothing worrying, the visit can simply go on.'],
    ],
  },
  science: {
    h: [['Ada', 'la chercheuse', 'the researcher'], ['Théo', 'l’inventeur', 'the inventor']],
    p: ['dans le laboratoire des Petits Éclairs', 'in the Little Sparks laboratory'],
    o: ['éprouvettes', 'test tubes'],
    t: [['L’expérience qui faisait des bulles', 'The experiment that blew bubbles'], ['Le robot de la salle sept', 'The robot in room seven'], ['Le laboratoire des petits éclairs', 'The little sparks laboratory']],
    op: [
      ['Une petite lumière verte clignote {p}. {h}, {r}, essuie ses lunettes et pose le carnet d’expériences à côté des {o} alignées sur l’étagère.', 'A small green light blinks {p}. {h}, {r}, wipes the glasses and sets the experiment notebook beside the {o} lined up on the shelf.'],
      ['Le robot de la salle sept bourdonne tout seul. {h}, {r}, s’approche sur la pointe des pieds et lit l’écran où une consigne vient d’apparaître.', 'The robot in room seven hums by itself. {h}, {r}, tiptoes closer and reads the screen where an instruction has just appeared.'],
      ['Des bulles montent lentement dans un grand bocal. {h}, {r}, les regarde en silence, puis attrape un crayon : une nouvelle expérience commence.', 'Bubbles rise slowly in a big jar. {h}, {r}, watches them in silence, then grabs a pencil: a new experiment begins.'],
    ],
    ok: [
      ['Les bulles s’arrangent en une jolie spirale et le robot fait un petit bip joyeux. {h} lève son carnet vers toi : l’expérience réussit, et c’est ton raisonnement qui l’a lancée.', 'The bubbles arrange themselves in a pretty spiral and the robot gives a happy little beep. {h} holds the notebook up to you: the experiment works, and your reasoning started it.'],
      ['Les {o} brillent toutes ensemble d’un vert lumineux. {h} note vite le résultat : c’est exactement la prédiction, et ton calcul a ouvert la voie.', 'The {o} all glow together in bright green. {h} quickly jots down the result: it is exactly the prediction, and your math opened the way.'],
      ['Un petit éclair bleu traverse le laboratoire sans rien casser. {h} sourit : l’hypothèse tient bon, grâce à toi, et le robot applaudit avec ses pinces.', 'A little blue flash crosses the laboratory without breaking anything. {h} smiles: the hypothesis holds up, thanks to you, and the robot applauds with its claws.'],
    ],
    dt: [
      ['L’expérience prend une couleur inattendue, un joli orange. {h} sort son carnet : voilà un résultat différent de la prévision, et c’est aussi intéressant.', 'The experiment turns an unexpected color, a pretty orange. {h} takes out the notebook: that is a result different from the forecast, and it is just as interesting.'],
      ['Le robot tourne à gauche au lieu d’aller tout droit. {h} le suit en notant le trajet : pas la route prévue, mais elle mène ailleurs.', 'The robot turns left instead of going straight. {h} follows while noting the route: it is not the planned path, but it leads to another room.'],
      ['Les {o} se remplissent d’une autre couleur que prévu. {h} sourit en observant ce que cela donne : les surprises aussi font avancer la science.', 'The {o} fill with a different color than planned. {h} smiles while watching what it gives: surprises move science forward too.'],
    ],
    su: [
      ['Pop ! Une grosse bulle éclate au plafond et fait tomber une pluie de confettis. {h} éclate de rire, essuie ses lunettes et remet les {o} sur l’étagère.', 'Pop! A big bubble bursts on the ceiling and drops a rain of confetti. {h} bursts out laughing, wipes the glasses and puts the {o} back on the shelf.'],
      ['Le robot hoquette et chante deux notes complètement fausses. {h} rit de bon cœur : une petite panne, rien de grave, et l’expérience peut reprendre tout doucement.', 'The robot hiccups and sings two completely wrong notes. {h} laughs heartily: a little breakdown, nothing serious at all, and the experiment can resume in a moment.'],
      ['Une étincelle fait un petit saut sur la paillasse. {h} sursaute puis rigole : tout est sous contrôle et le laboratoire sent seulement un peu la menthe.', 'A spark takes a little hop across the bench. {h} startles then chuckles: everything is under control and the laboratory just smells a little of mint.'],
    ],
  },
  echecs: {
    h: [['Elia', 'la reine du royaume blanc', 'the queen of the white kingdom'], ['Cyrus', 'le cavalier', 'the knight']],
    p: ['sur le grand échiquier royal', 'on the great royal chessboard'],
    o: ['pions', 'pawns'],
    t: [['Le tournoi des tours', 'The tower tournament'], ['La reine et les pions curieux', 'The queen and the curious pawns'], ['Le pont du cavalier', 'The knight’s bridge']],
    op: [
      ['Les cloches du château sonnent {p}. {h}, {r}, rassemble les {o} en rang et regarde la case où il faut décider du prochain mouvement.', 'The castle bells ring {p}. {h}, {r}, gathers the {o} in a line and studies the square where the next move must be decided.'],
      ['Un brouillard léger flotte entre les tours. {h}, {r}, avance d’une case, puis s’arrête : une petite énigme est gravée sur le pavé.', 'A light fog drifts between the towers. {h}, {r}, steps forward one square, then stops: a little riddle is carved into the paving.'],
      ['Le roi dort sur son trône et les {o} chuchotent. {h}, {r}, s’approche de la grande porte, où une serrure en forme de tour attend sa clé.', 'The king sleeps on his throne and the {o} whisper. {h}, {r}, walks up to the great door, where a tower-shaped lock waits.'],
    ],
    ok: [
      ['La tour glisse sans effort et le pont se baisse devant vous. {h} lève son épée en signe de joie : le calcul a rendu le passage possible, et tout le royaume applaudit.', 'The tower glides across with ease and the bridge lowers in front of you. {h} raises a sword in joy: the math made the crossing possible, and the whole kingdom applauds.'],
      ['Les {o} s’avancent en rang parfait et la serrure fait clic. {h} te salue d’un grand geste de cape : bien joué, la partie continue dans la bonne direction.', 'The {o} step forward in a perfect line and the lock goes click. {h} salutes you with a sweep of the cape: well played, the game goes on in the right direction.'],
      ['Une fanfare de trompettes résonne sur l’échiquier ! {h} traverse la case suivante d’un pas fier. Même le roi se réveille un instant pour te sourire.', 'A fanfare of trumpets rings over the chessboard! {h} crosses the next square with a proud step. Even the king wakes for a moment to smile at you.'],
    ],
    dt: [
      ['Le cavalier saute sur une case voisine, un peu à côté du plan. {h} sourit : un détour sur l’échiquier, la vue y est belle.', 'The knight hops onto a neighboring square, a little off the plan. {h} smiles: a detour on the chessboard, and the view is nice, you gain time to think.'],
      ['Les {o} prennent la petite allée du jardin au lieu de la grande porte. {h} suit en riant : pas la route prévue, mais elle mène aussi quelque part.', 'The {o} take the little garden path instead of the great door. {h} follows laughing: it is not the planned route, but it leads somewhere too.'],
      ['La tour avance d’une case de trop. {h} hausse les sourcils, puis sourit : un petit écart, rien de grave, la partie est encore pleine de chemins.', 'The tower moves one square too far. {h} raises both eyebrows, then smiles: a small slip, nothing serious, the game is still full of paths.'],
    ],
    su: [
      ['Un courant d’air fait tomber la couronne de {h} sur les dalles. Tout le monde rit doucement, puis les {o} se remettent en rang et la partie continue.', 'A draft knocks the crown of {h} onto the flagstones. Everyone laughs softly, then the {o} line up again and the game calmly goes on, as if nothing had happened.'],
      ['Le roi ronfle si fort que les cloches tremblent un instant. {h} pouffe de rire, remet les {o} bien en place et reprend la route sans se presser.', 'The king snores so loudly that the bells tremble for a moment. {h} snorts with laughter, puts the {o} back in place and sets off again without hurrying.'],
      ['Un corbeau pose un papier sur la case de {h}, puis s’envole en croassant. Quelle drôle de visite ! Les {o} regardent en l’air, puis la partie reprend.', 'A crow drops a paper on the square of {h}, then flies off cawing. What a funny visitor! The {o} look up, then the game resumes.'],
    ],
  },
};

// Hooks close the scene; they never mention the answer.
export const HOOKS = [
  ['{h} te sourit : prends ton temps, tu y arrives.', '{h} smiles at you: take your time, you can do it.'],
  ['Tout le monde retient son souffle : {h} compte sur toi.', 'Everyone holds their breath: {h} counts on you.'],
  ['Un silence s’installe. {h} t’encourage d’un signe.', 'A hush settles in. {h} nods to encourage you.'],
  ['{h} se tourne vers toi. À toi de choisir la suite.', '{h} turns to you. You choose what comes next.'],
];
