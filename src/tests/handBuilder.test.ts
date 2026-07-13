import { describe, test, expect } from 'vitest';
import { detectType, detectWaitType, buildHand } from '../lib/handBuilder';
import type { BuildState, GameCtx } from '../lib/handBuilder';
import { makeTile } from '../lib/tiles';
import type { Tile } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const B = (v: number): Tile => makeTile('bamboo', v);
const C = (v: number): Tile => makeTile('circle', v);
const R = (v: number): Tile => makeTile('character', v);
const W = (v: string): Tile => makeTile('wind', v);
const D = (v: string): Tile => makeTile('dragon', v);

function makeState(overrides: Partial<BuildState>): BuildState {
  return {
    mode: 'standard',
    snakeSuits: ['bamboo', 'circle', 'character'],
    groups: [
      { tiles: [], hidden: false },
      { tiles: [], hidden: false },
      { tiles: [], hidden: false },
      { tiles: [], hidden: false },
    ],
    pair: { tiles: [], hidden: false },
    flowers: [],
    lastTile: null,
    lastSlot: null,
    lastIdx: null,
    ...overrides,
  };
}

const defaultCtx: GameCtx = {
  windRound: 'E', windPlayer: 'E', winBy: 'discard', waitType: null,
  isLastTile: false, isLastDiscard: false,
  isStolenKong: false, isAfterKong: false, isLastExisting: false,
};

// ── detectType ────────────────────────────────────────────────────────────────

describe('detectType', () => {
  test('vide → empty', () => expect(detectType([])).toBe('empty'));
  test('1 tuile → single', () => expect(detectType([B(1)])).toBe('single'));
  test('2 identiques → pair_ok', () => expect(detectType([B(3), B(3)])).toBe('pair_ok'));
  test('2 différentes → pair_bad', () => expect(detectType([B(3), C(3)])).toBe('pair_bad'));
  test('3 identiques → pung', () => expect(detectType([C(7), C(7), C(7)])).toBe('pung'));
  test('chow consécutif', () => expect(detectType([B(1), B(2), B(3)])).toBe('chow'));
  test('chow dans le désordre', () => expect(detectType([B(3), B(1), B(2)])).toBe('chow'));
  test('3 tuiles mélangées familles → invalid', () => expect(detectType([B(1), C(2), B(3)])).toBe('invalid'));
  test('3 non-consécutives → invalid', () => expect(detectType([B(1), B(3), B(5)])).toBe('invalid'));
  test('4 identiques → kong', () => expect(detectType([R(9), R(9), R(9), R(9)])).toBe('kong'));
  test('4 différentes → invalid', () => expect(detectType([B(1), B(2), B(3), B(4)])).toBe('invalid'));
  test('honneurs non pairés → invalid', () => expect(detectType([W('E'), W('S'), D('R')])).toBe('invalid'));
});

// ── detectWaitType ───────────────────────────────────────────────────────────

