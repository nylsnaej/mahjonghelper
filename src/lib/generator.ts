import { makeTile } from './tiles';
import { scoreHand } from './combinations';
import type { Tile, Group, Pair, Hand } from '../types';

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }
function randInt(a: number, b: number): number { return Math.floor(Math.random() * (b - a + 1)) + a; }
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

const SUITS  = ['bamboo', 'circle', 'character'] as const;
const WINDS  = ['E', 'S', 'W', 'N'] as const;
const DRAGONS = ['R', 'G', 'W'] as const;

function suit(type: string, value: number): Tile { return makeTile(type as 'bamboo', value); }
function windTile(v: string): Tile  { return makeTile('wind', v); }
function dragonTile(v: string): Tile { return makeTile('dragon', v); }

function pairWait(pairTile: Tile): 'pair' | null {
  return (pairTile.type === 'wind' || pairTile.type === 'dragon') ? 'pair' : null;
}

function makeChow(type: string, start: number, hidden = false): Group {
  return { type: 'chow', tiles: [suit(type, start), suit(type, start + 1), suit(type, start + 2)], hidden };
}
function makePung(tile: Tile, hidden = false): Group {
  return { type: 'pung', tiles: [tile, { ...tile }, { ...tile }], hidden };
}
function makeKong(tile: Tile, hidden = false): Group {
  return { type: 'kong', tiles: [tile, { ...tile }, { ...tile }, { ...tile }], hidden };
}
function makePair(tile: Tile, hidden = true): Pair {
  return { tiles: [tile, { ...tile }], hidden };
}

function randomContext() {
  return { windRound: rand([...WINDS]), windPlayer: rand([...WINDS]) };
}

function baseHand(overrides: Partial<Hand>): Hand {
  return {
    groups: [], pair: { tiles: [], hidden: true }, flowers: [],
    winTile: null, winBy: 'discard', waitType: null,
    windRound: 'E', windPlayer: 'E',
    isLastTile: false, isLastDiscard: false,
    isStolenKong: false, isAfterKong: false, isLastExisting: false,
    specialType: null,
    ...overrides,
  };
}

function generateLevel1(): Hand {
  const ctx = { windRound: 'E', windPlayer: 'S' };
  const fams = shuffle([...SUITS]);
  const s = randInt(2, 3);
  const g1 = makeChow(fams[0]!, s, false);
  const g2 = makeChow(fams[0]!, s, false);
  const g3 = makeChow(fams[1]!, s, false);
  const g4 = makeChow(fams[1]!, s + 3, false);
  const pairTile = suit(fams[2]!, randInt(2, 8));
  return baseHand({ groups: [g1, g2, g3, g4], pair: makePair(pairTile, true), winTile: pairTile, waitType: pairWait(pairTile), ...ctx });
}

function generateLevel2(): Hand {
  const ctx = { windRound: 'E', windPlayer: 'S' };
  const fams = shuffle([...SUITS]);
  const drags = shuffle([...DRAGONS]);
  const g1 = makePung(dragonTile(drags[0]!), false);
  const g2 = makePung(dragonTile(drags[1]!), false);
  const g3 = makeChow(fams[0]!, randInt(1, 7), false);
  const g4 = makeChow(fams[1]!, randInt(1, 7), false);
  const pairTile = suit(fams[2]!, randInt(2, 8));
  return baseHand({ groups: [g1, g2, g3, g4], pair: makePair(pairTile, true), winTile: pairTile, waitType: pairWait(pairTile), ...ctx });
}

