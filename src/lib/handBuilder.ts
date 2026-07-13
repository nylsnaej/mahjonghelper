import { tilesEqual } from './tiles';
import { scoreHand } from './combinations';
import type { Tile, Hand, WaitType, SuitType } from '../types';

// ── Types exportés ────────────────────────────────────────────────────────────

export type CalcMode = 'standard' | '7pairs' | 'snake';

export interface SlotGroup { tiles: Tile[]; hidden: boolean; }

export interface GameCtx {
  windRound: string;
  windPlayer: string;
  winBy: 'self' | 'discard';
  waitType: string | null;
  isLastTile: boolean;
  isLastDiscard: boolean;
  isStolenKong: boolean;
  isAfterKong: boolean;
  isLastExisting: boolean;
}

/** Sous-ensemble de CalcState utilisé par les fonctions pures de construction. */
export interface BuildState {
  mode: CalcMode;
  snakeSuits: [SuitType, SuitType, SuitType];
  groups: SlotGroup[];
  pair: SlotGroup;
  flowers: Tile[];
  lastTile: Tile | null;
  lastSlot: string | null;
  lastIdx: number | null;
}

export type BuildResult =
  | { ok: true;  hand: Hand; items: { name: string; pts: number }[]; total: number }
  | { ok: false; error: string };

// ── Fonctions pures ───────────────────────────────────────────────────────────

/** Reconnaît le type d'un groupe à partir de ses tuiles. */
export function detectType(tiles: Tile[]): string {
  if (tiles.length === 0) return 'empty';
  if (tiles.length === 1) return 'single';
  if (tiles.length === 2) return tilesEqual(tiles[0]!, tiles[1]!) ? 'pair_ok' : 'pair_bad';
  if (tiles.length === 3) {
    if (tiles.every(t => tilesEqual(t, tiles[0]!))) return 'pung';
    if (['bamboo','circle','character'].includes(tiles[0]!.type) && tiles.every(t => t.type === tiles[0]!.type)) {
      const v = tiles.map(t => t.value as number).sort((a, b) => a - b);
      if (v[1]! - v[0]! === 1 && v[2]! - v[1]! === 1) return 'chow';
    }
    return 'invalid';
  }
  if (tiles.length === 4) return tiles.every(t => tilesEqual(t, tiles[0]!)) ? 'kong' : 'invalid';
  return 'invalid';
}

/**
 * Déduit l'attente unique à partir de la dernière tuile posée.
 * Retourne null si aucune attente unique ne peut être inférée.
 */
export function detectWaitType(state: BuildState): WaitType | null {
  if (state.mode === '7pairs') return null;

  const { lastSlot, lastIdx } = state;
  if (!lastSlot || lastIdx === null) return null;
  if (lastSlot === 'pair') return 'pair';

  if (state.mode === 'snake') {
    // En serpentine, l'attente n'est valide que sur g3 (le 4e groupe régulier)
    if (lastSlot !== 'g3') return null;
    const g = state.groups[3];
    if (!g || detectType(g.tiles) !== 'chow') return null;
    const vals   = g.tiles.map(t => t.value as number).sort((a, b) => a - b);
    const winVal = g.tiles[lastIdx]!.value as number;
    if (winVal === vals[1])                  return 'closed';
    if (winVal === vals[2] && vals[0] === 1) return 'edge';
    if (winVal === vals[0] && vals[2] === 9) return 'edge';
    return null;
  }

  // Mode standard — slice(1) au lieu de [1] pour supporter g10, g11… le cas échéant
  const gi = +lastSlot.slice(1);
  const g = state.groups[gi];
  if (!g || detectType(g.tiles) !== 'chow') return null;
  const vals   = g.tiles.map(t => t.value as number).sort((a, b) => a - b);
  const winVal = g.tiles[lastIdx]!.value as number;
  if (winVal === vals[1])                  return 'closed';
  if (winVal === vals[2] && vals[0] === 1) return 'edge';
  if (winVal === vals[0] && vals[2] === 9) return 'edge';
  return null;
}

/**
 * Construit une Hand MCR à partir de l'état du calculateur et du contexte
 * de jeu, puis calcule son score. Retourne une erreur si la main est incomplète.
 */
