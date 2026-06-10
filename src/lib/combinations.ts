import { tileLabel, tileKey } from './tiles';
import type { Tile, Hand, ScoreItem, ScoreResult } from '../types';

export const COMBO_REFS: Record<string, number> = {
  'Double Chow pur':                  5,
  'Double Chow':                      5,
  'Petite suite pure':                5,
  "Deux Chows purs d'extrémité":      5,
  'Une famille absente':              5,
  'Sans honneurs':                    5,
  'Tirer soi-même':                   6,
  "Pung d'extrémité":                 6,
  'Pung de Vent':                     6,
  'Kong exposé':                      7,
  'Fleur':                            7,
  'Attente unique au bord':           8,
  'Attente unique au milieu':         8,
  'Attente unique sur la paire':      8,
  'Pung de Dragon':                  10,
  'Vent du tour':                    10,
  'Vent du joueur':                  10,
  'Tout caché donné':                10,
  'Double Pung':                     10,
  'Tout Chow':                       11,
  'Deux Pungs cachés':               11,
  'Kong caché + Kong exposé':        17,
  'Kong caché':                      12,
  '4 identiques':                    12,
  'Tout ordinaire':                  12,
  'Extrémité ou honneur partout':    13,
  'Tout caché tiré':                 14,
  'Dernière tuile existante':        14,
  'Deux Kongs exposés':              14,
  'Tout Pung paire':                 35,
  'Tout Pung':                       15,
  'Semi pure':                       15,
  'Trois Chows purs superposés':     32,
  'Trois Chows superposés':          16,
  'Tout exposé':                     16,
  'Deux Dragons dans trois familles':32,
  'Deux Dragons dans une famille':   47,
  'Deux Dragons':                    16,
  '2 Kongs cachés':                  20,
  'Tout Type':                       18,
  'Grande suite pure':               29,
  'Grande suite':                    19,
  'Trois Pungs purs consécutifs':    35,
  'Trois Pungs consécutifs':         19,
  'Trois Pungs cachés':              30,
  'Triple Chow pur':                 35,
  'Triple Chows':                    19,
  'Triple Pung':                     29,
  'Dernière tuile tirée':            19,
  'Dernière tuile jetée':            19,
  'Kong volé':                       19,
  'Finir sur le Kong':               20,
  'Symétrie':                        21,
  'Main sans valeur':                22,
  'Suite serpentine':                25,
  'Petit serpentin':                 26,
  'Grand serpentin':                 34,
  'Les quatre premiers':             27,
  'Les quatre derniers':             27,
  'Trois grands Vents':              28,
  'Trois grands Dragons':            51,
  'Cinq partout':                    31,
  'Main pure':                       34,
  'Sept paires pures consécutives':  48,
  'Sept paires':                     36,
  'Les trois premiers':              37,
  'Les trois derniers':              38,
  'Les trois du milieu':             39,
  'Tout honneur et extrémité':       40,
  'Quatre Chows purs superposés':    40,
  'Trois Kongs':                     41,
  'Quadruple Chows purs':            42,
  'Quatre Pungs purs consécutifs':   43,
  'Quatre Pungs cachés':             44,
  'Trois petits Dragons':            45,
  'Quatre petits Vents':             45,
  'Quatre grands Vents':             51,
  'Quatre Kongs':                    52,
  'Tout honneur':                    46,
  'Tout extrémité':                  46,
  'Treize orphelins':                48,
  'Neuf portes':                     49,
  'Main verte':                      53,
};

export function getComboRef(name: string): number | null {
  for (const [key, page] of Object.entries(COMBO_REFS)) {
    if (name.startsWith(key)) return page;
  }
  return null;
}