function generateLevel3(): Hand {
  const windV = rand([...WINDS]);
  const ctx = { windRound: windV, windPlayer: windV };
  const fams = shuffle([...SUITS]);
  const g1 = makePung(windTile(windV), true);
  const extremeVal = rand([1, 9]);
  const g2 = makePung(suit(fams[0]!, extremeVal), true);
  const g3 = makeChow(fams[1]!, randInt(1, 7), false);
  const g4 = makeKong(suit(fams[2]!, randInt(2, 8)), false);
  const pairTile = suit(fams[0]!, randInt(2, 8));
  return baseHand({ groups: [g1, g2, g3, g4], pair: makePair(pairTile, true), flowers: [makeTile('flower', randInt(1, 4))], winTile: pairTile, waitType: pairWait(pairTile), ...ctx });
}

function generateLevel4(): Hand {
  const ctx = randomContext();
  const f = rand([...SUITS]);
  const g1 = makeChow(f, randInt(1, 5), true);
  const g2 = makeChow(f, randInt(1, 5), true);
  const g3 = makePung(dragonTile(rand([...DRAGONS])), true);
  const g4 = makeChow(f, randInt(1, 7), true);
  const pairTile = suit(f, randInt(1, 9));
  return baseHand({ groups: [g1, g2, g3, g4], pair: makePair(pairTile, true), winBy: 'self', winTile: pairTile, waitType: pairWait(pairTile), ...ctx });
}

function generateLevel5(): Hand {
  const ctx = randomContext();
  const fams = shuffle([...SUITS]);
  const g1 = makeChow(fams[0]!, 1, false);
  const g2 = makeChow(fams[1]!, 4, false);
  const g3 = makeChow(fams[2]!, 7, false);
  const g4 = makeChow(rand([...SUITS]), rand([2, 3, 5, 6]), false);
  const pairTile = suit(fams[0]!, randInt(2, 8));
  const winBy = rand(['self', 'discard'] as const);
  return baseHand({ groups: [g1, g2, g3, g4], pair: makePair(pairTile, true), flowers: Math.random() < 0.5 ? [makeTile('flower', 1)] : [], winBy, winTile: pairTile, waitType: pairWait(pairTile), ...ctx });
}

function generateLevel6(): Hand {
  const ctx = randomContext();
  const f = rand([...SUITS]);
  const starts = shuffle([1, 2, 3, 4, 5, 6, 7]);
  const g1 = makeChow(f, starts[0]!, false);
  const g2 = makeChow(f, (starts[1]! > 7 ? 1 : starts[1])!, false);
  const g3 = makePung(suit(f, randInt(1, 9)), false);
  const g4 = makeChow(f, (starts[2]! > 7 ? 2 : starts[2])!, false);
  const pairTile = suit(f, randInt(1, 9));
  return baseHand({ groups: [g1, g2, g3, g4], pair: makePair(pairTile, true), winBy: rand(['self', 'discard'] as const), winTile: pairTile, waitType: pairWait(pairTile), ...ctx });
}

function generateLevel7(): Hand {
  const ctx = randomContext();
  const tiles: Tile[] = [];
  const used: string[] = [];
  while (tiles.length < 7) {
    const f = rand([...SUITS]);
    const v = randInt(1, 9);
    const key = f + '_' + v;
    if (!used.includes(key)) { used.push(key); tiles.push(suit(f, v)); }
  }
  const pairGroups: Group[] = tiles.slice(0, 6).map(t => ({ type: 'pair7', tiles: [t, { ...t }], hidden: true }));
  return baseHand({ groups: pairGroups, pair: makePair(tiles[6]!, true), winBy: rand(['self', 'discard'] as const), winTile: tiles[6]!, waitType: pairWait(tiles[6]!), specialType: '7pairs', ...ctx });
}

function generateLevel8(): Hand {
  const ctx = randomContext();
  const dragons = shuffle([...DRAGONS]);
  const g1 = makePung(dragonTile(dragons[0]!), rand([true, false]));
  const g2 = makePung(dragonTile(dragons[1]!), rand([true, false]));
  const f = rand([...SUITS]);
  const g3 = makeChow(f, randInt(1, 7), rand([true, false]));
  const g4 = makeChow(f, randInt(1, 7), rand([true, false]));
  const pairTile = dragonTile(dragons[2]!);
  return baseHand({ groups: [g1, g2, g3, g4], pair: makePair(pairTile, true), winBy: rand(['self', 'discard'] as const), winTile: pairTile, waitType: pairWait(pairTile), ...ctx });
}