describe('detectWaitType', () => {
  test('mode 7pairs → null (pas d\'attente unique)', () => {
    const state = makeState({ mode: '7pairs', lastSlot: 'g3', lastIdx: 1 });
    expect(detectWaitType(state)).toBeNull();
  });

  test('aucune tuile gagnante → null', () => {
    expect(detectWaitType(makeState({}))).toBeNull();
  });

  test('lastSlot=pair → attente sur la paire', () => {
    const state = makeState({ lastSlot: 'pair', lastIdx: 1, pair: { tiles: [W('E'), W('E')], hidden: false } });
    expect(detectWaitType(state)).toBe('pair');
  });

  test('attente fermée (milieu du chow)', () => {
    // Chow 3-4-5, tuile gagnante = 4 (milieu)
    const state = makeState({
      groups: [
        { tiles: [B(3), B(4), B(5)], hidden: false },
        { tiles: [], hidden: false },
        { tiles: [], hidden: false },
        { tiles: [], hidden: false },
      ],
      lastSlot: 'g0', lastIdx: 1,  // tuile gagnante = B(4)
    });
    expect(detectWaitType(state)).toBe('closed');
  });

  test('attente au bord basse (1-2, attend le 3)', () => {
    // Chow 1-2-3, tuile gagnante = 3 (bord haut, vals[0]=1)
    const state = makeState({
      groups: [
        { tiles: [B(1), B(2), B(3)], hidden: false },
        { tiles: [], hidden: false },
        { tiles: [], hidden: false },
        { tiles: [], hidden: false },
      ],
      lastSlot: 'g0', lastIdx: 2,  // tuile gagnante = B(3), vals[2]=3, vals[0]=1 → edge
    });
    expect(detectWaitType(state)).toBe('edge');
  });

  test('attente au bord haute (7-8-9, attend le 7)', () => {
    const state = makeState({
      groups: [
        { tiles: [C(7), C(8), C(9)], hidden: false },
        { tiles: [], hidden: false },
        { tiles: [], hidden: false },
        { tiles: [], hidden: false },
      ],
      lastSlot: 'g0', lastIdx: 0,  // tuile gagnante = C(7), vals[0]=7, vals[2]=9 → edge
    });
    expect(detectWaitType(state)).toBe('edge');
  });

  test('tuile dans un pung → null (pas de chow)', () => {
    const state = makeState({
      groups: [
        { tiles: [B(5), B(5), B(5)], hidden: false },
        { tiles: [], hidden: false },
        { tiles: [], hidden: false },
        { tiles: [], hidden: false },
      ],
      lastSlot: 'g0', lastIdx: 2,
    });
    expect(detectWaitType(state)).toBeNull();
  });

  test('slice(1) corrige le parsing multi-chiffres (g10 hypothétique)', () => {
    // Simule un lastSlot > g9 : slice(1) = '10' = 10, [1] = '0' = 0 (ancien bug)
    // En pratique il n'y a que g0-g3, mais on vérifie la robustesse
    const groups = Array.from({ length: 11 }, () => ({ tiles: [] as Tile[], hidden: false }));
    groups[10] = { tiles: [B(3), B(4), B(5)], hidden: false };
    const state = makeState({ groups, lastSlot: 'g10', lastIdx: 1 });
    expect(detectWaitType(state)).toBe('closed');
  });

  describe('mode snake', () => {
    test('attente sur g3 (chow) → closed', () => {
      const state = makeState({
        mode: 'snake',
        groups: [
          { tiles: [B(1), B(4), B(7)], hidden: true },
          { tiles: [C(2), C(5), C(8)], hidden: true },
          { tiles: [R(3), R(6), R(9)], hidden: true },
          { tiles: [B(3), B(4), B(5)], hidden: false },
        ],
        lastSlot: 'g3', lastIdx: 1,
      });
      expect(detectWaitType(state)).toBe('closed');
    });

    test('attente sur g0 en snake → null (serpentin)', () => {
      const state = makeState({
        mode: 'snake',
        groups: [
          { tiles: [B(1), B(4), B(7)], hidden: true },
          { tiles: [C(2), C(5), C(8)], hidden: true },
          { tiles: [R(3), R(6), R(9)], hidden: true },
          { tiles: [B(3), B(4), B(5)], hidden: false },
        ],
        lastSlot: 'g0', lastIdx: 1,
      });
      expect(detectWaitType(state)).toBeNull();
    });
  });
});

// ── buildHand ─────────────────────────────────────────────────────────────────

describe('buildHand — mode standard', () => {
  test('erreur si moins de 4 groupes valides', () => {
    const state = makeState({ groups: [
      { tiles: [B(1), B(2), B(3)], hidden: false },
      { tiles: [], hidden: false },
      { tiles: [], hidden: false },
      { tiles: [], hidden: false },
    ], pair: { tiles: [W('E'), W('E')], hidden: false } });
    const r = buildHand(state, defaultCtx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('4 groupes');
  });

  test('erreur si paire invalide', () => {
    const state = makeState({ groups: [
      { tiles: [B(1), B(2), B(3)], hidden: false },
      { tiles: [C(1), C(1), C(1)], hidden: false },
      { tiles: [R(7), R(8), R(9)], hidden: false },
      { tiles: [B(4), B(4), B(4)], hidden: false },
    ], pair: { tiles: [W('E')], hidden: false } });
    const r = buildHand(state, defaultCtx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('paire');
  });

  test('main valide — calcule le score via scoreHand', () => {
    // But du test : vérifier que buildHand appelle scoreHand et retourne items/total,
    // pas de tester les règles de score (couvert par combinations.test.ts).
    const state = makeState({ groups: [
      { tiles: [B(2), B(3), B(4)], hidden: false },
      { tiles: [C(6), C(7), C(8)], hidden: false },
      { tiles: [R(3), R(4), R(5)], hidden: false },
      { tiles: [B(6), B(7), B(8)], hidden: false },
    ], pair: { tiles: [C(5), C(5)], hidden: false } });
    const r = buildHand(state, defaultCtx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items.map(i => i.name)).toContain('Tout Chow');
      expect(r.total).toBeGreaterThanOrEqual(2);
      expect(r.hand.groups).toHaveLength(4);
    }
  });

  test('ctx.waitType prioritaire sur detectWaitType', () => {
    // La tuile gagnante pointerait vers 'closed', mais on force 'pair'
    const state = makeState({ groups: [
      { tiles: [B(3), B(4), B(5)], hidden: false },
      { tiles: [C(1), C(1), C(1)], hidden: false },
      { tiles: [R(1), R(2), R(3)], hidden: false },
      { tiles: [B(7), B(8), B(9)], hidden: false },
    ], pair: { tiles: [W('E'), W('E')], hidden: false },
    lastSlot: 'g0', lastIdx: 1 });
    const ctx = { ...defaultCtx, waitType: 'pair' };
    const r = buildHand(state, ctx);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.hand.waitType).toBe('pair');
  });
});

