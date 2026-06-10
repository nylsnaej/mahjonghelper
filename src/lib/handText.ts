import { tileLabel } from './tiles';
import type { Hand, ScoreResult } from '../types';

const WIND_NAME: Record<string, string> = { E: 'Est', S: 'Sud', W: 'Ouest', N: 'Nord' };

export function handToText(hand: Hand, score: ScoreResult, level: number | string): string {
  const lines: string[] = [];

  const ctx = [
    'Niveau ' + level,
    'Vent dominant : ' + WIND_NAME[hand.windRound],
    'Vent joueur : ' + WIND_NAME[hand.windPlayer],
    'Gain : ' + (hand.winBy === 'self' ? 'tiré soi-même' : 'écart adverse'),
  ];
  if (hand.isLastTile)     ctx.push('dernière tuile tirée');
  if (hand.isLastDiscard)  ctx.push('dernière tuile jetée');
  if (hand.isStolenKong)   ctx.push('kong volé');
  if (hand.isAfterKong)    ctx.push('finir sur kong');
  if (hand.isLastExisting) ctx.push('dernière tuile existante');
  lines.push(ctx.join(' | '));

  if (hand.specialType === '13orphans') {
    lines.push('Treize orphelins [' + (hand.orphanTiles ?? []).map(tileLabel).join(' ') + ']');
  } else if (hand.specialType === '7pairs') {
    const allPairs = [...hand.groups.map(g => g.tiles), hand.pair.tiles];
    lines.push('Sept paires [' + allPairs.map(p => p.map(tileLabel).join('')).join(' / ') + ']');
  } else {
    const typeName: Record<string, string> = { chow: 'Chow', pung: 'Pung', kong: 'Kong', pair7: 'Paire', snake: 'Serpentine' };
    const parts = hand.groups.map(g => {
      const t = typeName[g.type] ?? g.type;
      const hiddenSuffix = g.hidden && g.type !== 'snake' ? ' caché' : '';
      return t + hiddenSuffix + ' [' + g.tiles.map(tileLabel).join(' ') + ']';
    });
    parts.push('Paire [' + hand.pair.tiles.map(tileLabel).join(' ') + ']');
    if (hand.flowers.length) parts.push('Fleur ×' + hand.flowers.length);
    lines.push(parts.join(' · '));
  }

  let winLine = 'Tuile gagnante : ' + (hand.winTile ? tileLabel(hand.winTile) : '?');
  if (hand.waitType === 'pair')   winLine += ' (attente sur la paire)';
  if (hand.waitType === 'edge')   winLine += ' (attente au bord)';
  if (hand.waitType === 'closed') winLine += ' (attente au milieu)';
  lines.push(winLine);

  const scoreStr = score.items.map(it => it.name + ' +' + it.pts).join(' | ');
  lines.push('Score : ' + (scoreStr || 'aucune combinaison') + ' = ' + score.total + ' pts');

  return lines.join('\n');
}