function generateLevel9(): Hand {
  const ctx = randomContext();
  const orphans: Tile[] = [
    suit('bamboo', 1), suit('bamboo', 9),
    suit('circle', 1), suit('circle', 9),
    suit('character', 1), suit('character', 9),
    windTile('E'), windTile('S'), windTile('W'), windTile('N'),
    dragonTile('R'), dragonTile('G'), dragonTile('W'),
  ];
  const pairTile = rand(orphans);
  return baseHand({ groups: [], pair: makePair(pairTile, true), winBy: rand(['self', 'discard'] as const), winTile: pairTile, waitType: null, specialType: '13orphans', orphanTiles: orphans, pairTile, ...ctx });
}

function generateLevel10(): Hand {
  const ctx = randomContext();
  const g1 = makeChow('bamboo', 2, rand([true, false]));
  const g2 = makeChow('bamboo', 2, rand([true, false]));
  const g3 = makePung(suit('bamboo', 6), rand([true, false]));
  const g4 = makePung(dragonTile('G'), rand([true, false]));
  const pairTile = suit('bamboo', 8);
  return baseHand({ groups: [g1, g2, g3, g4], pair: makePair(pairTile, true), winBy: rand(['self', 'discard'] as const), winTile: pairTile, waitType: pairWait(pairTile), isLastTile: Math.random() < 0.3, isLastExisting: Math.random() < 0.2, ...ctx });
}

function generateSnakeHand(): Hand {
  const ctx = randomContext();
  const fams = shuffle([...SUITS]);
  const snakeGroups: Group[] = [
    { type: 'snake', tiles: [suit(fams[0]!, 1), suit(fams[0]!, 4), suit(fams[0]!, 7)], hidden: true },
    { type: 'snake', tiles: [suit(fams[1]!, 2), suit(fams[1]!, 5), suit(fams[1]!, 8)], hidden: true },
    { type: 'snake', tiles: [suit(fams[2]!, 3), suit(fams[2]!, 6), suit(fams[2]!, 9)], hidden: true },
  ];
  const extraFam = rand([...SUITS]);
  const isChow4 = Math.random() < 0.6;
  const extra = isChow4
    ? makeChow(extraFam, randInt(1, 7), rand([true, false]))
    : makePung(suit(extraFam, randInt(1, 9)), rand([true, false]));
  const pairTile = suit(rand([...SUITS]), randInt(1, 9));
  return baseHand({
    groups: [...snakeGroups, extra],
    pair: makePair(pairTile, true),
    winBy: rand(['self', 'discard'] as const),
    winTile: pairTile,
    waitType: pairWait(pairTile),
    specialType: 'snake',
    ...ctx,
  });
}

const GENERATORS = [
  null,
  generateLevel1, generateLevel2, generateLevel3, generateLevel4, generateLevel5,
  generateLevel6, generateLevel7, generateLevel8, generateLevel9, generateLevel10,
];

export function generateHand(level: number): Hand {
  // level 0 = mode "Tout" : pioche aléatoire parmi les 10 niveaux (10% chance serpentine)
  if (level === 0 && Math.random() < 0.1) return generateSnakeHand();
  const effectiveLevel = level === 0 ? randInt(1, 10) : level;
  const gen = GENERATORS[effectiveLevel];
  if (!gen) throw new Error('Invalid level: ' + level);
  for (let attempt = 0; attempt < 20; attempt++) {
    const hand = gen();
    const score = scoreHand(hand);
    const baseScore = score.total - hand.flowers.length;
    if (baseScore >= 8) return hand;
  }
  return gen();
}
