import { TileComponent } from './TileComponent';
import type { Tile } from '../types';

interface Props {
  tiles: Tile[];
  isHiddenKong?: boolean;
  concealed?: boolean;
  winningIndex?: number;
}

export function TileGroup({ tiles, isHiddenKong = false, concealed = false, winningIndex }: Props) {
  const groupCls = 'tile-group' + (isHiddenKong ? ' kong-hidden' : '');

  const inner = (
    <div className={groupCls}>
      {tiles.map((t, i) => {
        const hidden = isHiddenKong ? (i === 0 || i === 3) : false;
        const winning = winningIndex !== undefined && winningIndex === i;
        return <TileComponent key={i} tile={t} winning={winning} hidden={hidden} />;
      })}
    </div>
  );

  if (concealed) {
    return (
      <div className="group-concealed-wrap">
        {inner}
        <span className="group-concealed-lbl">caché</span>
      </div>
    );
  }

  return inner;
}
