import { describe, test, expect } from 'vitest';
import { handToText } from '../lib/handText';
import { makeTile } from '../lib/tiles';
import type { Hand, ScoreResult } from '../types';

function makeHand(overrides: Partial<Hand>): Hand {
  return {
    groups: [], pair: { tiles: [], hidden: false }, flowers: [],
    winTile: null, winBy: 'discard', waitType: null,
    windRound: 'E', windPlayer: 'E',
    isLastTile: false, isLastDiscard: false,
    isStolenKong: false, isAfterKong: false, isLastExisting: false,
    specialType: null,
    ...overrides,
  };
}

const fakeScore: ScoreResult = {
  items: [{ name: 'Tout Chow', pts: 2 }, { name: 'Sans honneurs', pts: 1 }],
  total: 3,
};

describe('handToText', () => {

  test('mode standard : contient contexte, groupes, tuile gagnante et score', () => {
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [makeTile('bamboo',1), makeTile('bamboo',2), makeTile('bamboo',3)], hidden: false },
        { type: 'pung', tiles: [makeTile('circle',5), makeTile('circle',5), makeTile('circle',5)], hidden: true  },
        { type: 'chow', tiles: [makeTile('character',4), makeTile('character',5), makeTile('character',6)], hidden: false },
        { type: 'chow', tiles: [makeTile('bamboo',7), makeTile('bamboo',8), makeTile('bamboo',9)], hidden: false },
      ],
      pair:      { tiles: [makeTile('circle',2), makeTile('circle',2)], hidden: false },
      winTile:   makeTile('circle', 2),
      waitType:  'pair',
      winBy:     'discard',
      windRound: 'S',
      windPlayer: 'N',
    });
    const text = handToText(hand, fakeScore, 3);
    expect(text).toContain('Niveau 3');
    expect(text).toContain('Vent dominant : Sud');
    expect(text).toContain('Vent joueur : Nord');
    expect(text).toContain('Gain : écart adverse');
    expect(text).toContain('Chow [1B 2B 3B]');
    expect(text).toContain('Pung caché [5R 5R 5R]');
    expect(text).toContain('Paire [2R 2R]');
    expect(text).toContain('attente sur la paire');
    expect(text).toContain('Tout Chow +2');
    expect(text).toContain('= 3 pts');
  });

  test('mode 7-paires : liste les 7 paires', () => {
    const hand = makeHand({
      groups: [
        { type: 'pair7', tiles: [makeTile('bamboo',2), makeTile('bamboo',2)], hidden: true },
        { type: 'pair7', tiles: [makeTile('bamboo',3), makeTile('bamboo',3)], hidden: true },
        { type: 'pair7', tiles: [makeTile('bamboo',4), makeTile('bamboo',4)], hidden: true },
        { type: 'pair7', tiles: [makeTile('bamboo',5), makeTile('bamboo',5)], hidden: true },
        { type: 'pair7', tiles: [makeTile('bamboo',6), makeTile('bamboo',6)], hidden: true },
        { type: 'pair7', tiles: [makeTile('bamboo',7), makeTile('bamboo',7)], hidden: true },
      ],
      pair:        { tiles: [makeTile('bamboo',8), makeTile('bamboo',8)], hidden: true },
      winTile:     makeTile('bamboo', 8),
      winBy:       'discard',
      specialType: '7pairs',
    });
    const score: ScoreResult = { items: [{ name: 'Sept paires', pts: 24 }], total: 24 };
    const text = handToText(hand, score, 7);
    expect(text).toContain('Sept paires');
    expect(text).toContain('2B2B');
    expect(text).toContain('Sept paires +24');
    expect(text).toContain('= 24 pts');
  });

  test('mode 13-orphelins : liste les 13 tuiles + tuile gagnante', () => {
    const orphans = [
      makeTile('bamboo',1), makeTile('bamboo',9),
      makeTile('circle',1), makeTile('circle',9),
      makeTile('character',1), makeTile('character',9),
      makeTile('wind','E'), makeTile('wind','S'), makeTile('wind','W'), makeTile('wind','N'),
      makeTile('dragon','R'), makeTile('dragon','G'), makeTile('dragon','W'),
    ];
    const pairTile = makeTile('dragon', 'R');
    const hand = makeHand({
      groups:      [],
      pair:        { tiles: [pairTile, { ...pairTile }], hidden: true },
      winTile:     pairTile,
      winBy:       'self',
      specialType: '13orphans',
      orphanTiles: orphans,
      pairTile,
    });
    const score: ScoreResult = { items: [{ name: 'Treize orphelins', pts: 88 }], total: 88 };
    const text = handToText(hand, score, 9);
    expect(text).toContain('Treize orphelins');
    expect(text).toContain('1B');
    expect(text).toContain('Rouge');
    expect(text).toContain('tiré soi-même');
    expect(text).toContain('= 88 pts');
  });

  test('flags contextuels apparaissent dans le texte', () => {
    const hand = makeHand({
      winTile:      makeTile('bamboo', 5),
      winBy:        'self',
      isLastTile:   true,
      isAfterKong:  true,
      isLastExisting: true,
    });
    const text = handToText(hand, { items: [], total: 0 }, 'Calculateur');
    expect(text).toContain('dernière tuile tirée');
    expect(text).toContain('finir sur kong');
    expect(text).toContain('dernière tuile existante');
  });
});