describe('buildHand — mode 7 paires', () => {
  test('erreur si moins de 7 paires', () => {
    const state = makeState({
      mode: '7pairs',
      groups: Array.from({ length: 7 }, (_, i) =>
        i < 4 ? { tiles: [B(i + 1), B(i + 1)], hidden: false }
               : { tiles: [], hidden: false }),
    });
    const r = buildHand(state, defaultCtx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('7 paires');
  });

  test('7 paires → Sept paires (24 pts)', () => {
    const state = makeState({
      mode: '7pairs',
      groups: [
        { tiles: [B(1), B(1)], hidden: false },
        { tiles: [B(2), B(2)], hidden: false },
        { tiles: [B(3), B(3)], hidden: false },
        { tiles: [C(5), C(5)], hidden: false },
        { tiles: [R(7), R(7)], hidden: false },
        { tiles: [W('E'), W('E')], hidden: false },
        { tiles: [D('R'), D('R')], hidden: false },
      ],
    });
    const r = buildHand(state, defaultCtx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items.map(i => i.name)).toContain('Sept paires');
      expect(r.hand.specialType).toBe('7pairs');
    }
  });

  test('7 paires consécutives pures → 7pairs_consec (88 pts)', () => {
    const state = makeState({
      mode: '7pairs',
      groups: [
        { tiles: [B(1), B(1)], hidden: false },
        { tiles: [B(2), B(2)], hidden: false },
        { tiles: [B(3), B(3)], hidden: false },
        { tiles: [B(4), B(4)], hidden: false },
        { tiles: [B(5), B(5)], hidden: false },
        { tiles: [B(6), B(6)], hidden: false },
        { tiles: [B(7), B(7)], hidden: false },
      ],
      lastSlot: 'g6', lastIdx: 1,
    });
    const r = buildHand(state, { ...defaultCtx, winBy: 'self' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.hand.specialType).toBe('7pairs_consec');
      expect(r.items.map(i => i.name)).toContain('Sept paires pures consécutives');
    }
  });
});

describe('buildHand — mode snake', () => {
  test('erreur si familles dupliquées dans la serpentine', () => {
    const state = makeState({
      mode: 'snake',
      snakeSuits: ['bamboo', 'bamboo', 'character'],
      groups: [
        { tiles: [B(1), B(4), B(7)], hidden: true },
        { tiles: [B(2), B(5), B(8)], hidden: true },
        { tiles: [R(3), R(6), R(9)], hidden: true },
        { tiles: [C(1), C(2), C(3)], hidden: false },
      ],
      pair: { tiles: [D('G'), D('G')], hidden: false },
    });
    const r = buildHand(state, defaultCtx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('familles');
  });

  test('erreur si 4e groupe incomplet', () => {
    const state = makeState({
      mode: 'snake',
      snakeSuits: ['bamboo', 'circle', 'character'],
      groups: [
        { tiles: [B(1), B(4), B(7)], hidden: true },
        { tiles: [C(2), C(5), C(8)], hidden: true },
        { tiles: [R(3), R(6), R(9)], hidden: true },
        { tiles: [B(1), B(2)], hidden: false },
      ],
      pair: { tiles: [D('G'), D('G')], hidden: false },
    });
    const r = buildHand(state, defaultCtx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('4e groupe');
  });

  test('main serpentine valide', () => {
    const state = makeState({
      mode: 'snake',
      snakeSuits: ['bamboo', 'circle', 'character'],
      groups: [
        { tiles: [B(1), B(4), B(7)], hidden: true },
        { tiles: [C(2), C(5), C(8)], hidden: true },
        { tiles: [R(3), R(6), R(9)], hidden: true },
        { tiles: [C(1), C(2), C(3)], hidden: false },
      ],
      pair: { tiles: [D('G'), D('G')], hidden: false },
      lastTile: D('G'),
    });
    const r = buildHand(state, defaultCtx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.hand.specialType).toBe('snake');
      const snakeCount = r.hand.groups.filter(g => g.type === 'snake').length;
      expect(snakeCount).toBe(3);
      expect(r.total).toBeGreaterThanOrEqual(8);
    }
  });
});
