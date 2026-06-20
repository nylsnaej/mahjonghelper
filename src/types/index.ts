export type TileType = 'bamboo' | 'circle' | 'character' | 'wind' | 'dragon' | 'flower';
export type SuitType = 'bamboo' | 'circle' | 'character';

export interface Tile {
  type: TileType;
  value: number | string;
}

export type GroupType = 'chow' | 'pung' | 'kong' | 'pair7' | 'snake';
export type SpecialType =
  | '13orphans' | '7pairs' | '7pairs_consec' | '9gates'
  | 'snake' | 'small_snake' | 'big_snake'
  | 'two_dragons_3f' | 'two_dragons_1f'
  | 'chicken';

export interface Group {
  type: GroupType;
  tiles: Tile[];
  hidden: boolean;
}

export interface Pair {
  tiles: Tile[];
  hidden: boolean;
}

export type WaitType = 'edge' | 'closed' | 'pair';
export type WinBy = 'self' | 'discard';

export interface Hand {
  groups: Group[];
  pair: Pair;
  flowers: Tile[];
  winTile: Tile | null;
  winBy: WinBy;
  waitType: WaitType | null;
  windRound: string;
  windPlayer: string;
  isLastTile: boolean;
  isLastDiscard: boolean;
  isStolenKong: boolean;
  isAfterKong: boolean;
  isLastExisting: boolean;
  specialType: SpecialType | null;
  orphanTiles?: Tile[];
  pairTile?: Tile;
}

export interface ScoreItem {
  name: string;
  pts: number;
}

export interface ScoreResult {
  items: ScoreItem[];
  total: number;
}