export function buildHand(state: BuildState, ctx: GameCtx): BuildResult {
  const waitType = (ctx.waitType ?? detectWaitType(state)) as WaitType | null;

  const ctxFields = {
    winBy:          ctx.winBy,
    waitType,
    windRound:      ctx.windRound,
    windPlayer:     ctx.windPlayer,
    isLastTile:     ctx.isLastTile,
    isLastDiscard:  ctx.isLastDiscard,
    isStolenKong:   ctx.isStolenKong,
    isAfterKong:    ctx.isAfterKong,
    isLastExisting: ctx.isLastExisting,
  };

  // ── Mode 7 paires ───────────────────────────────────────────────────────────
  if (state.mode === '7pairs') {
    const complete = state.groups.filter(g => detectType(g.tiles) === 'pair_ok');
    if (complete.length < 7)
      return { ok: false, error: `Il faut 7 paires — actuellement : ${complete.length}/7.` };

    const winIdx  = state.lastSlot?.startsWith('g') ? +state.lastSlot.slice(1) : 6;
    const winSlot = state.groups[winIdx] ?? state.groups[6]!;
    const pairGroups = state.groups
      .map((g, i) => i === winIdx ? null : { type: 'pair7' as const, tiles: g.tiles, hidden: true })
      .filter((g): g is NonNullable<typeof g> => g !== null);
    const allPairTiles = [...pairGroups.flatMap(g => g.tiles), ...winSlot.tiles];
    const pairSuits = new Set(allPairTiles.map(t => t.type));
    const isSuited = pairSuits.size === 1 && ['bamboo','circle','character'].includes([...pairSuits][0]!);
    const isConsecPure = isSuited && (() => {
      const vals = [...new Set(allPairTiles.map(t => t.value as number))].sort((a, b) => a - b);
      return vals.length === 7 && vals[6]! - vals[0]! === 6;
    })();
    const hand: Hand = {
      groups:      pairGroups,
      pair:        { tiles: winSlot.tiles, hidden: true },
      flowers:     state.flowers,
      winTile:     state.lastTile,
      specialType: isConsecPure ? '7pairs_consec' : '7pairs',
      ...ctxFields,
    };
    const { items, total } = scoreHand(hand);
    return { ok: true, hand, items, total };
  }

  // ── Mode serpentine ─────────────────────────────────────────────────────────
  if (state.mode === 'snake') {
    if (new Set(state.snakeSuits).size !== 3)
      return { ok: false, error: 'Les 3 familles de la serpentine doivent être différentes.' };
    const g4     = state.groups[3]!;
    const g4type = detectType(g4.tiles);
    if (!(['chow','pung','kong'] as string[]).includes(g4type))
      return { ok: false, error: 'Le 4e groupe doit être un Chow, Pung ou Kong complet.' };
    if (detectType(state.pair.tiles) !== 'pair_ok')
      return { ok: false, error: 'La paire doit contenir 2 tuiles identiques.' };
    const snakeGroups: Hand['groups'] = state.groups.slice(0, 3).map(g => ({
      type: 'snake' as const, tiles: g.tiles, hidden: true,
    }));
    const hand: Hand = {
      groups:      [...snakeGroups, { type: g4type as 'chow'|'pung'|'kong', tiles: g4.tiles, hidden: g4.hidden }],
      pair:        state.pair,
      flowers:     state.flowers,
      winTile:     state.lastTile ?? state.pair.tiles[1] ?? null,
      specialType: 'snake',
      ...ctxFields,
    };
    const { items, total } = scoreHand(hand);
    return { ok: true, hand, items, total };
  }

  // ── Mode standard ───────────────────────────────────────────────────────────
  const validGroups = state.groups.filter(g => {
    const t = detectType(g.tiles);
    return t === 'chow' || t === 'pung' || t === 'kong';
  });
  if (validGroups.length < 4)
    return { ok: false, error: `Il faut 4 groupes complets — actuellement : ${validGroups.length}/4.` };
  if (detectType(state.pair.tiles) !== 'pair_ok')
    return { ok: false, error: 'La paire doit contenir 2 tuiles identiques.' };
  const hand: Hand = {
    groups:      validGroups.map(g => ({ type: detectType(g.tiles) as 'chow'|'pung'|'kong', tiles: g.tiles, hidden: g.hidden })),
    pair:        state.pair,
    flowers:     state.flowers,
    winTile:     state.lastTile ?? state.pair.tiles[1] ?? null,
    specialType: null,
    ...ctxFields,
  };
  const { items, total } = scoreHand(hand);
  return { ok: true, hand, items, total };
}