export function scoreHand(hand: Hand): ScoreResult {
  const results: ScoreItem[] = [];

  function add(name: string, pts: number) {
    if (pts > 0) results.push({ name, pts });
  }

  if (hand.specialType === '13orphans') {
    add('Treize orphelins', 88);
    if (hand.winBy === 'self')          add('Tout caché tiré', 4);
    if (hand.waitType === 'pair')       add('Attente unique sur la paire', 1);
    if (hand.waitType === 'edge')       add('Attente unique au bord', 1);
    if (hand.waitType === 'closed')     add('Attente unique au milieu', 1);
    hand.flowers.forEach(() => add('Fleur', 1));
    return { items: results, total: results.reduce((s, r) => s + r.pts, 0) };
  }

  const groups   = hand.groups;
  const pair     = hand.pair;
  const allElems = [...groups, pair];
  const allTiles = allElems.flatMap(g => g.tiles).concat(hand.flowers);

  const isSuited      = (t: Tile) => ['bamboo','circle','character'].includes(t.type);
  const isHonor       = (t: Tile) => t.type === 'wind' || t.type === 'dragon';
  const isTerminal    = (t: Tile) => isSuited(t) && (t.value === 1 || t.value === 9);
  const isTermOrHonor = (t: Tile) => isTerminal(t) || isHonor(t);
  const isOrdinary    = (t: Tile) => isSuited(t) && (t.value as number) >= 2 && (t.value as number) <= 8;

  const chows = groups.filter(g => g.type === 'chow');
  const pungs = groups.filter(g => g.type === 'pung' || g.type === 'kong');
  const kongs = groups.filter(g => g.type === 'kong');

  const families  = new Set(allTiles.filter(isSuited).map(t => t.type));
  const hasHonors = allTiles.some(isHonor);

  // ─── 1 POINT ───

  // Pairages de chows — un même chow ne peut participer qu'à une seule combinaison de pairage
  {
    const used = new Set<number>();
    const pairings: Array<{ name: string; i: number; j: number }> = [];

    for (let i = 0; i < chows.length; i++) {
      for (let j = i + 1; j < chows.length; j++) {
        const a = chows[i].tiles[0], b = chows[j].tiles[0];
        if (!a || !b) continue;
        if (a.value === b.value && a.type === b.type) {
          pairings.push({ name: 'Double Chow pur', i, j });
        } else if (a.value === b.value && a.type !== b.type) {
          pairings.push({ name: 'Double Chow', i, j });
        } else if (a.type === b.type) {
          const lo = Math.min(a.value as number, b.value as number);
          const hi = Math.max(a.value as number, b.value as number);
          if (lo === 1 && hi === 7) {
            pairings.push({ name: "Deux Chows purs d'extrémité", i, j });
          } else if (hi - lo === 3) {
            pairings.push({ name: 'Petite suite pure', i, j });
          }
        }
      }
    }

    const priority: Record<string, number> = {
      'Double Chow pur': 1, 'Double Chow': 2,
      "Deux Chows purs d'extrémité": 3, 'Petite suite pure': 4,
    };
    pairings.sort((a, b) => priority[a.name]! - priority[b.name]!);

    for (const p of pairings) {
      if (used.has(p.i) || used.has(p.j)) continue;
      used.add(p.i); used.add(p.j);
      add(p.name, 1);
    }
  }

  if (families.size === 2) add('Une famille absente', 1);
  if (!hasHonors) add('Sans honneurs', 1);

  {
    const hasExposed = groups.some(g => !g.hidden);
    if (hand.winBy === 'self' && hasExposed) add('Tirer soi-même', 1);
  }

  pungs.forEach(g => {
    const t = g.tiles[0];
    if (t && isSuited(t) && (t.value === 1 || t.value === 9))
      add("Pung d'extrémité (" + tileLabel(t) + ')', 1);
  });

  pungs.forEach(g => {
    const t = g.tiles[0];
    if (t && t.type === 'wind' && t.value !== hand.windRound && t.value !== hand.windPlayer)
      add('Pung de Vent (' + tileLabel(t) + ')', 1);
  });

  kongs.filter(g => !g.hidden).forEach(g => {
    const t = g.tiles[0];
    if (t) add('Kong exposé (' + tileLabel(t) + ')', 1);
  });

  hand.flowers.forEach(() => add('Fleur', 1));

  if (hand.waitType === 'edge')   add('Attente unique au bord', 1);
  if (hand.waitType === 'closed') add('Attente unique au milieu', 1);
  if (hand.waitType === 'pair')   add('Attente unique sur la paire', 1);

  // ─── 2 POINTS ───

  {
    const dragonPungs = pungs.filter(g => g.tiles[0]?.type === 'dragon');
    if (dragonPungs.length < 2) {
      dragonPungs.forEach(g => {
        const t = g.tiles[0];
        if (t) add('Pung de Dragon (' + tileLabel(t) + ')', 2);
      });
    }
  }

  pungs.forEach(g => {
    const t = g.tiles[0];
    if (!t || t.type !== 'wind') return;
    if (t.value === hand.windRound)  add('Vent du tour (' + tileLabel(t) + ')', 2);
    if (t.value === hand.windPlayer) add('Vent du joueur (' + tileLabel(t) + ')', 2);
  });

  {
    const allHidden = groups.every(g => g.hidden) && pair.hidden;
    if (allHidden && hand.winBy === 'discard' && hand.specialType !== '7pairs')
      add('Tout caché donné', 2);
  }

  {
    let counted = 0;
    const used = new Set<number>();
    for (let i = 0; i < pungs.length; i++) {
      for (let j = i + 1; j < pungs.length; j++) {
        if (used.has(i) || used.has(j)) continue;
        const a = pungs[i].tiles[0], b = pungs[j].tiles[0];
        if (!a || !b) continue;
        if (isSuited(a) && isSuited(b) && a.value === b.value && a.type !== b.type) {
          counted++; used.add(i); used.add(j);
        }
      }
    }
    if (counted > 0) add('Double Pung', counted * 2);
  }

  if (chows.length === 4 && !hasHonors) add('Tout Chow', 2);

  {
    const hiddenPungs = pungs.filter(g => g.hidden).length;
    if (hiddenPungs >= 2) add('Deux Pungs cachés', 2);
  }

  kongs.filter(g => g.hidden).forEach(g => {
    const t = g.tiles[0];
    if (t) add('Kong caché (' + tileLabel(t) + ')', 2);
  });

  // 4 identiques : 4 tuiles identiques dans la main sans Kong déclaré
  {
    const count: Record<string, number> = {};
    const kongKeys = new Set(kongs.map(g => g.tiles[0] ? tileKey(g.tiles[0]) : ''));
    allElems.forEach(g => g.tiles.forEach(t => {
      const k = tileKey(t);
      count[k] = (count[k] ?? 0) + 1;
    }));
    Object.entries(count).forEach(([k, n]) => {
      if (n === 4 && !kongKeys.has(k)) {
        const tile = allElems.flatMap(g => g.tiles).find(t => tileKey(t) === k);
        if (tile) add('4 identiques (' + tileLabel(tile) + ')', 2);
      }
    });
  }

  const nonFlowerTiles = allTiles.filter(t => t.type !== 'flower');
  if (nonFlowerTiles.length > 0 && nonFlowerTiles.every(t => isOrdinary(t)))
    add('Tout ordinaire', 2);

  // ─── 4 POINTS ───

  {
    const ok = allElems.every(g => g.tiles.some(isTermOrHonor));
    if (ok) add('Extrémité ou honneur partout', 4);
  }

  {
    const allHidden = groups.every(g => g.hidden) && pair.hidden;
    if (allHidden && hand.winBy === 'self') add('Tout caché tiré', 4);
  }

  if (hand.isLastExisting) add('Dernière tuile existante', 4);

  {
    const expKongs = kongs.filter(g => !g.hidden).length;
    if (expKongs >= 2) add('Deux Kongs exposés', 4);
  }

  // ─── 6 POINTS ───

  if (pungs.length === 4) add('Tout Pung', 6);
  if (families.size === 1 && hasHonors) add('Semi pure', 6);

  {
    for (let i = 0; i < chows.length; i++) {
      for (let j = i + 1; j < chows.length; j++) {
        for (let k = j + 1; k < chows.length; k++) {
          const ca = chows[i].tiles[0], cb = chows[j].tiles[0], cc = chows[k].tiles[0];
          if (!ca || !cb || !cc) continue;
          const types = new Set([ca.type, cb.type, cc.type]);
          if (types.size === 3) {
            const vals = [ca.value as number, cb.value as number, cc.value as number].sort((a, b) => a - b);
            if (vals[1]! - vals[0]! === 1 && vals[2]! - vals[1]! === 1)
              add('Trois Chows superposés', 6);
          }
        }
      }
    }
  }

  {
    const allExposed = groups.every(g => !g.hidden) && !pair.hidden;
    if (allExposed && hand.winBy === 'discard') add('Tout exposé', 6);
  }

  {
    const dragonPungs = pungs.filter(g => g.tiles[0]?.type === 'dragon').length;
    if (dragonPungs >= 2) add('Deux Dragons', 6);
  }

  {
    const hiddenK  = kongs.filter(g => g.hidden).length;
    const exposedK = kongs.filter(g => !g.hidden).length;
    if (hiddenK >= 1 && exposedK >= 1) add('Kong caché + Kong exposé', 6);
  }

  {
    const types = new Set<string>(allTiles.map(t => t.type));
    const hasAllTypes = (['bamboo','circle','character','wind','dragon'] as const).every(t => types.has(t));
    if (hasAllTypes) add('Tout Type', 6);
  }

  // ─── 8 POINTS ───

  {
    const chows1 = chows.filter(g => g.tiles[0]?.value === 1);
    const chows4 = chows.filter(g => g.tiles[0]?.value === 4);
    const chows7 = chows.filter(g => g.tiles[0]?.value === 7);
    let found = false;
    for (const c1 of chows1) for (const c4 of chows4) for (const c7 of chows7) {
      if (!found && c1.tiles[0] && c4.tiles[0] && c7.tiles[0] &&
          new Set([c1.tiles[0].type, c4.tiles[0].type, c7.tiles[0].type]).size === 3) {
        found = true;
      }
    }
    if (found) add('Grande suite', 8);
  }

  {
    for (let i = 0; i < pungs.length; i++) {
      for (let j = i + 1; j < pungs.length; j++) {
        for (let k = j + 1; k < pungs.length; k++) {
          const pa = pungs[i].tiles[0], pb = pungs[j].tiles[0], pc = pungs[k].tiles[0];
          if (!pa || !pb || !pc) continue;
          if (!isSuited(pa) || !isSuited(pb) || !isSuited(pc)) continue;
          const types = new Set([pa.type, pb.type, pc.type]);
          if (types.size !== 3) continue;
          const vals = [pa.value as number, pb.value as number, pc.value as number].sort((a, b) => a - b);
          if (vals[1]! - vals[0]! === 1 && vals[2]! - vals[1]! === 1)
            add('Trois Pungs consécutifs', 8);
        }
      }
    }
  }

  {
    for (let i = 0; i < chows.length; i++) {
      for (let j = i + 1; j < chows.length; j++) {
        for (let k = j + 1; k < chows.length; k++) {
          const ca = chows[i].tiles[0], cb = chows[j].tiles[0], cc = chows[k].tiles[0];
          if (!ca || !cb || !cc) continue;
          const types = new Set([ca.type, cb.type, cc.type]);
          if (types.size === 3 && ca.value === cb.value && cb.value === cc.value)
            add('Triple Chows', 8);
        }
      }
    }
  }

  if (hand.isLastTile && hand.winBy === 'self')  add('Dernière tuile tirée', 8);
  if (hand.isLastDiscard)                         add('Dernière tuile jetée', 8);
  if (hand.isStolenKong)                          add('Kong volé', 8);
  if (hand.isAfterKong)                           add('Finir sur le Kong', 8);

  {
    const hiddenK = kongs.filter(g => g.hidden).length;
    if (hiddenK >= 2) add('2 Kongs cachés', 8);
  }

  {
    const symTiles = new Set([
      'bamboo_2','bamboo_4','bamboo_5','bamboo_6','bamboo_8','bamboo_9',
      'circle_1','circle_2','circle_3','circle_4','circle_5','circle_6','circle_9',
      'dragon_W',
    ]);
    const handT = groups.flatMap(g => g.tiles).concat(pair.tiles);
    if (handT.every(t => symTiles.has(tileKey(t)))) add('Symétrie', 8);
  }

  if (hand.specialType === 'chicken') add('Main sans valeur', 8);

  // ─── 12 POINTS ───

  if (hand.specialType === 'snake')       add('Suite serpentine', 12);
  if (hand.specialType === 'small_snake') add('Petit serpentin', 12);

  {
    const handT = groups.flatMap(g => g.tiles).concat(pair.tiles);
    if (handT.every(t => isSuited(t) && (t.value as number) <= 4)) add('Les quatre premiers', 12);
  }
  {
    const handT = groups.flatMap(g => g.tiles).concat(pair.tiles);
    if (handT.every(t => isSuited(t) && (t.value as number) >= 6)) add('Les quatre derniers', 12);
  }

  {
    const windPungs = pungs.filter(g => g.tiles[0]?.type === 'wind').length;
    if (windPungs >= 3) add('Trois grands Vents', 12);
  }

  // ─── 16 POINTS ───

  {
    for (const fam of ['bamboo','circle','character']) {
      const famChows = chows.filter(g => g.tiles[0]?.type === fam).map(g => g.tiles[0]?.value as number).sort((a, b) => a - b);
      if (famChows.includes(1) && famChows.includes(4) && famChows.includes(7)) {
        add('Grande suite pure', 16); break;
      }
    }
  }

  {
    for (let i = 0; i < pungs.length; i++) {
      for (let j = i + 1; j < pungs.length; j++) {
        for (let k = j + 1; k < pungs.length; k++) {
          const pa = pungs[i].tiles[0], pb = pungs[j].tiles[0], pc = pungs[k].tiles[0];
          if (!pa || !pb || !pc) continue;
          const types = new Set([pa.type, pb.type, pc.type]);
          if (isSuited(pa) && isSuited(pb) && isSuited(pc) && types.size === 3 &&
              pa.value === pb.value && pb.value === pc.value)
            add('Triple Pung', 16);
        }
      }
    }
  }

  {
    const hiddenPungs = pungs.filter(g => g.hidden).length;
    if (hiddenPungs >= 3) add('Trois Pungs cachés', 16);
  }

  {
    const ok = allElems.every(g => g.tiles.some(t => isSuited(t) && t.value === 5));
    if (ok) add('Cinq partout', 16);
  }

  if (hand.specialType === 'two_dragons_3f') add('Deux Dragons dans trois familles', 16);

  {
    for (const fam of ['bamboo','circle','character']) {
      const famChows = chows.filter(g => g.tiles[0]?.type === fam).map(g => g.tiles[0]?.value as number).sort((a, b) => a - b);
      for (let i = 0; i < famChows.length; i++) {
        for (let j = i + 1; j < famChows.length; j++) {
          for (let k = j + 1; k < famChows.length; k++) {
            const d1 = famChows[j]! - famChows[i]!, d2 = famChows[k]! - famChows[j]!;
            if ((d1 === 1 && d2 === 1) || (d1 === 2 && d2 === 2)) add('Trois Chows purs superposés', 16);
          }
        }
      }
    }
  }

  // ─── 24 POINTS ───

  if (hand.specialType === 'big_snake') add('Grand serpentin', 24);
  if (families.size === 1 && !hasHonors) add('Main pure', 24);

  {
    for (const fam of ['bamboo','circle','character']) {
      for (let v = 1; v <= 7; v++) {
        const count = chows.filter(g => g.tiles[0]?.type === fam && g.tiles[0]?.value === v).length;
        if (count >= 3) add('Triple Chow pur', 24);
      }
    }
  }

  {
    for (const fam of ['bamboo','circle','character']) {
      const famPungs = pungs.filter(g => g.tiles[0]?.type === fam).map(g => g.tiles[0]?.value as number).sort((a, b) => a - b);
      for (let i = 0; i < famPungs.length - 2; i++) {
        if (famPungs[i + 1]! - famPungs[i]! === 1 && famPungs[i + 2]! - famPungs[i + 1]! === 1)
          add('Trois Pungs purs consécutifs', 24);
      }
    }
  }

  {
    const handT = groups.flatMap(g => g.tiles).concat(pair.tiles);
    if (handT.every(t => isSuited(t) && [2,4,6,8].includes(t.value as number)))
      add('Tout Pung paire', 24);
  }

  if (hand.specialType === '7pairs') add('Sept paires', 24);

  {
    const handT = groups.flatMap(g => g.tiles).concat(pair.tiles);
    if (handT.every(t => isSuited(t) && (t.value as number) <= 3)) add('Les trois premiers', 24);
  }
  {
    const handT = groups.flatMap(g => g.tiles).concat(pair.tiles);
    if (handT.every(t => isSuited(t) && (t.value as number) >= 7)) add('Les trois derniers', 24);
  }
  {
    const handT = groups.flatMap(g => g.tiles).concat(pair.tiles);
    if (handT.every(t => isSuited(t) && [4,5,6].includes(t.value as number)))
      add('Les trois du milieu', 24);
  }

  // ─── 32 POINTS ───

  {
    const handT = groups.flatMap(g => g.tiles).concat(pair.tiles);
    if (handT.every(isTermOrHonor)) add('Tout honneur et extrémité', 32);
  }

  {
    for (const fam of ['bamboo','circle','character']) {
      const famChows = chows.filter(g => g.tiles[0]?.type === fam).map(g => g.tiles[0]?.value as number).sort((a, b) => a - b);
      if (famChows.length >= 4) {
        for (let i = 0; i <= famChows.length - 4; i++) {
          const d1 = famChows[i+1]! - famChows[i]!, d2 = famChows[i+2]! - famChows[i+1]!, d3 = famChows[i+3]! - famChows[i+2]!;
          if ((d1===1&&d2===1&&d3===1)||(d1===2&&d2===2&&d3===2)) add('Quatre Chows purs superposés', 32);
        }
      }
    }
  }

  if (kongs.length >= 3) add('Trois Kongs', 32);

  // ─── 48 POINTS ───

  {
    for (const fam of ['bamboo','circle','character']) {
      for (let v = 1; v <= 7; v++) {
        const count = chows.filter(g => g.tiles[0]?.type === fam && g.tiles[0]?.value === v).length;
        if (count >= 4) add('Quadruple Chows purs', 48);
      }
    }
  }

  {
    for (const fam of ['bamboo','circle','character']) {
      const famPungs = pungs.filter(g => g.tiles[0]?.type === fam).map(g => g.tiles[0]?.value as number).sort((a, b) => a - b);
      for (let i = 0; i <= famPungs.length - 4; i++) {
        if (famPungs[i+1]! - famPungs[i]! === 1 && famPungs[i+2]! - famPungs[i+1]! === 1 && famPungs[i+3]! - famPungs[i+2]! === 1)
          add('Quatre Pungs purs consécutifs', 48);
      }
    }
  }

  // ─── 64 POINTS ───

  {
    const hiddenPungs = pungs.filter(g => g.hidden).length;
    if (hiddenPungs >= 4) add('Quatre Pungs cachés', 64);
  }

  {
    const dragonPungs = pungs.filter(g => g.tiles[0]?.type === 'dragon').length;
    const pairIsDragon = pair.tiles[0]?.type === 'dragon';
    if (dragonPungs === 2 && pairIsDragon) add('Trois petits Dragons', 64);
  }

  {
    const windPungs = pungs.filter(g => g.tiles[0]?.type === 'wind').length;
    const pairIsWind = pair.tiles[0]?.type === 'wind';
    if (windPungs === 3 && pairIsWind) add('Quatre petits Vents', 64);
  }

  {
    const handT = groups.flatMap(g => g.tiles).concat(pair.tiles);
    if (handT.every(isHonor)) add('Tout honneur', 64);
  }

  {
    const handT = groups.flatMap(g => g.tiles).concat(pair.tiles);
    if (handT.every(t => isTerminal(t))) add('Tout extrémité', 64);
  }

  if (hand.specialType === 'two_dragons_1f') add('Deux Dragons dans une famille', 64);

  // ─── 88 POINTS ───

  if (hand.specialType === '7pairs_consec') add('Sept paires pures consécutives', 88);
  if (hand.specialType === '13orphans')     add('Treize orphelins', 88);
  if (hand.specialType === '9gates')        add('Neuf portes', 88);

  {
    const windPungs = pungs.filter(g => g.tiles[0]?.type === 'wind').length;
    if (windPungs === 4) add('Quatre grands Vents', 88);
  }

  {
    const dragonPungs = pungs.filter(g => g.tiles[0]?.type === 'dragon').length;
    if (dragonPungs === 3) add('Trois grands Dragons', 88);
  }

  if (kongs.length >= 4) add('Quatre Kongs', 88);

  {
    const greenTiles = new Set(['bamboo_2','bamboo_3','bamboo_4','bamboo_6','bamboo_8','dragon_G']);
    const handT = groups.flatMap(g => g.tiles).concat(pair.tiles);
    if (handT.every(t => greenTiles.has(tileKey(t)))) add('Main verte', 88);
  }

  const items = applyExclusions(results);
  const total = items.reduce((s, r) => s + r.pts, 0);
  return { items, total };
}

