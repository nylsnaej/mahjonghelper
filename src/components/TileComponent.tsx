import { tileSymbol, tileLabel } from '../lib/tiles';
import type { Tile } from '../types';

interface Props {
  tile: Tile;
  winning?: boolean;
  hidden?: boolean;
  extraClass?: string;
}

export function TileComponent({ tile, winning = false, hidden = false, extraClass = '' }: Props) {
  const sym = tileSymbol(tile);
  const lbl = tileLabel(tile);
  const cls = ['tile', tile.type, winning ? 'winning' : '', hidden ? 'hidden' : '', extraClass]
    .filter(Boolean).join(' ');

  return (
    <div className={cls} title={lbl + (winning ? ' — tuile gagnante' : '')}>
      <span className="tile-symbol">{sym}</span>
      <span className="tile-label">{lbl}</span>
    </div>
  );
}
