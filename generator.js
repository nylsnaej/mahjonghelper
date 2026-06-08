// === GÉNÉRATEUR DE MAINS PAR NIVEAU ===

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function shuffle(arr) {
  for (let i = arr.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

const SUITS = ['bamboo','circle','character'];
const WINDS = ['E','S','W','N'];
const DRAGONS = ['R','G','W'];

function suit(type, value) { return makeTile(type, value); }
function windTile(v) { return makeTile('wind', v); }
function dragonTile(v) { return makeTile('dragon', v); }

// L'attente unique sur la paire n'est garantie que si la paire est un honneur
// (vent ou dragon ne peut jamais faire partie d'un chow → aucune réorganisation possible)
function pairWait(pairTile) {
  return (pairTile.type === 'wind' || pairTile.type === 'dragon') ? 'pair' : null;
}

function makeChow(type, start, hidden=false) {
  return { type:'chow', tiles:[suit(type,start),suit(type,start+1),suit(type,start+2)], hidden };
}
function makePung(tile, hidden=false) {
  return { type:'pung', tiles:[tile,{...tile},{...tile}], hidden };
}
function makeKong(tile, hidden=false) {
  return { type:'kong', tiles:[tile,{...tile},{...tile},{...tile}], hidden };
}
function makePair(tile, hidden=true) {
  return { tiles:[tile,{...tile}], hidden };
}

// Contexte de jeu aléatoire
function randomContext() {
  return {
    windRound: rand(WINDS),
    windPlayer: rand(WINDS),
  };
}

// ─── NIVEAUX ───────────────────────────────────────────────

// Niveau 1 : Tout Chow, toutes ordinaires → 8 pts garantis
// Double Chow pur(1) + Double Chow(1) + Petite suite pure(1) + Sans honneurs(1) + Tout Chow(2) + Tout ordinaire(2) = 8
// Petite suite pure = même famille, différence de départ = 3 (ex: 234 + 567)
function generateLevel1() {
  const ctx = { windRound:'E', windPlayer:'S' };
  const fams = shuffle([...SUITS]);
  const s = randInt(2, 3);  // s+5 ≤ 8 garantit tout ordinaire (toutes valeurs 2-8)
  const g1 = makeChow(fams[0], s,   false);  // chow fams[0] départ s
  const g2 = makeChow(fams[0], s,   false);  // Double Chow pur avec g1
  const g3 = makeChow(fams[1], s,   false);  // Double Chow avec g1 (même départ, famille différente)
  const g4 = makeChow(fams[1], s+3, false);  // Petite suite pure avec g3 (même famille, diff=3)
  const pairTile = suit(fams[2], randInt(2,8));
  return {
    groups: [g1,g2,g3,g4],
    pair: makePair(pairTile, true),
    flowers: [],
    winTile: pairTile,
    winBy: 'discard',
    waitType: pairWait(pairTile),
    ...ctx,
    isLastTile:false, isLastDiscard:false, isStolenKong:false, isAfterKong:false, isLastExisting:false,
  };
}

// Niveau 2 : Deux Dragons (6 pts) + chows = ≥ 8 pts garanti
function generateLevel2() {
  const ctx = { windRound:'E', windPlayer:'S' };
  const fams = shuffle([...SUITS]);
  const drags = shuffle([...DRAGONS]);
  const g1 = makePung(dragonTile(drags[0]), false);  // Pung dragon 1 = 2 pts
  const g2 = makePung(dragonTile(drags[1]), false);  // Pung dragon 2 = 2 pts
  // Deux Dragons = 6 pts, Total mini = 10 pts
  const g3 = makeChow(fams[0], randInt(1,7), false);
  const g4 = makeChow(fams[1], randInt(1,7), false);
  const pairTile = suit(fams[2], randInt(2,8));
  return {
    groups: [g1,g2,g3,g4],
    pair: makePair(pairTile, true),
    flowers: [],
    winTile: pairTile,
    winBy: 'discard',
    waitType: pairWait(pairTile),
    ...ctx,
    isLastTile:false, isLastDiscard:false, isStolenKong:false, isAfterKong:false, isLastExisting:false,
  };
}

// Niveau 3 : Vent du tour = Vent du joueur (4 pts) + Pung extrémité caché(1) + Deux Pungs cachés(2) + Kong exposé(1) = 8 pts garantis hors fleurs
function generateLevel3() {
  const windV = rand(WINDS);
  const ctx = { windRound: windV, windPlayer: windV };
  const fams = shuffle([...SUITS]);
  const g1 = makePung(windTile(windV), true);             // Vent du tour + joueur = 4 pts (caché)
  const extremeVal = rand([1,9]);
  const g2 = makePung(suit(fams[0], extremeVal), true);   // Pung extrémité = 1 pt (caché)
  // g1 + g2 cachés → Deux Pungs cachés = 2 pts
  // Total garanti : 4+1+2+1 = 8 pts hors fleurs
  const g3 = makeChow(fams[1], randInt(1,7), false);
  const g4 = makeKong(suit(fams[2], randInt(2,8)), false); // Kong exposé = 1 pt
  const pairTile = suit(fams[0], randInt(2,8));
  return {
    groups: [g1,g2,g3,g4],
    pair: makePair(pairTile, true),
    flowers: [makeTile('flower', randInt(1,4))],
    winTile: pairTile,
    winBy: 'discard',
    waitType: pairWait(pairTile),
    ...ctx,
    isLastTile:false, isLastDiscard:false, isStolenKong:false, isAfterKong:false, isLastExisting:false,
  };
}

// Niveau 4 : Tout caché / Tout Pung / Semi-pure
function generateLevel4() {
  const ctx = randomContext();
  const f = rand(SUITS);
  // Semi-pure : une famille + honneurs
  const g1 = makeChow(f, randInt(1,5), true);
  const g2 = makeChow(f, randInt(1,5), true);
  const g3 = makePung(dragonTile(rand(DRAGONS)), true);
  const g4 = makeChow(f, randInt(1,7), true);
  const pairTile = suit(f, randInt(1,9));
  const hand = {
    groups: [g1,g2,g3,g4],
    pair: makePair(pairTile, true),
    flowers: [],
    winTile: pairTile,
    winBy: 'self',
    waitType: pairWait(pairTile),
    ...ctx,
    isLastTile:false, isLastDiscard:false, isStolenKong:false, isAfterKong:false, isLastExisting:false,
  };
  return hand;
}

// Niveau 5 : Grande suite garantie (8 pts) + combos bonus
function generateLevel5() {
  const ctx = randomContext();
  const fams = shuffle([...SUITS]);
  // Grande suite stricte : 1 chow à 1, 1 chow à 4, 1 chow à 7 dans 3 familles différentes
  const g1 = makeChow(fams[0], 1, false);
  const g2 = makeChow(fams[1], 4, false);
  const g3 = makeChow(fams[2], 7, false);
  // 4e chow dans une des 3 familles (valeur ≠ 1,4,7 pour ne pas perturber la détection)
  const f4 = rand(SUITS);
  const validStarts = [2,3,5,6];
  const g4 = makeChow(f4, rand(validStarts), false);
  const pairTile = suit(fams[0], randInt(2,8));
  const winBy = rand(['self','discard']);
  return {
    groups: [g1,g2,g3,g4],
    pair: makePair(pairTile, true),
    flowers: Math.random()<0.5 ? [makeTile('flower',1)] : [],
    winTile: pairTile,
    winBy,
    waitType: pairWait(pairTile),
    ...ctx,
    isLastTile:false, isLastDiscard:false, isStolenKong:false, isAfterKong:false, isLastExisting:false,
  };
}

function groups_allHidden(hand) {
  return hand.groups.every(g=>g.hidden) && hand.pair.hidden;
}

// Niveau 6 : Mains pures, serpentines simples, 4 premiers/derniers — avec contexte
function generateLevel6() {
  const ctx = randomContext();
  const f = rand(SUITS);
  // Main pure : tout dans une famille
  const starts = shuffle([1,2,3,4,5,6,7]);
  const g1 = makeChow(f, starts[0], false);
  const g2 = makeChow(f, starts[1] > 7 ? 1 : starts[1], false);
  const g3 = makePung(suit(f, randInt(1,9)), false);
  const g4 = makeChow(f, starts[2] > 7 ? 2 : starts[2], false);
  const pairTile = suit(f, randInt(1,9));
  const hand = {
    groups: [g1,g2,g3,g4],
    pair: makePair(pairTile, true),
    flowers: [],
    winTile: pairTile,
    winBy: rand(['self','discard']),
    waitType: pairWait(pairTile),
    ...ctx,
    isLastTile:false, isLastDiscard:false, isStolenKong:false, isAfterKong:false, isLastExisting:false,
  };
  return hand;
}

// Niveau 7 : 7 paires (type 'pair7' pour éviter comptage comme pungs)
function generateLevel7() {
  const ctx = randomContext();
  const tiles = [];
  const used = [];
  while (tiles.length < 7) {
    const f = rand(SUITS), v = randInt(1,9);
    const key = f+'_'+v;
    if (!used.includes(key)) { used.push(key); tiles.push(suit(f,v)); }
  }
  // 6 groupes de type 'pair7' (2 tuiles) + 1 paire normale
  const pairGroups = tiles.slice(0,6).map(t => ({ type:'pair7', tiles:[t,{...t}], hidden:true }));
  return {
    groups: pairGroups,
    pair: makePair(tiles[6], true),
    flowers: [],
    winTile: tiles[6],
    winBy: rand(['self','discard']),
    waitType: pairWait(tiles[6]),
    specialType: '7pairs',
    ...ctx,
    isLastTile:false, isLastDiscard:false, isStolenKong:false, isAfterKong:false, isLastExisting:false,
  };
}

// Niveau 8 : Mains à 32-64 pts — Tout honneur, Tout extrémité, Trois petits Dragons
function generateLevel8() {
  const ctx = randomContext();
  // Trois petits dragons : 2 pungs dragon + paire dragon + 2 autres
  const dragons = shuffle([...DRAGONS]);
  const g1 = makePung(dragonTile(dragons[0]), rand([true,false]));
  const g2 = makePung(dragonTile(dragons[1]), rand([true,false]));
  const f = rand(SUITS);
  const g3 = makeChow(f, randInt(1,7), rand([true,false]));
  const g4 = makeChow(f, randInt(1,7), rand([true,false]));
  const pairTile = dragonTile(dragons[2]);
  const hand = {
    groups: [g1,g2,g3,g4],
    pair: makePair(pairTile, true),
    flowers: [],
    winTile: pairTile,
    winBy: rand(['self','discard']),
    waitType: pairWait(pairTile),
    ...ctx,
    isLastTile:false, isLastDiscard:false, isStolenKong:false, isAfterKong:false, isLastExisting:false,
  };
  return hand;
}

// Niveau 9 : Mains à 48-88 pts — Quatre Kongs, 13 orphelins, Neuf portes
function generateLevel9() {
  const ctx = randomContext();
  // Treize orphelins
  const orphans = [
    suit('bamboo',1), suit('bamboo',9),
    suit('circle',1), suit('circle',9),
    suit('character',1), suit('character',9),
    windTile('E'), windTile('S'), windTile('W'), windTile('N'),
    dragonTile('R'), dragonTile('G'), dragonTile('W'),
  ];
  const pairTile = rand(orphans);
  // On simule la main : 13 tuiles uniques + 1 double sur pairTile
  const groups13 = [];
  // On représente les 13 orphelins comme 6 "paires fictives" de 2 + 1 paire réelle
  // Pour simplifier l'affichage, on les met dans des groupes de 1 (faux chows de 1 tuile)
  // En réalité on utilise specialType
  const hand = {
    groups: [],
    pair: makePair(pairTile, true),
    flowers: [],
    winTile: pairTile,
    winBy: rand(['self','discard']),
    waitType: null,
    specialType: '13orphans',
    orphanTiles: orphans,
    pairTile,
    ...ctx,
    isLastTile:false, isLastDiscard:false, isStolenKong:false, isAfterKong:false, isLastExisting:false,
  };
  return hand;
}

// Niveau 10 : Mains maximales — Neuf portes, main verte, combinaisons contextuelles avancées
function generateLevel10() {
  const ctx = randomContext();
  // Main verte : 2b 3b 4b 6b 8b Dragon Vert
  const greenTiles = [
    suit('bamboo',2), suit('bamboo',3), suit('bamboo',4),
    suit('bamboo',6), suit('bamboo',8), dragonTile('G')
  ];
  // Main verte typique : 234b + 234b + pung 6b + pung DragonVert + paire 8b
  const g1 = makeChow('bamboo', 2, rand([true,false]));
  const g2 = makeChow('bamboo', 2, rand([true,false]));
  const g3 = makePung(suit('bamboo',6), rand([true,false]));
  const g4 = makePung(dragonTile('G'), rand([true,false]));
  const pairTile = suit('bamboo',8);
  const hand = {
    groups: [g1,g2,g3,g4],
    pair: makePair(pairTile, true),
    flowers: [],
    winTile: pairTile,
    winBy: rand(['self','discard']),
    waitType: pairWait(pairTile),
    ...ctx,
    isLastTile: Math.random()<0.3,
    isLastDiscard: false,
    isStolenKong: false,
    isAfterKong: false,
    isLastExisting: Math.random()<0.2,
  };
  return hand;
}

const GENERATORS = [
  null, // index 0 inutilisé
  generateLevel1,
  generateLevel2,
  generateLevel3,
  generateLevel4,
  generateLevel5,
  generateLevel6,
  generateLevel7,
  generateLevel8,
  generateLevel9,
  generateLevel10,
];

function generateHand(level) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const hand = GENERATORS[level]();
    const score = scoreHand(hand);
    const baseScore = score.total - hand.flowers.length;
    if (baseScore >= 8) return hand;
  }
  return GENERATORS[level]();
}