// ── Règles d'exclusion MCR (source : MCR_Combinaisons.pdf FFMJ) ─────────────
// Principe : « les définitions de chacune d'entre elles ne se contredisent pas »
// Chaque section ci-dessous cite la page/combinaison du PDF qui la justifie.

function applyExclusions(items: ScoreItem[]): ScoreItem[] {
  let r = [...items];

  const has    = (name: string)   => r.some(i => i.name === name);
  const rm     = (name: string)   => { r = r.filter(i => i.name !== name); };
  const rmPfx  = (pfx: string)    => { r = r.filter(i => !i.name.startsWith(pfx)); };

  // PDF p.27 — Les quatre premiers / Les quatre derniers
  // PDF p.37 — Les trois premiers / Les trois derniers
  // PDF p.38 — Les trois du milieu
  // PDF p.35 — Tout Pung paire
  // PDF p.46 — Tout extrémité
  // PDF p.40 — Tout honneur et extrémité
  // → « Le point pour « Sans Honneur » est inclus par définition. »
  const excludesSansHonneurs = [
    'Les quatre premiers', 'Les quatre derniers',
    'Les trois premiers',  'Les trois derniers', 'Les trois du milieu',
    'Tout Pung paire', 'Tout extrémité', 'Tout honneur et extrémité',
  ];
  if (excludesSansHonneurs.some(has)) rm('Sans honneurs');

  // PDF p.38 — Les trois du milieu
  // → « Les points pour « Sans honneur » et « Tout ordinaire » sont inclus »
  if (has('Les trois du milieu')) rm('Tout ordinaire');

  // PDF p.35 — Tout Pung paire
  // → « Les points pour « Tout Pung », « Tout ordinaire », « Sans honneur » sont inclus »
  if (has('Tout Pung paire')) { rm('Tout Pung'); rm('Tout ordinaire'); }

  // PDF p.46 — Tout extrémité
  // → « Les points pour « Tout Pung », « Pung d'extrémité », « Sans honneur » sont inclus »
  if (has('Tout extrémité')) { rm('Tout Pung'); rmPfx("Pung d'extrémité"); }

  // PDF p.40 — Tout honneur et extrémité
  // → inclut Tout Pung, Extrémité ou honneur partout, et tous les points à 1pt
  //   (Pung de Vent, Pung d'extrémité). Les 2pts (Pung de Dragon, Vent du tour/joueur,
  //   Double Pung) restent cumulables.
  if (has('Tout honneur et extrémité')) {
    rm('Tout Pung'); rm('Extrémité ou honneur partout');
    rmPfx('Pung de Vent'); rmPfx("Pung d'extrémité");
  }

  // PDF p.45 — Tout honneur
  // → « Les points pour « Tout Pung » sont inclus. Les combinaisons à 1 point
  //   (« Pung de Vent ») sont incluses. Seules les combinaisons à 2 points sont comptées. »
  if (has('Tout honneur')) { rm('Tout Pung'); rmPfx('Pung de Vent'); }

  // PDF p.45 — Quatre petits Vents
  // → « Les autres points [Pung de Vent 1pt] sont inclus par définition. »
  //   Vent du tour / Vent du joueur (2 pts) restent comptables.
  if (has('Quatre petits Vents')) rmPfx('Pung de Vent');

  // PDF p.42 — Quadruple Chows purs
  // → « Les points pour « 4 identiques » ou « Double Chows purs » ou
  //   « Triple Chows purs » sont inclus. »
  if (has('Quadruple Chows purs')) {
    rm('Triple Chow pur'); rm('Double Chow pur'); rmPfx('4 identiques');
  }

  // PDF p.19 + exemples pp.37-38 — Triple Chows exclut Double Chow (familles diff.)
  // Tous les exemples PDF avec Triple Chows montrent uniquement Double Chow PUR
  // en complément, jamais Double Chow (familles différentes).
  // → Triple Chows capture déjà la notion « même valeur dans familles différentes ».
  if (has('Triple Chows')) rm('Double Chow');

  // PDF p.19 — Dernière tuile tirée
  // → « Le point pour « Tirer soi-même » est inclus. »
  if (has('Dernière tuile tirée')) rm('Tirer soi-même');

  // PDF p.20 — Finir sur le Kong
  // → « Le point pour « Tirer soi-même » est inclus. »
  if (has('Finir sur le Kong')) rm('Tirer soi-même');

  // PDF p.19 — Kong volé
  // → « Le point pour « Dernière tuile existante » est inclus. »
  if (has('Kong volé')) rm('Dernière tuile existante');

  return r;
}
