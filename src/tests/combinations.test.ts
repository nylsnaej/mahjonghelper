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
  // DC(R4+C4) cross-famille et PSP(C1+C4) intra-famille sont indépendants → les deux s'appliquent.
  // (La règle "DC consume le chow" était auto-imposée, non confirmée par le PDF ni le site de référence.)
  // Sans honneurs exclu par Tout Chow (PDF p.11)
  // Score → Grande suite +8 | Tout Chow +2 | Double Chow +1 | Petite suite pure +1 | Attente bord +1 | ×2 Fleurs = 15 pts
  test('[15 pts] Grande suite + Double Chow + Petite suite pure (DC et PSP indépendants)', () => {
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
    expectHas(items, 'Petite suite pure',      1);
    expectHas(items, 'Attente unique au bord', 1);
    expectNotHas(items, 'Sans honneurs');
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
  // "Deux Dragons" subsume les "Pung de Dragon" individuels.
  // PDF p.11 : "Un Pung caché = 3 tuiles tirées soi-même" → le pung Rouge (complété par l'écart
  //   gagnant) n'est PAS "caché". Seul le pung Vert compte → 1 seul pung caché, pas de Deux Pungs cachés.
  // Score → Deux Dragons +6 | Tout Pung +6 | Semi pure +6 | Fleur +1 = 19 pts
  test('[19 pts] Deux Dragons subsume Pung de Dragon individuels (pung gagnant par écart = non caché)', () => {
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
    expect(total).toBe(19);
    expectHas(items, 'Deux Dragons',      6);
    expectHas(items, 'Tout Pung',         6);
    expectHas(items, 'Semi pure',         6);
    expectHas(items, 'Fleur',             1);
    expectNotHas(items, 'Deux Pungs cachés');
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
  // Sans honneurs exclu par Tout Chow (PDF p.11) — site de référence (13 pts) était correct
  // Score → Triple Chows +8 | Tout Chow +2 | Tout caché donné +2 | Attente au bord +1 = 13 pts
  test('[13 pts] Triple Chows tout caché donné, Sans honneurs exclu par Tout Chow', () => {
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
    expect(total).toBe(13);
    expectHas(items, 'Triple Chows',           8);
    expectHas(items, 'Tout Chow',              2);
    expectHas(items, 'Tout caché donné',       2);
    expectHas(items, 'Attente unique au bord', 1);
    expectNotHas(items, 'Sans honneurs');
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
  // Référence : ventdestmahjong.fr exemple 233 → Tout Pung +6 | Tout ordinaire +2 = 8 pts (correct)
  // PDF p.11 : le pung 2B est complété par l'écart gagnant → NON "caché". Seul le pung 7B compte.
  //   1 seul pung caché → "Deux Pungs cachés" ne s'applique pas. Le site avait raison.
  //   "Sans honneurs" exclu par "Tout ordinaire" (PDF p.12, sous-ensemble).
  // Score → Tout Pung +6 | Tout ordinaire +2 = 8 pts
  test('[8 pts] Tout Pung + Tout ordinaire, exclusion Sans honneurs (pung gagnant par écart = non caché)', () => {
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
    expect(total).toBe(8);
    expectHas(items, 'Tout Pung',         6);
    expectHas(items, 'Tout ordinaire',    2);
    expectNotHas(items, 'Deux Pungs cachés');
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
  // Référence : ventdestmahjong.fr main 217 (21 pts — était correct)
  // Exclusions : Grande suite pure exclut Deux Chows purs d'extrémité (PDF p.29 ex.1)
  //              Tout Chow exclut Sans honneurs (PDF p.11) — site de référence avait raison
  // Score → Double Chow +1 | Une famille absente +1 | Attente au milieu +1
  //          | Tout Chow +2 | Grande suite pure +16 = 21 pts
  test('[Expert 21 pts] Grande suite pure, exclusions Deux Chows d\'extrémité + Sans honneurs', () => {
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
    expect(total).toBe(21);
    expectHas(items, 'Double Chow',            1);
    expectHas(items, 'Une famille absente',     1);
    expectHas(items, 'Attente unique au milieu',1);
    expectHas(items, 'Tout Chow',              2);
    expectHas(items, 'Grande suite pure',      16);
    expectNotHas(items, 'Sans honneurs');
    expectNotHas(items, "Deux Chows purs d'extrémité");
  });

  // ── #13 ───────────────────────────────────────────────────────────────────
  // Pung [6B×3] · Kong [6C×4] · Kong caché [5R×4] · Chow caché [3C 4C 5C] · Paire [8C×2]
  // Tuile gagnante : 4C (attente au milieu) | écart | Est/Est
  // Référence : ventdestmahjong.fr main 238
  // PDF p.17 : Kong caché + Kong exposé exclut Kong exposé (+1) et Kong caché (+2) individuels
  // Score → Attente au milieu +1 | Double Pung +2 | Tout ordinaire +2 | Kong caché + Kong exposé +6 = 11 pts
  test('[Expert 11 pts] Kong caché + Kong exposé exclut bonus individuels', () => {
    const C = (v: number): Tile => makeTile('character', v);
    const B = (v: number): Tile => makeTile('bamboo', v);
    const R = (v: number): Tile => makeTile('circle', v);
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [B(6), B(6), B(6)],                   hidden: false },
        { type: 'kong', tiles: [R(6), R(6), R(6), R(6)],             hidden: false },
        { type: 'kong', tiles: [R(5), R(5), R(5), R(5)],             hidden: true  },
        { type: 'chow', tiles: [C(3), C(4), C(5)],                   hidden: true  },
      ],
      pair:    { tiles: [C(8), C(8)], hidden: false },
      winTile:  C(4),
      waitType: 'closed',
      winBy:    'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(11);
    expectHas(items, 'Attente unique au milieu',  1);
    expectHas(items, 'Double Pung',               2);
    expectHas(items, 'Tout ordinaire',            2);
    expectHas(items, 'Kong caché + Kong exposé',  6);
    expectNotHas(items, 'Kong exposé (6R)');
    expectNotHas(items, 'Kong caché (5R)');
    expectNotHas(items, 'Sans honneurs');
  });

  // ── #14 ───────────────────────────────────────────────────────────────────
  // Chow [3R 4R 5R] · Chow [7B 8B 9B] · Chow [7R 8R 9R] · Chow caché [7C 8C 9C] · Paire [3B 3B]
  // Tuile gagnante : 8C (attente au milieu) | écart | Est/Sud
  // Tout Chow exclut Sans honneurs (PDF p.11)
  // Score → Triple Chows +8 | Tout Chow +2 | Attente au milieu +1 = 11 pts
  test('[Expert 11 pts] Triple Chows + Tout Chow, Sans honneurs exclu', () => {
    const B = (v: number): Tile => makeTile('bamboo', v);
    const R = (v: number): Tile => makeTile('circle', v);
    const C = (v: number): Tile => makeTile('character', v);
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [R(3), R(4), R(5)], hidden: false },
        { type: 'chow', tiles: [B(7), B(8), B(9)], hidden: false },
        { type: 'chow', tiles: [R(7), R(8), R(9)], hidden: false },
        { type: 'chow', tiles: [C(7), C(8), C(9)], hidden: true  },
      ],
      pair:      { tiles: [B(3), B(3)], hidden: false },
      winTile:   C(8),
      waitType:  'closed',
      winBy:     'discard',
      windPlayer: 'S',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(11);
    expectHas(items, 'Triple Chows',           8);
    expectHas(items, 'Tout Chow',              2);
    expectHas(items, 'Attente unique au milieu',1);
    expectNotHas(items, 'Sans honneurs');
    expectNotHas(items, 'Double Chow');
  });

  // ── #15 ───────────────────────────────────────────────────────────────────
  // Chow [1R 2R 3R] · Chow caché [7C 8C 9C] · Chow caché [6R 7R 8R] · Chow [2B 3B 4B] · Paire [Ouest Ouest]
  // Tuile gagnante : 4B | écart | Est/Nord
  // Référence : ventdestmahjong.fr — "main sans valeur - 8 pts"
  // Aucune combinaison → Main sans valeur automatique
  test('[Expert 8 pts] Main sans valeur détectée automatiquement', () => {
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [makeTile('circle',1),    makeTile('circle',2),    makeTile('circle',3)   ], hidden: false },
        { type: 'chow', tiles: [makeTile('character',7), makeTile('character',8), makeTile('character',9)], hidden: true  },
        { type: 'chow', tiles: [makeTile('circle',6),    makeTile('circle',7),    makeTile('circle',8)   ], hidden: true  },
        { type: 'chow', tiles: [makeTile('bamboo',2),    makeTile('bamboo',3),    makeTile('bamboo',4)   ], hidden: false },
      ],
      pair:      { tiles: [makeTile('wind','W'), makeTile('wind','W')], hidden: false },
      winTile:   makeTile('bamboo', 4),
      winBy:     'discard',
      windRound: 'E',
      windPlayer: 'N',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(8);
    expectHas(items, 'Main sans valeur', 8);
  });

  // ── #16 ───────────────────────────────────────────────────────────────────
  // Pung [3B] · Pung [5B] · Pung [6B] · Pung caché [4B] · Paire [8R]
  // Tuile gagnante : 4B | écart | Est/Est
  // Référence : ventdestmahjong.fr
  // PDF p.43 : Quatre Pungs purs consécutifs inclut Tout Pung et Trois Pungs purs consécutifs
  // Bug corrigé : Trois Pungs purs consécutifs ne doit pas être compté deux fois
  // Score → Une famille absente +1 | Tout ordinaire +2 | Quatre Pungs purs consécutifs +48 = 51 pts
  test('[Expert 51 pts] Quatre Pungs purs consécutifs, exclusions Tout Pung + Trois Pungs purs', () => {
    const B = (v: number): Tile => makeTile('bamboo', v);
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [B(3), B(3), B(3)], hidden: false },
        { type: 'pung', tiles: [B(6), B(6), B(6)], hidden: false },
        { type: 'pung', tiles: [B(5), B(5), B(5)], hidden: false },
        { type: 'pung', tiles: [B(4), B(4), B(4)], hidden: true  },
      ],
      pair:    { tiles: [makeTile('circle',8), makeTile('circle',8)], hidden: false },
      winTile:  B(4),
      winBy:   'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(51);
    expectHas(items, 'Une famille absente',           1);
    expectHas(items, 'Tout ordinaire',                2);
    expectHas(items, 'Quatre Pungs purs consécutifs', 48);
    expectNotHas(items, 'Tout Pung');
    expectNotHas(items, 'Trois Pungs purs consécutifs');
  });

  // ── #17 ───────────────────────────────────────────────────────────────────
  // Chow [7R 8R 9R] · Chow [7B 9B 8B] · Chow caché [1C 2C 3C] · Chow caché [7R 8R 9R] · Paire [1R 1R]
  // Tuile gagnante : 9R | écart | Est/Est
  // Référence : ventdestmahjong.fr
  // Fix : Double Chow pur (C7+C7) ET Double Chow (C7+B7) coexistent —
  //       Double Chow pur utilise un ensemble séparé et ne bloque pas le Double Chow cross-famille
  // Score → Double Chow pur +1 | Double Chow +1 | Tout Chow +2 | Extrémité ou honneur partout +4 = 8 pts
  test('[Expert 8 pts] Double Chow pur + Double Chow coexistent (3 chows valeur 7)', () => {
    const R = (v: number): Tile => makeTile('circle', v);
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [R(7), R(8), R(9)],                                                              hidden: false },
        { type: 'chow', tiles: [makeTile('bamboo',7), makeTile('bamboo',8), makeTile('bamboo',9)],               hidden: false },
        { type: 'chow', tiles: [makeTile('character',1), makeTile('character',2), makeTile('character',3)],      hidden: true  },
        { type: 'chow', tiles: [R(7), R(8), R(9)],                                                              hidden: true  },
      ],
      pair:    { tiles: [R(1), R(1)], hidden: false },
      winTile:  R(9),
      winBy:   'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(8);
    expectHas(items, 'Double Chow pur',              1);
    expectHas(items, 'Double Chow',                  1);
    expectHas(items, 'Tout Chow',                    2);
    expectHas(items, 'Extrémité ou honneur partout', 4);
  });

  // ── #18 ───────────────────────────────────────────────────────────────────
  // Chow [1B 2B 3B] · Pung [5B 5B 5B] · Pung caché [Vert Vert Vert] · Chow caché [4B 5B 3B] · Paire [9B 9B]
  // Tuile gagnante : 3B | écart | Sud/Sud
  // Référence : ventdestmahjong.fr (avec Dernière tuile existante +4 → 14 pts côté site)
  // Bug corrigé : chow [4B 5B 3B] a tiles[0]=4B mais son vrai début est min(3,4,5)=3.
  //   tiles[0].value=4 vs 1 donnait diff=3 → fausse Petite suite pure.
  //   Avec normalisation (min), diff=3-1=2 → pas de Petite suite pure.
  // Score sans flag → Semi pure +6 | 4 identiques (5B) +2 | Pung de Dragon (Vert) +2 = 10 pts
  test('[10 pts] Bug tiles[0] : pas de fausse Petite suite pure sur chow saisi dans le désordre', () => {
    const B = (v: number): Tile => makeTile('bamboo', v);
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [B(1), B(2), B(3)],                                                                     hidden: false },
        { type: 'pung', tiles: [B(5), B(5), B(5)],                                                                     hidden: false },
        { type: 'pung', tiles: [makeTile('dragon','G'), makeTile('dragon','G'), makeTile('dragon','G')],                hidden: true  },
        { type: 'chow', tiles: [B(4), B(5), B(3)],  // ordre de saisie : 4 d'abord, 3 en dernier (gagnant)
                                                                                                                         hidden: true  },
      ],
      pair:      { tiles: [B(9), B(9)], hidden: false },
      winTile:   B(3),
      winBy:     'discard',
      windRound: 'S',
      windPlayer: 'S',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(10);
    expectHas(items, 'Semi pure',            6);
    expectHas(items, '4 identiques (5B)',    2);
    expectHas(items, 'Pung de Dragon (Vert)',2);
    expectNotHas(items, 'Petite suite pure');
  });

  // ── #19 ───────────────────────────────────────────────────────────────────
  // Chow [1B 2B 3B] · Chow caché [1R 2R 3R] · Chow caché [1C 2C 3C] · Chow [1C 3C 2C] · Paire [4B 4B]
  // Tuile gagnante : 2C (attente au milieu) | écart | Est/Est
  // Bug corrigé : 4 chows valeur 1 → (B1,R1,Ch1-caché) ET (B1,R1,Ch1-exposé) déclenchaient
  //   deux Triple Chows. Fix : Set tcFound par valeur de départ.
  // Score → Double Chow pur +1 | Attente au milieu +1 | Tout Chow +2 | Triple Chows +8
  //          | Les quatre premiers +12 = 24 pts
  test('[24 pts] Triple Chows une seule fois malgré 2 chows même famille+valeur', () => {
    const B = (v: number): Tile => makeTile('bamboo', v);
    const R = (v: number): Tile => makeTile('circle', v);
    const C = (v: number): Tile => makeTile('character', v);
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [B(1), B(2), B(3)], hidden: false },
        { type: 'chow', tiles: [R(1), R(2), R(3)], hidden: true  },
        { type: 'chow', tiles: [C(1), C(2), C(3)], hidden: true  },
        { type: 'chow', tiles: [C(1), C(3), C(2)], hidden: false }, // ordre saisie : 1,3,2
      ],
      pair:    { tiles: [B(4), B(4)], hidden: false },
      winTile:  C(2),
      waitType: 'closed',
      winBy:   'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(24);
    expectHas(items, 'Double Chow pur',          1);
    expectHas(items, 'Attente unique au milieu',  1);
    expectHas(items, 'Tout Chow',               2);
    expectHas(items, 'Triple Chows',            8);
    expectHas(items, 'Les quatre premiers',    12);
    // Triple Chows ne doit apparaître qu'une seule fois
    expect(items.filter(i => i.name === 'Triple Chows').length).toBe(1);
  });

  // ── #20 ───────────────────────────────────────────────────────────────────
  // Pung caché [Nord] · Pung caché [Blanc] · Chow caché [7R 8R 9R] · Pung caché [3C] · Paire [5B]
  // Tuile gagnante : 5B (paire) | écart | Nord/Ouest
  // PDF p.30 : Trois Pungs cachés ne cumule pas Deux Pungs cachés (aucun exemple PDF)
  // Score → Attente paire +1 | Pung de Dragon (Blanc) +2 | Vent du tour (Nord) +2
  //          | Tout caché donné +2 | Tout Type +6 | Trois Pungs cachés +16 = 29 pts
  test('[29 pts] Trois Pungs cachés exclut Deux Pungs cachés', () => {
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [makeTile('wind','N'),   makeTile('wind','N'),   makeTile('wind','N')  ], hidden: true  },
        { type: 'pung', tiles: [makeTile('dragon','W'), makeTile('dragon','W'), makeTile('dragon','W')], hidden: true  },
        { type: 'chow', tiles: [makeTile('circle',7),   makeTile('circle',8),   makeTile('circle',9)  ], hidden: true  },
        { type: 'pung', tiles: [makeTile('character',3),makeTile('character',3),makeTile('character',3)], hidden: true  },
      ],
      pair:      { tiles: [makeTile('bamboo',5), makeTile('bamboo',5)], hidden: false },
      winTile:   makeTile('bamboo', 5),
      waitType:  'pair',
      winBy:     'discard',
      windRound: 'N',
      windPlayer: 'W',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(29);
    expectHas(items, 'Attente unique sur la paire', 1);
    expectHas(items, 'Pung de Dragon (Blanc)',      2);
    expectHas(items, 'Vent du tour (Nord)',          2);
    expectHas(items, 'Tout caché donné',            2);
    expectHas(items, 'Tout Type',                   6);
    expectHas(items, 'Trois Pungs cachés',         16);
    expectNotHas(items, 'Deux Pungs cachés');
  });

  // ── #21 ───────────────────────────────────────────────────────────────────
  // Chow [1B 2B 3B] · Chow [2R 3R 4R] · Chow [3C 4C 5C] · Chow [4B 5B 6B] · Paire [8R 8R]
  // Bug C-01 : 4 chows sur 3 familles aux débuts 1,2,3,4 forment deux triplets superposés
  //   (1B,2R,3C) et (2R,3C,4B) → avant fix, Trois Chows superposés comptait 2× (+12 pts)
  // Score → Petite suite pure +1 | Tout Chow +2 | Trois Chows superposés +6 = 9 pts
  test('[9 pts] Bug C-01 : Trois Chows superposés compte une seule fois (4 chows, 3 familles)', () => {
    const B = (v: number): Tile => makeTile('bamboo', v);
    const R = (v: number): Tile => makeTile('circle', v);
    const C = (v: number): Tile => makeTile('character', v);
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [B(1), B(2), B(3)], hidden: false },
        { type: 'chow', tiles: [R(2), R(3), R(4)], hidden: false },
        { type: 'chow', tiles: [C(3), C(4), C(5)], hidden: false },
        { type: 'chow', tiles: [B(4), B(5), B(6)], hidden: true  }, // caché pour neutraliser Tout exposé
      ],
      pair:    { tiles: [R(8), R(8)], hidden: false },
      winTile:  R(8),
      winBy:   'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(9);
    expect(items.filter(i => i.name === 'Trois Chows superposés').length).toBe(1);
    expectHas(items, 'Trois Chows superposés', 6);
    expectHas(items, 'Tout Chow',              2);
    expectHas(items, 'Petite suite pure',       1);
  });

  // ── #22 ───────────────────────────────────────────────────────────────────
  // Pung [3B×3] · Pung [4R×3] · Pung [5C×3] · Pung [6B×3] · Paire [2R×2]
  // Bug C-03 : 4 pungs aux valeurs 3,4,5,6 sur 3 familles forment deux triplets consécutifs
  //   (3B,4R,5C) et (4R,5C,6B) → avant fix, Trois Pungs consécutifs comptait 2× (+16 pts)
  // Score → Tout ordinaire +2 | Tout Pung +6 | Trois Pungs consécutifs +8 = 16 pts
  test('[16 pts] Bug C-03 : Trois Pungs consécutifs compte une seule fois (4 pungs, 3 familles)', () => {
    const B = (v: number): Tile => makeTile('bamboo', v);
    const R = (v: number): Tile => makeTile('circle', v);
    const C = (v: number): Tile => makeTile('character', v);
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [B(3), B(3), B(3)], hidden: false },
        { type: 'pung', tiles: [R(4), R(4), R(4)], hidden: false },
        { type: 'pung', tiles: [C(5), C(5), C(5)], hidden: false },
        { type: 'pung', tiles: [B(6), B(6), B(6)], hidden: true  }, // caché pour neutraliser Tout exposé
      ],
      pair:    { tiles: [R(2), R(2)], hidden: false },
      winTile:  R(2),
      winBy:   'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(16);
    expect(items.filter(i => i.name === 'Trois Pungs consécutifs').length).toBe(1);
    expectHas(items, 'Tout ordinaire',          2);
    expectHas(items, 'Tout Pung',               6);
    expectHas(items, 'Trois Pungs consécutifs', 8);
    expectNotHas(items, 'Sans honneurs');
  });

  // ── #22bis / main 246 ventdest ───────────────────────────────────────────
  // Chow caché [4C 5C 6C] · Chow caché [7C 8C 9C] · Chow caché [1R 2R 3R] · Chow caché [7R 8R 9R] · Paire [3R 3R]
  // Tuile gagnante : 8R (attente milieu) | écart | Est/Est
  // Référence : ventdestmahjong.fr/fr/checkpoints.php main 246 → 9 pts
  // Pairages : DC(7C+7R cross-famille), PSP(4C+7C intra-char), DCext(1R+7R intra-circle)
  //   DC et PSP/DCext utilisent des ensembles indépendants → les 3 pairages coexistent.
  //   7C est dans DC (cross-famille) ET dans PSP (intra-char) → valide sous le modèle à tracking séparé.
  //   7R est dans DC (cross-famille) ET dans DCext (intra-circle) → valide.
  // Score → Double Chow +1 | Petite suite pure +1 | Deux Chows purs d'extrémité +1
  //          | Une famille absente +1 | Attente unique au milieu +1 | Tout caché donné +2 | Tout Chow +2 = 9 pts
  test("[9 pts] Main 246 : DC + PSP + DCext coexistent (tracking cross-famille / intra-famille séparés)", () => {
    const C = (v: number): Tile => makeTile('character', v);
    const R = (v: number): Tile => makeTile('circle', v);
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [C(4), C(5), C(6)], hidden: true  }, // chow0 char start=4
        { type: 'chow', tiles: [C(7), C(8), C(9)], hidden: true  }, // chow1 char start=7
        { type: 'chow', tiles: [R(1), R(2), R(3)], hidden: true  }, // chow2 circle start=1
        { type: 'chow', tiles: [R(7), R(9), R(8)], hidden: true  }, // chow3 circle start=7 (ordre saisie)
      ],
      pair:    { tiles: [R(3), R(3)], hidden: false },
      winTile:  R(8),
      waitType: 'closed',
      winBy:   'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(9);
    expectHas(items, 'Double Chow',                    1);
    expectHas(items, 'Petite suite pure',               1);
    expectHas(items, "Deux Chows purs d'extrémité",    1);
    expectHas(items, 'Une famille absente',              1);
    expectHas(items, 'Attente unique au milieu',         1);
    expectHas(items, 'Tout caché donné',                2);
    expectHas(items, 'Tout Chow',                       2);
  });

  // ── #23 ───────────────────────────────────────────────────────────────────
  // Chow [1B 2B 3B] · Chow [2B 3B 4B] · Chow [3B 4B 5B] · Chow [4B 5B 6B] · Paire [9R 9R]
  // Bug C-02 : 4 chows de même famille aux débuts 1,2,3,4 forment deux triplets superposés purs
  //   (1,2,3) et (2,3,4) → avant fix, Trois Chows purs superposés comptait 2× (+32 pts)
  // Quatre Chows purs superposés (starts 1,2,3,4 d=1) exclut Trois Chows purs superposés.
  // Tout exposé s'applique (tous groupes exposés + écart) → inclus dans le score.
  // Score → Une famille absente +1 | Petite suite pure +1 | Tout Chow +2 | Tout exposé +6
  //          | Quatre Chows purs superposés +32 = 42 pts
  test('[42 pts] Bug C-02 : Trois Chows purs superposés exclu par Quatre Chows purs superposés', () => {
    const B = (v: number): Tile => makeTile('bamboo', v);
    const R = (v: number): Tile => makeTile('circle', v);
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [B(1), B(2), B(3)], hidden: false },
        { type: 'chow', tiles: [B(2), B(3), B(4)], hidden: false },
        { type: 'chow', tiles: [B(3), B(4), B(5)], hidden: false },
        { type: 'chow', tiles: [B(4), B(5), B(6)], hidden: false },
      ],
      pair:    { tiles: [R(9), R(9)], hidden: false },
      winTile:  R(9),
      winBy:   'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(42);
    expectHas(items, 'Une famille absente',           1);
    expectHas(items, 'Petite suite pure',             1);
    expectHas(items, 'Tout Chow',                     2);
    expectHas(items, 'Tout exposé',                   6);
    expectHas(items, 'Quatre Chows purs superposés', 32);
    expectNotHas(items, 'Trois Chows purs superposés');
    expectNotHas(items, 'Sans honneurs');
  });

  // ── #24 ───────────────────────────────────────────────────────────────────
  // Chow caché [4C 5C 6C] · Chow caché [7C 8C 9C] · Chow caché [1R 2R 3R] · Chow caché [7R 8R 9R]
  // Paire [3R 3R] · Tuile gagnante : 8R | attente milieu | écart
  // Référence : ventdestmahjong.fr main 246 → 9 pts
  // DC cross-famille (7C+7R) + PSP intra-C (4C+7C) + DCext intra-R (1R+7R) : pools indépendants → tous coexistent
  // Score → Double Chow +1 | Petite suite pure +1 | Deux Chows purs d'extrémité +1
  //          | Une famille absente +1 | Attente unique au milieu +1 | Tout caché donné +2 | Tout Chow +2 = 9 pts
  test('[9 pts] DC + PSP + DCext coexistent (pools indépendants), main 246 ventdestmahjong.fr', () => {
    const C = (v: number): Tile => makeTile('character', v);
    const R = (v: number): Tile => makeTile('circle', v);
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [C(4), C(5), C(6)], hidden: true  },
        { type: 'chow', tiles: [C(7), C(8), C(9)], hidden: true  },
        { type: 'chow', tiles: [R(1), R(2), R(3)], hidden: true  },
        { type: 'chow', tiles: [R(7), R(8), R(9)], hidden: true  },
      ],
      pair:    { tiles: [R(3), R(3)], hidden: false },
      winTile:  R(8),
      winBy:   'discard',
      waitType: 'closed',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(9);
    expectHas(items, 'Double Chow',                   1);
    expectHas(items, 'Petite suite pure',              1);
    expectHas(items, "Deux Chows purs d'extrémité",   1);
    expectHas(items, 'Une famille absente',             1);
    expectHas(items, 'Attente unique au milieu',        1);
    expectHas(items, 'Tout caché donné',               2);
    expectHas(items, 'Tout Chow',                      2);
  });

  // ── #25 ───────────────────────────────────────────────────────────────────
  // Chow caché [3R 4R 5R] · Pung caché [Vert×3] · Pung caché [Rouge×3] · Pung caché [9B×3] · Paire [4B×2]
  // Tuile gagnante : 9B | écart adverse
  // Référence : ventdestmahjong.fr → 11 pts (omet Pung d'extrémité — possible bug site)
  // PDF p.11 : 9B pung complété par l'écart gagnant → NON "caché". cachéPungs = [Vert, Rouge] = 2.
  //   → "Trois Pungs cachés" ne s'applique pas ; "Deux Pungs cachés" ✓
  // Score → Une famille absente +1 | Pung d'extrémité 9B +1 | Tout caché donné +2
  //          | Deux Dragons +6 | Deux Pungs cachés +2 = 12 pts
  test('[12 pts] Deux Pungs cachés (pas trois : pung 9B complété par écart)', () => {
    const hand = makeHand({
      groups: [
        { type: 'chow', tiles: [makeTile('circle',3),  makeTile('circle',4),  makeTile('circle',5) ], hidden: true },
        { type: 'pung', tiles: [makeTile('dragon','G'), makeTile('dragon','G'), makeTile('dragon','G')], hidden: true },
        { type: 'pung', tiles: [makeTile('dragon','R'), makeTile('dragon','R'), makeTile('dragon','R')], hidden: true },
        { type: 'pung', tiles: [makeTile('bamboo',9),  makeTile('bamboo',9),  makeTile('bamboo',9) ], hidden: true },
      ],
      pair:    { tiles: [makeTile('bamboo',4), makeTile('bamboo',4)], hidden: false },
      winTile:  makeTile('bamboo', 9),
      winBy:   'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(12);
    expectHas(items, 'Une famille absente',  1);
    expectHas(items, 'Tout caché donné',     2);
    expectHas(items, 'Deux Dragons',         6);
    expectHas(items, 'Deux Pungs cachés',    2);
    expectNotHas(items, 'Trois Pungs cachés');
  });

  // ── #26 ───────────────────────────────────────────────────────────────────
  // Pung [1B 1B 1B] · Pung [9R 9R 9R] · Pung caché [1R 1R 1R] · Pung caché [9B 9B 9B] · Paire [9C 9C]
  // Tuile gagnante : 9B | écart adverse
  // Référence : ventdestmahjong.fr main 124
  // PDF p.40 (remarque Tout honneur et extrémité) : « S'il n'y a que des extrémités → Tout extrémité »
  //   → Tout extrémité exclut Tout honneur et extrémité (sous-ensemble inclus par définition)
  // PDF p.11 : pung 9B complété par l'écart gagnant → NON "caché". cachéPungs = [1R] = 1 seul.
  // Score → Tout extrémité +64 | Double Pung +2 | Double Pung +2 = 68 pts
  test('[68 pts] Tout extrémité exclut Tout honneur et extrémité, main 124 ventdestmahjong.fr', () => {
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [makeTile('bamboo',1),    makeTile('bamboo',1),    makeTile('bamboo',1)   ], hidden: false },
        { type: 'pung', tiles: [makeTile('circle',9),    makeTile('circle',9),    makeTile('circle',9)   ], hidden: false },
        { type: 'pung', tiles: [makeTile('circle',1),    makeTile('circle',1),    makeTile('circle',1)   ], hidden: true  },
        { type: 'pung', tiles: [makeTile('bamboo',9),    makeTile('bamboo',9),    makeTile('bamboo',9)   ], hidden: true  },
      ],
      pair:    { tiles: [makeTile('character',9), makeTile('character',9)], hidden: false },
      winTile:  makeTile('bamboo', 9),
      winBy:   'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(68);
    expectHas(items, 'Tout extrémité',  64);
    expectHas(items, 'Double Pung',      4); // 2×2 pts
    expectNotHas(items, 'Tout honneur et extrémité');
    expectNotHas(items, 'Tout Pung');
  });

  // ── #27 ───────────────────────────────────────────────────────────────────
  // Pung [Vert×3] · Pung caché [Blanc×3] · Pung caché [9B×3] · Pung caché [Rouge×3] · Paire [3C×2]
  // Tuile gagnante : Rouge | écart adverse
  // Référence : ventdestmahjong.fr
  // PDF p.51 — Trois grands Dragons : « Pung de Dragon inclus par définition », exemple = 88+1 seult
  //   → Deux Dragons exclu. Site omet Pung d'extrémité(9B) — 1 pt d'écart, probablement bug site.
  // PDF p.11 : Rouge pung complété par écart → NON caché. cachéPungs = [Blanc, 9B] = 2.
  // Score → Pung d'extrémité (9B) +1 | Une famille absente +1 | Deux Pungs cachés +2
  //          | Tout Pung +6 | Trois grands Dragons +88 = 98 pts
  test('[98 pts] Trois grands Dragons exclut Deux Dragons, main ventdestmahjong.fr', () => {
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [makeTile('dragon','G'), makeTile('dragon','G'), makeTile('dragon','G')], hidden: false },
        { type: 'pung', tiles: [makeTile('dragon','W'), makeTile('dragon','W'), makeTile('dragon','W')], hidden: true  },
        { type: 'pung', tiles: [makeTile('bamboo',9),   makeTile('bamboo',9),   makeTile('bamboo',9)  ], hidden: true  },
        { type: 'pung', tiles: [makeTile('dragon','R'), makeTile('dragon','R'), makeTile('dragon','R')], hidden: true  },
      ],
      pair:    { tiles: [makeTile('character',3), makeTile('character',3)], hidden: false },
      winTile:  makeTile('dragon', 'R'),
      winBy:   'discard',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(98);
    expectHas(items, 'Trois grands Dragons',    88);
    expectHas(items, 'Tout Pung',                6);
    expectHas(items, 'Deux Pungs cachés',        2);
    expectHas(items, 'Une famille absente',       1);
    expectNotHas(items, 'Deux Dragons');
  });

  // ── #29 ───────────────────────────────────────────────────────────────────
  // Pung [9R×3] · Pung [8B×3] · Pung [5B×3] · Pung caché [2B×3] · Paire [2R×2]
  // Tuile gagnante : 2B | tiré soi-même
  // Référence : ventdestmahjong.fr — n'inclut pas "Une famille absente"
  // PDF p.21 — Symétrie : « le point pour famille absente (caractère) est inclus »
  //   Les tuiles symétriques n'existent qu'en bambou et cercle → caractère absent par définition.
  // Score → Sans honneurs +1 | Tirer soi-même +1 | Pung d'extrémité (9R) +1 | Tout Pung +6 | Symétrie +8 = 17 pts
  test('[17 pts] Symétrie exclut Une famille absente (PDF p.21)', () => {
    const hand = makeHand({
      groups: [
        { type: 'pung', tiles: [makeTile('circle',9),  makeTile('circle',9),  makeTile('circle',9) ], hidden: false },
        { type: 'pung', tiles: [makeTile('bamboo',8),  makeTile('bamboo',8),  makeTile('bamboo',8) ], hidden: false },
        { type: 'pung', tiles: [makeTile('bamboo',5),  makeTile('bamboo',5),  makeTile('bamboo',5) ], hidden: false },
        { type: 'pung', tiles: [makeTile('bamboo',2),  makeTile('bamboo',2),  makeTile('bamboo',2) ], hidden: true  },
      ],
      pair:    { tiles: [makeTile('circle',2), makeTile('circle',2)], hidden: false },
      winTile:  makeTile('bamboo', 2),
      winBy:   'self',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(17);
    expectHas(items, 'Symétrie',              8);
    expectHas(items, 'Tout Pung',             6);
    expectNotHas(items, 'Une famille absente');
  });

  // ── #28 ───────────────────────────────────────────────────────────────────
  // Sept paires [2R 3R 4R 5R 6R 7R 8R] — tuile gagnante 8R | écart adverse
  // Référence : ventdestmahjong.fr → Sept paires pures consécutives 88 + Tout ordinaire 2 = 90 pts
  // PDF p.48 — Sept paires pures consécutives : « Main pure, Sept paires, Tout caché donné inclus »
  // Score → Tout ordinaire +2 | Sept paires pures consécutives +88 = 90 pts
  test('[90 pts] Sept paires pures consécutives (2R→8R), main ventdestmahjong.fr', () => {
    const R = (v: number): Tile => makeTile('circle', v);
    const hand = makeHand({
      groups: [
        { type: 'pair7', tiles: [R(2), R(2)], hidden: true },
        { type: 'pair7', tiles: [R(3), R(3)], hidden: true },
        { type: 'pair7', tiles: [R(4), R(4)], hidden: true },
        { type: 'pair7', tiles: [R(5), R(5)], hidden: true },
        { type: 'pair7', tiles: [R(6), R(6)], hidden: true },
        { type: 'pair7', tiles: [R(7), R(7)], hidden: true },
      ],
      pair:     { tiles: [R(8), R(8)], hidden: true },
      winTile:   R(8),
      winBy:    'discard',
      specialType: '7pairs_consec',
    });
    const { items, total } = scoreHand(hand);
    expect(total).toBe(90);
    expectHas(items, 'Sept paires pures consécutives', 88);
    expectHas(items, 'Tout ordinaire',                  2);
    expectNotHas(items, 'Sept paires');
    expectNotHas(items, 'Main pure');
    expectNotHas(items, 'Tout caché donné');
  });
});
