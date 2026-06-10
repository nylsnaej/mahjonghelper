import type { Tile, TileType } from '../types';

const BAMBOO_SYMBOLS  = ['🀐','🀑','🀒','🀓','🀔','🀕','🀖','🀗','🀘'];
const CIRCLE_SYMBOLS  = ['🀙','🀚','🀛','🀜','🀝','🀞','🀟','🀠','🀡'];
const CHAR_SYMBOLS    = ['一','二','三','四','五','六','七','八','九'];
const WIND_SYMBOLS:   Record<string, string> = { E:'東', S:'南', W:'西', N:'北' };
const DRAGON_SYMBOLS: Record<string, string> = { R:'中', G:'發', W:'白' };
const FLOWER_SYMBOLS  = ['🌸','🌺','🌻','🌼','🍀','🍁','🌿','🎋'];

export function makeTile(type: TileType, value: number | string): Tile {
  return { type, value };
}

export function tileSymbol(tile: Tile): string {
  const v = tile.value;
  switch (tile.type) {
    case 'bamboo':    return BAMBOO_SYMBOLS[(v as number) - 1] ?? '';
    case 'circle':    return CIRCLE_SYMBOLS[(v as number) - 1] ?? '';
    case 'character': return CHAR_SYMBOLS[(v as number) - 1] ?? '';
    case 'wind':      return WIND_SYMBOLS[v as string] ?? '';
    case 'dragon':    return DRAGON_SYMBOLS[v as string] ?? '';
    case 'flower':    return FLOWER_SYMBOLS[(v as number) - 1] ?? '';
  }
}

export function tileLabel(tile: Tile): string {
  const v = tile.value;
  switch (tile.type) {
    case 'bamboo':    return v + 'B';
    case 'circle':    return v + 'R';
    case 'character': return v + 'C';
    case 'wind':      return ({E:'Est',S:'Sud',W:'Ouest',N:'Nord'} as Record<string, string>)[v as string] ?? String(v);
    case 'dragon':    return ({R:'Rouge',G:'Vert',W:'Blanc'} as Record<string, string>)[v as string] ?? String(v);
    case 'flower':    return 'Fleur';
  }
}

export function tileKey(tile: Tile): string {
  return tile.type + '_' + tile.value;
}

export function tilesEqual(a: Tile, b: Tile): boolean {
  return a.type === b.type && a.value === b.value;
}
