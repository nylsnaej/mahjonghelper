import { describe, test, expect } from 'vitest';
import { scoreHand } from '../lib/combinations';
import { makeTile } from '../lib/tiles';
import type { Hand, ScoreItem, Tile } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function expectHas(items: ScoreItem[], name: string, pts?: number) {
  const found = items.find(i => i.name === name);
  expect(found, `combinaison manquante : "${name}" dans [${items.map(i => i.name).join(', ')}]`).toBeDefined();
  if (pts !== undefined && found) {
    expect(found.pts, `"${name}" pts`).toBe(pts);
  }
}

function expectNotHas(items: ScoreItem[], name: string) {
  const found = items.find(i => i.name === name);
  expect(found, `"${name}" ne devrait pas apparaître (règle d'exclusion)`).toBeUndefined();
}

// ── Mains validées par expert ─────────────────────────────────────────────────

describe('Mains validées par expert', () => {
  // ── #1 ────────────────────────────────────────────────────────────────────
  // [1C 2C 3C] · [4R 5R 6R] · [4C 5C 6C] · Caché[7B 8B 9B] · Paire [2B 2B] · ×2 fleurs
  // Tuile gagnante : 3C (bord) | écart | Est/Est
  // Expert → Grande suite +8 | Tout Chow +2 | Double Chow +1 | Attente bord +1 | Sans honneurs +1 | ×2 Fleurs = 15 pts
  // Règle d'exclusion : Double Chow consume [4C5C6C], Petite suite pure ne doit PAS apparaître
  test('[Expert 15 pts] Grande suite + Double Chow, exclusion Petite suite pure', () => {
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [makeTile('character',1), makeTile('character',2), makeTile('character',3)], hidden: false },
        { type: 'chow', tiles: [makeTile('circle',4),    makeTile('circle',5),    makeTile('circle',6)   ], hidden: false },
        { type: 'chow', tiles: [makeTile('character',4), makeTile('character',5), makeTile('character',6)], hidden: false },
        { type: 'chow', tiles: [makeTile('bamboo',7),    makeTile('bamboo',8),    makeTile('bamboo',9)   ], hidden: true  },
      ],
      pair:    { tiles: [makeTile('bamboo',2), makeTile('bamboo',2)], hidden: false },
      flowers: [makeTile('flower',1), makeTile('flower',2)],
      winTile:  makeTile('character', 3),
      waitType: 'edge',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(15);
    expectHas(items, 'Grande suite',           8);
    expectHas(items, 'Tout Chow',              2);
    expectHas(items, 'Double Chow',            1);
    expectHas(items, 'Attente unique au bord', 1);
    expectHas(items, 'Sans honneurs',          1);
    expectNotHas(items, 'Petite suite pure');
  });

  // ── #2 ────────────────────────────────────────────────────────────────────
  // [3R 4R 5R] · Caché[6R 7R 8R] · Pung[6R 6R 6R] · CachéPung[Sud×3] · Paire[Blanc×2] · ×2 fleurs
  // Tuile gagnante : Sud | écart | Est/Est
  // Expert → Petite suite pure +1 | Pung de Vent (Sud) +1 | 4 identiques (6R) +2 | Semi pure +6 | ×2 Fleurs = 12 pts
  // Référence : https://www.youtube.com/watch?v=NhA_tBCuDyw
  test('[Expert 12 pts] 4 identiques (6R) + Semi pure', () => {
    const R = (v: number): Tile => makeTile('circle', v);
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [R(3), R(4), R(5)],                                                              hidden: false },
        { type: 'chow', tiles: [R(6), R(7), R(8)],                                                              hidden: true  },
        { type: 'pung', tiles: [R(6), R(6), R(6)],                                                              hidden: false },
        { type: 'pung', tiles: [makeTile('wind','S'), makeTile('wind','S'), makeTile('wind','S')],               hidden: true  },
      ],
      pair:    { tiles: [makeTile('dragon','W'), makeTile('dragon','W')], hidden: false },
      flowers: [makeTile('flower',1), makeTile('flower',2)],
      winTile:  makeTile('wind', 'S'),
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(12);
    expectHas(items, 'Petite suite pure',  1);
    expectHas(items, 'Pung de Vent (Sud)', 1);
    expectHas(items, '4 identiques (6R)', 2);
    expectHas(items, 'Semi pure',          6);
  });

  // ── #3 ────────────────────────────────────────────────────────────────────
  // Pung[7C×3] · Pung[3C×3] · CachéPung[Vert×3] · CachéPung[Rouge×3] · Paire[Est×2] · ×1 fleur
  // Tuile gagnante : Rouge | écart | Est/Est
  // "Deux Dragons" subsume les "Pung de Dragon" individuels
  // Expert → Deux Dragons +6 | Deux Pungs cachés +2 | Tout Pung +6 | Semi pure +6 | Fleur +1 = 21 pts
  // (l'expert avait oublié Deux Pungs cachés et annonçait 19 pts)
  test('[Expert 21 pts] Deux Dragons subsume Pung de Dragon individuels', () => {
    const C = (v: number): Tile => makeTile('character', v);
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [C(7), C(7), C(7)],                                                                hidden: false },
        { type: 'pung', tiles: [C(3), C(3), C(3)],                                                                hidden: false },
        { type: 'pung', tiles: [makeTile('dragon','G'), makeTile('dragon','G'), makeTile('dragon','G')],           hidden: true  },
        { type: 'pung', tiles: [makeTile('dragon','R'), makeTile('dragon','R'), makeTile('dragon','R')],           hidden: true  },
      ],
      pair:    { tiles: [makeTile('wind','E'), makeTile('wind','E')], hidden: false },
      flowers: [makeTile('flower',1)],
      winTile:  makeTile('dragon','R'),
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(21);
    expectHas(items, 'Deux Dragons',      6);
    expectHas(items, 'Deux Pungs cachés', 2);
    expectHas(items, 'Tout Pung',         6);
    expectHas(items, 'Semi pure',         6);
    expectHas(items, 'Fleur',             1);
    expectNotHas(items, 'Pung de Dragon (Vert)');
    expectNotHas(items, 'Pung de Dragon (Rouge)');
  });

  // ── #4 ────────────────────────────────────────────────────────────────────
  // Pung[6C×3] · Pung[9R×3] · Kong caché[6B×4] · Pung caché[1C×3] · Paire[2B×2]
  // Tuile gagnante : 2B (attente sur la paire) | écart adverse | Est/Est
  // Référence : http://www.ventdestmahjong.fr/fr/checkpoints.php combinaison 59
  // Expert → Sans honneurs +1 | Pung d'extrémité (9R) +1 | Pung d'extrémité (1C) +1
  //          | Attente sur la paire +1 | Double Pung +2 | Deux Pungs cachés +2
  //          | Kong caché (6B) +2 | Tout Pung +6 = 16 pts
  test('[Expert 16 pts] Tout Pung + Kong caché + Double Pung', () => {
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [makeTile('character',6), makeTile('character',6), makeTile('character',6)], hidden: false },
        { type: 'pung', tiles: [makeTile('circle',9),    makeTile('circle',9),    makeTile('circle',9)   ], hidden: false },
        { type: 'kong', tiles: [makeTile('bamboo',6),    makeTile('bamboo',6),    makeTile('bamboo',6),    makeTile('bamboo',6)  ], hidden: true  },
        { type: 'pung', tiles: [makeTile('character',1), makeTile('character',1), makeTile('character',1)], hidden: true  },
      ],
      pair:    { tiles: [makeTile('bamboo',2), makeTile('bamboo',2)], hidden: false },
      winTile:  makeTile('bamboo', 2),
      waitType: 'pair',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(16);
    expectHas(items, 'Sans honneurs',                1);
    expectHas(items, "Pung d'extrémité (9R)",        1);
    expectHas(items, "Pung d'extrémité (1C)",        1);
    expectHas(items, 'Attente unique sur la paire',  1);
    expectHas(items, 'Double Pung',                  2);
    expectHas(items, 'Deux Pungs cachés',            2);
    expectHas(items, 'Kong caché (6B)',              2);
    expectHas(items, 'Tout Pung',                    6);
  });

  // ── #5 ────────────────────────────────────────────────────────────────────
  // Chow caché [6C 7C 8C] · Chow caché [6R 7R 8R] · Chow caché [6B 7B 8B] · Chow caché [1C 2C 3C] · Paire [4C 4C]
  // Tuile gagnante : 3C (attente au bord) | écart | Est/Est
  // Fix : Tout caché donné ne requiert pas pair.hidden
  // Note : site de référence compte 13 pts (sans "Sans honneurs") — PDF ne confirme
  //        pas cette exclusion (test #1 valide "Sans honneurs" avec "Tout Chow"). On garde 14 pts.
  // Notre score → Triple Chows +8 | Tout Chow +2 | Tout caché donné +2 | Attente au bord +1 | Sans honneurs +1 = 14 pts
  test('[14 pts] Triple Chows tout caché donné, fix pair.hidden', () => {
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [makeTile('character',6), makeTile('character',7), makeTile('character',8)], hidden: true  },
        { type: 'chow', tiles: [makeTile('circle',6),    makeTile('circle',7),    makeTile('circle',8)   ], hidden: true  },
        { type: 'chow', tiles: [makeTile('bamboo',6),    makeTile('bamboo',7),    makeTile('bamboo',8)   ], hidden: true  },
        { type: 'chow', tiles: [makeTile('character',1), makeTile('character',2), makeTile('character',3)], hidden: true  },
      ],
      pair:    { tiles: [makeTile('character',4), makeTile('character',4)], hidden: false },
      winTile:  makeTile('character', 3),
      waitType: 'edge',
      winBy:    'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(14);
    expectHas(items, 'Triple Chows',           8);
    expectHas(items, 'Tout Chow',              2);
    expectHas(items, 'Tout caché donné',       2);
    expectHas(items, 'Attente unique au bord', 1);
    expectHas(items, 'Sans honneurs',          1);
  });

  // ── #7 ────────────────────────────────────────────────────────────────────
  // Chow[1R 2R 3R] · Caché Chow[1B 2B 3B] · Caché Chow[2B 3B 4B] · Chow[1C 2C 3C] · Paire[3R 3R]
  // Tuile gagnante : 3C (attente au bord) | écart adverse | Est/Est
  // Référence : http://www.ventdestmahjong.fr/fr/checkpoints.php
  // Exclusions PDF :
  //   - "Sans honneurs" inclus par définition dans "Les quatre premiers" (PDF p.27)
  //   - "Double Chow" exclu par "Triple Chows" (PDF pp.37-38, exemples)
  // Expert → Attente au bord +1 | Tout Chow +2 | Triple Chows +8 | Les quatre premiers +12 = 23 pts
  test('[Expert 23 pts] Les quatre premiers + Triple Chows, exclusions Sans honneurs + Double Chow', () => {
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [makeTile('circle',1),    makeTile('circle',2),    makeTile('circle',3)   ], hidden: false },
        { type: 'chow', tiles: [makeTile('bamboo',1),    makeTile('bamboo',2),    makeTile('bamboo',3)   ], hidden: true  },
        { type: 'chow', tiles: [makeTile('bamboo',2),    makeTile('bamboo',3),    makeTile('bamboo',4)   ], hidden: true  },
        { type: 'chow', tiles: [makeTile('character',1), makeTile('character',2), makeTile('character',3)], hidden: false },
      ],
      pair:    { tiles: [makeTile('circle',3), makeTile('circle',3)], hidden: false },
      winTile:  makeTile('character', 3),
      waitType: 'edge',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(23);
    expectHas(items, 'Attente unique au bord', 1);
    expectHas(items, 'Tout Chow',              2);
    expectHas(items, 'Triple Chows',           8);
    expectHas(items, 'Les quatre premiers',   12);
    expectNotHas(items, 'Sans honneurs');
    expectNotHas(items, 'Double Chow');
  });

  // ── #8 ────────────────────────────────────────────────────────────────────
  // Pung [4B 4B 4B] · Pung [6C 6C 6C] · Pung caché [7B 7B 7B] · Pung caché [2B 2B 2B] · Paire [4R 4R]
  // Tuile gagnante : 2B | écart | Est/Est
  // Référence : ventdestmahjong.fr exemple 233 (Tout Pung 6 + Tout ordinaire 2 = 8)
  // Note : site de référence omet "Deux Pungs cachés" — PDF p.11 dit explicitement
  //        « peut se cumuler avec les points des Pungs » → on le compte.
  //        "Sans honneurs" exclu par "Tout ordinaire" (PDF p.12, sous-ensemble).
  // Notre score → Tout Pung +6 | Tout ordinaire +2 | Deux Pungs cachés +2 = 10 pts
  test('[10 pts] Tout Pung + Tout ordinaire, exclusion Sans honneurs', () => {
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [makeTile('bamboo',4),    makeTile('bamboo',4),    makeTile('bamboo',4)   ], hidden: false },
        { type: 'pung', tiles: [makeTile('character',6), makeTile('character',6), makeTile('character',6)], hidden: false },
        { type: 'pung', tiles: [makeTile('bamboo',7),    makeTile('bamboo',7),    makeTile('bamboo',7)   ], hidden: true  },
        { type: 'pung', tiles: [makeTile('bamboo',2),    makeTile('bamboo',2),    makeTile('bamboo',2)   ], hidden: true  },
      ],
      pair:    { tiles: [makeTile('circle',4), makeTile('circle',4)], hidden: false },
      winTile:  makeTile('bamboo', 2),
      winBy:    'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(10);
    expectHas(items, 'Tout Pung',         6);
    expectHas(items, 'Tout ordinaire',    2);
    expectHas(items, 'Deux Pungs cachés', 2);
    expectNotHas(items, 'Sans honneurs');
  });

  // ── #9 ────────────────────────────────────────────────────────────────────
  // Pung [Blanc×3] · Pung caché [3R×3] · Chow [7R 8R 9R] · Chow caché [7R 8R 9R] · Paire [Rouge×2]
  // Tuile gagnante : 8R (attente au milieu) | écart | Est/Sud
  // Confirmé par ventdestmahjong.fr
  // Score → Double Chow pur +1 | Attente unique au milieu +1 | Pung de Dragon (Blanc) +2 | Semi pure +6 = 10 pts
  test('[Expert 10 pts] Semi pure + Double Chow pur + Pung de Dragon (Blanc)', () => {
    const R = (v: number): Tile => makeTile('circle', v);
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [makeTile('dragon','W'), makeTile('dragon','W'), makeTile('dragon','W')], hidden: false },
        { type: 'pung', tiles: [R(3), R(3), R(3)],                                                      hidden: true  },
        { type: 'chow', tiles: [R(7), R(8), R(9)],                                                      hidden: false },
        { type: 'chow', tiles: [R(7), R(8), R(9)],                                                      hidden: true  },
      ],
      pair:      { tiles: [makeTile('dragon','R'), makeTile('dragon','R')], hidden: false },
      winTile:   R(8),
      waitType:  'closed',
      winBy:     'discard',
      windRound: 'E',
      windPlayer: 'S',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(10);
    expectHas(items, 'Double Chow pur',         1);
    expectHas(items, 'Attente unique au milieu', 1);
    expectHas(items, 'Pung de Dragon (Blanc)',   2);
    expectHas(items, 'Semi pure',               6);
  });

  // ── #10 ───────────────────────────────────────────────────────────────────
  // Sept paires [4C4C / 8C8C / 5B5B / 6B6B / BlancBlanc / VertVert / NordNord]
  // Tuile gagnante : Nord | écart | Est/Est
  // Référence : ventdestmahjong.fr main 40
  // Score → Sept paires +24 | Une famille absente +1 = 25 pts
  test('[Expert 25 pts] Sept paires + Une famille absente', () => {
    const C = (v: number): Tile => makeTile('character', v);
    const B = (v: number): Tile => makeTile('bamboo', v);
    const hand = makeHand({
      groups: [
        { type: 'pair7', tiles: [C(4), C(4)],                                                             hidden: true },
        { type: 'pair7', tiles: [C(8), C(8)],                                                             hidden: true },
        { type: 'pair7', tiles: [B(5), B(5)],                                                             hidden: true },
        { type: 'pair7', tiles: [B(6), B(6)],                                                             hidden: true },
        { type: 'pair7', tiles: [makeTile('dragon','W'), makeTile('dragon','W')],                         hidden: true },
        { type: 'pair7', tiles: [makeTile('dragon','G'), makeTile('dragon','G')],                         hidden: true },
      ],
      pair:        { tiles: [makeTile('wind','N'), makeTile('wind','N')], hidden: true },
      winTile:     makeTile('wind', 'N'),
      winBy:       'discard',
      specialType: '7pairs',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(25);
    expectHas(items, 'Sept paires',         24);
    expectHas(items, 'Une famille absente',  1);
  });

  // ── #11 ───────────────────────────────────────────────────────────────────
  // Pung [7C×3] · Pung [5C×3] · Pung [5R×3] · Pung [4R×3] · Paire [6C×2]
  // Tuile gagnante : 6C (attente sur la paire) | écart | Est/Est
  // Référence : ventdestmahjong.fr main 202
  // PDF p.16 : « le point pour attente sur la paire est inclus » dans Tout exposé
  // Score → Une famille absente +1 | Double Pung +2 | Tout ordinaire +2 | Tout Pung +6 | Tout exposé +6 = 17 pts
  test('[Expert 17 pts] Tout exposé exclut attente sur la paire', () => {
    const C = (v: number): Tile => makeTile('character', v);
    const R = (v: number): Tile => makeTile('circle', v);
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [C(7), C(7), C(7)], hidden: false },
        { type: 'pung', tiles: [C(5), C(5), C(5)], hidden: false },
        { type: 'pung', tiles: [R(5), R(5), R(5)], hidden: false },
        { type: 'pung', tiles: [R(4), R(4), R(4)], hidden: false },
      ],
      pair:    { tiles: [C(6), C(6)], hidden: false },
      winTile:  C(6),
      waitType: 'pair',
      winBy:    'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(17);
    expectHas(items, 'Une famille absente',  1);
    expectHas(items, 'Double Pung',          2);
    expectHas(items, 'Tout ordinaire',       2);
    expectHas(items, 'Tout Pung',            6);
    expectHas(items, 'Tout exposé',          6);
    expectNotHas(items, 'Attente unique sur la paire');
    expectNotHas(items, 'Sans honneurs');
  });

  // ── #12 ───────────────────────────────────────────────────────────────────
  // Chow [1B 2B 3B] · Chow caché [4R 5R 6R] · Chow caché [7B 8B 9B] · Chow [4B 5B 6B] · Paire [1B 1B]
  // Tuile gagnante : 5B (attente au milieu) | écart | Est/Est
  // Référence : ventdestmahjong.fr main 217
  // Exclusion PDF p.29 : Grande suite pure exclut Deux Chows purs d'extrémité (exemple 1)
  // Note : site de référence omet aussi "Sans honneurs" — PDF p.29 exemple 1 le compte → on garde
  // Score → Double Chow +1 | Une famille absente +1 | Sans honneurs +1 | Attente au milieu +1
  //          | Tout Chow +2 | Grande suite pure +16 = 22 pts
  test('[22 pts] Grande suite pure, exclusion Deux Chows purs d\'extrémité', () => {
    const B = (v: number): Tile => makeTile('bamboo', v);
    const R = (v: number): Tile => makeTile('circle', v);
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [B(1), B(2), B(3)], hidden: false },
        { type: 'chow', tiles: [R(4), R(5), R(6)], hidden: true  },
        { type: 'chow', tiles: [B(7), B(8), B(9)], hidden: true  },
        { type: 'chow', tiles: [B(4), B(5), B(6)], hidden: false },
      ],
      pair:    { tiles: [B(1), B(1)], hidden: false },
      winTile:  B(5),
      waitType: 'closed',
      winBy:    'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(22);
    expectHas(items, 'Double Chow',            1);
    expectHas(items, 'Une famille absente',     1);
    expectHas(items, 'Sans honneurs',           1);
    expectHas(items, 'Attente unique au milieu',1);
    expectHas(items, 'Tout Chow',              2);
    expectHas(items, 'Grande suite pure',      16);
    expectNotHas(items, "Deux Chows purs d'extrémité");
  });
});
