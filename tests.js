#!/usr/bin/env node
// Regression tests — run with: node tests.js
// Chaque test représente une main validée par un expert MCR.

const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Charge les sources (style navigateur) dans le contexte global Node
['tiles.js', 'combinations.js'].forEach(f =>
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), { filename: f })
);

// ── Mini framework ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected)
    throw new Error(`${label} : attendu ${expected}, obtenu ${actual}`);
}

function assertHas(items, name, pts) {
  const found = items.find(i => i.name === name);
  if (!found)
    throw new Error(`combinaison manquante : "${name}"\n     Main : ${items.map(i => i.name + ' +' + i.pts).join(' | ')}`);
  if (pts !== undefined && found.pts !== pts)
    throw new Error(`"${name}" : attendu ${pts} pts, obtenu ${found.pts} pts`);
}

function assertNotHas(items, name) {
  const found = items.find(i => i.name === name);
  if (found)
    throw new Error(`"${name}" ne devrait pas apparaître (règle d'exclusion)`);
}

function makeHand(overrides) {
  return Object.assign({
    groups: [], pair: { tiles: [], hidden: false }, flowers: [],
    winTile: null, winBy: 'discard', waitType: null,
    windRound: 'E', windPlayer: 'E',
    isLastTile: false, isLastDiscard: false,
    isStolenKong: false, isAfterKong: false, isLastExisting: false,
    specialType: null,
  }, overrides);
}

// ── Mains validées ──────────────────────────────────────────────────────────────

console.log('\nMains validées par expert :\n');

// ── #1 ──────────────────────────────────────────────────────────────────────────
// [1C 2C 3C] · [4R 5R 6R] · [4C 5C 6C] · Caché[7B 8B 9B] · Paire [2B 2B] · ×2 fleurs
// Tuile gagnante : 3C (bord) | écart | Est/Est
// [7B8B9B] caché : Tout exposé ne s'applique pas → 15 pts
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
  assertEqual(total, 15, 'total');
  assertHas(items, 'Grande suite',           8);
  assertHas(items, 'Tout Chow',              2);
  assertHas(items, 'Double Chow',            1);
  assertHas(items, 'Attente unique au bord', 1);
  assertHas(items, 'Sans honneurs',          1);
  assertNotHas(items, 'Petite suite pure');
});

// ── #2 ──────────────────────────────────────────────────────────────────────────
// [3R 4R 5R] · Caché[6R 7R 8R] · Pung[6R 6R 6R] · CachéPung[Sud×3] · Paire[Blanc×2] · ×2 fleurs
// Tuile gagnante : Sud | écart | Est/Est
// Expert → Petite suite pure +1 | Pung de Vent (Sud) +1 | 4 identiques (6R) +2 | Semi pure +6 | ×2 Fleurs = 12 pts
test('[Expert 12 pts] 4 identiques (6R) + Semi pure', () => {
  const R = v => makeTile('circle', v);
  const hand = makeHand({
    groups: [
      { type: 'chow', tiles: [R(3), R(4), R(5)],                                                           hidden: false },
      { type: 'chow', tiles: [R(6), R(7), R(8)],                                                           hidden: true  },
      { type: 'pung', tiles: [R(6), R(6), R(6)],                                                           hidden: false },
      { type: 'pung', tiles: [makeTile('wind','S'), makeTile('wind','S'), makeTile('wind','S')],            hidden: true  },
    ],
    pair:    { tiles: [makeTile('dragon','W'), makeTile('dragon','W')], hidden: false },
    flowers: [makeTile('flower',1), makeTile('flower',2)],
    winTile:  makeTile('wind', 'S'),
  });
  const { items, total } = scoreHand(hand);
  assertEqual(total, 12, 'total');
  assertHas(items, 'Petite suite pure',  1);
  assertHas(items, 'Pung de Vent (Sud)', 1);
  assertHas(items, '4 identiques (6R)', 2);
  assertHas(items, 'Semi pure',          6);
});

// ── Résumé ──────────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} réussi${passed > 1 ? 's' : ''}, ${failed} échoué${failed > 1 ? 's' : ''}\n`);
if (failed > 0) process.exit(1);
