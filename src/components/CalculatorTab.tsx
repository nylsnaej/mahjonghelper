import { useReducer, useState } from 'react';
import { makeTile, tileSymbol, tileLabel, tilesEqual } from '../lib/tiles';
import { getComboRef } from '../lib/combinations';
import { handToText } from '../lib/handText';
import { detectType, buildHand } from '../lib/handBuilder';
import type { CalcMode, SlotGroup, GameCtx, BuildResult } from '../lib/handBuilder';
import type { Tile, SuitType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

interface CalcState {
  mode: CalcMode;
  snakeSuits: [SuitType, SuitType, SuitType];
  groups: SlotGroup[];   // 4 slots en standard, 7 en 7pairs, 4 en snake (0-2 auto)
  pair: SlotGroup;       // utilisé seulement en standard/snake
  flowers: Tile[];
  activeSlot: string;
  lastTile: Tile | null;
  lastSlot: string | null;
  lastIdx: number | null;
}

type CalcAction =
  | { type: 'ADD_TILE'; tileType: string; value: string | number }
  | { type: 'REMOVE_LAST'; slotId: string }
  | { type: 'CLEAR_SLOT'; slotId: string }
  | { type: 'TOGGLE_HIDDEN'; slotId: string; hidden: boolean }
  | { type: 'SET_ACTIVE'; slotId: string }
  | { type: 'SET_MODE'; mode: CalcMode }
  | { type: 'SET_SNAKE_SUIT'; idx: 0 | 1 | 2; suit: SuitType }
  | { type: 'RESET' };

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSnakeGroups(suits: [SuitType, SuitType, SuitType]): SlotGroup[] {
  return [
    { tiles: [makeTile(suits[0], 1), makeTile(suits[0], 4), makeTile(suits[0], 7)], hidden: true },
    { tiles: [makeTile(suits[1], 2), makeTile(suits[1], 5), makeTile(suits[1], 8)], hidden: true },
    { tiles: [makeTile(suits[2], 3), makeTile(suits[2], 6), makeTile(suits[2], 9)], hidden: true },
  ];
}

function makeGroups(mode: CalcMode, snakeSuits?: [SuitType, SuitType, SuitType]): SlotGroup[] {
  if (mode === '7pairs') return Array.from({ length: 7 }, () => ({ tiles: [], hidden: false }));
  if (mode === 'snake') return [...makeSnakeGroups(snakeSuits!), { tiles: [], hidden: false }];
  return Array.from({ length: 4 }, () => ({ tiles: [], hidden: false }));
}

function isGroupComplete(state: CalcState, slotId: string): boolean {
  if (slotId === 'flower') return false;
  if (slotId === 'pair') {
    if (state.mode === '7pairs') return false;
    return detectType(state.pair.tiles) === 'pair_ok';
  }
  const idx = +slotId.slice(1);
  if (idx >= state.groups.length) return false;
  // En snake mode, slots 0-2 sont toujours complets (auto-générés)
  if (state.mode === 'snake' && idx < 3) return true;
  const t = detectType(state.groups[idx]!.tiles);
  return state.mode === '7pairs' ? t === 'pair_ok' : (t === 'chow' || t === 'pung' || t === 'kong');
}

function slotOrder(mode: CalcMode): string[] {
  if (mode === '7pairs') return ['g0','g1','g2','g3','g4','g5','g6'];
  if (mode === 'snake')  return ['g3','pair','flower'];
  return ['g0','g1','g2','g3','pair','flower'];
}

function nextSlot(state: CalcState, current: string): string {
  const order = slotOrder(state.mode);
  for (let i = order.indexOf(current) + 1; i < order.length; i++) {
    if (!isGroupComplete(state, order[i]!)) return order[i]!;
  }
  return order[order.length - 1]!;
}

function typeLabel(t: string): string {
  return ({ chow:'Chow', pung:'Pung', kong:'Kong', pair_ok:'Paire ✓', pair_bad:'Paire ✗', single:'+1', invalid:'⚠ Invalide' } as Record<string, string>)[t] ?? '';
}

const MAX_PER_TILE = 4;
const MAX_FLOWER   = 1;

// ── Reducer ──────────────────────────────────────────────────────────────────

function initState(): CalcState {
  const defaultSuits: [SuitType, SuitType, SuitType] = ['bamboo', 'circle', 'character'];
  return {
    mode: 'standard',
    snakeSuits: defaultSuits,
    groups: makeGroups('standard'),
    pair: { tiles: [], hidden: false },
    flowers: [],
    activeSlot: 'g0',
    lastTile: null, lastSlot: null, lastIdx: null,
  };
}

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {

    case 'SET_MODE': {
      if (action.mode === state.mode) return state;
      const ss = state.snakeSuits;
      const groups = action.mode === 'snake' ? makeGroups('snake', ss)
                   : action.mode === '7pairs' ? makeGroups('7pairs')
                   : makeGroups('standard');
      const activeSlot = action.mode === 'snake' ? 'g3' : 'g0';
      return { ...initState(), mode: action.mode, snakeSuits: ss, groups, activeSlot };
    }

    case 'SET_SNAKE_SUIT': {
      const suits = [...state.snakeSuits] as [SuitType, SuitType, SuitType];
      suits[action.idx] = action.suit;
      const snakeSlots = makeSnakeGroups(suits);
      const groups = state.groups.map((g, i) => i < 3 ? snakeSlots[i]! : g);
      return { ...state, snakeSuits: suits, groups };
    }

    case 'ADD_TILE': {
      const tile = makeTile(action.tileType as Tile['type'], isNaN(action.value as number) ? action.value : +action.value);
      const slot = state.activeSlot;

      if (slot === 'flower') {
        if (tile.type !== 'flower' || state.flowers.length >= 8) return state;
        return { ...state, flowers: [...state.flowers, tile] };
      }

      if (slot === 'pair') {
        if (state.mode === '7pairs' || state.pair.tiles.length >= 2) return state;
        const tiles = [...state.pair.tiles, tile];
        const idx   = tiles.length - 1;
        const newState = { ...state, pair: { ...state.pair, tiles }, lastTile: tile, lastSlot: 'pair', lastIdx: idx };
        if (detectType(tiles) === 'pair_ok') newState.activeSlot = nextSlot(newState, 'pair');
        return newState;
      }

      const gi = +slot.slice(1);
      // En snake mode, bloquer les slots serpentins 0-2
      if (state.mode === 'snake' && gi < 3) return state;
      if (gi >= state.groups.length) return state;
      const g = state.groups[gi]!;
      const maxTiles = state.mode === '7pairs' ? 2 : 4;
      if (g.tiles.length >= maxTiles) return state;
      const tiles = [...g.tiles, tile];
      const idx   = tiles.length - 1;
      const groups = state.groups.map((grp, i) => i === gi ? { ...grp, tiles } : grp);
      const newState = { ...state, groups, lastTile: tile, lastSlot: slot, lastIdx: idx };
      const t = detectType(tiles);
      const complete = state.mode === '7pairs' ? t === 'pair_ok' : (t === 'chow' || t === 'pung');
      if (complete) newState.activeSlot = nextSlot({ ...newState }, slot);
      return newState;
    }

    case 'REMOVE_LAST': {
      const sid = action.slotId;
      // En snake mode, bloquer les slots serpentins 0-2
      if (state.mode === 'snake' && sid.startsWith('g') && +sid.slice(1) < 3) return state;
      const clearing = state.lastSlot === sid;
      const reset = clearing ? { lastTile: null, lastSlot: null, lastIdx: null } : {};
      if (sid === 'pair') {
        return { ...state, pair: { ...state.pair, tiles: state.pair.tiles.slice(0,-1) }, activeSlot: sid, ...reset };
      }
      if (sid === 'flower') {
        return { ...state, flowers: state.flowers.slice(0,-1), activeSlot: sid };
      }
      const gi = +sid.slice(1);
      const groups = state.groups.map((g, i) => i === gi ? { ...g, tiles: g.tiles.slice(0,-1) } : g);
      return { ...state, groups, activeSlot: sid, ...reset };
    }

    case 'CLEAR_SLOT': {
      const sid = action.slotId;
      // En snake mode, bloquer les slots serpentins 0-2
      if (state.mode === 'snake' && sid.startsWith('g') && +sid.slice(1) < 3) return state;
      const clearing = state.lastSlot === sid;
      const reset = clearing ? { lastTile: null, lastSlot: null, lastIdx: null } : {};
      if (sid === 'pair') {
        return { ...state, pair: { tiles: [], hidden: false }, activeSlot: sid, ...reset };
      }
      if (sid === 'flower') {
        return { ...state, flowers: [], activeSlot: sid };
      }
      const gi = +sid.slice(1);
      const groups = state.groups.map((g, i) => i === gi ? { tiles: [], hidden: false } : g);
      return { ...state, groups, activeSlot: sid, ...reset };
    }

    case 'TOGGLE_HIDDEN': {
      const sid = action.slotId;
      // En snake mode, les slots serpentins 0-2 sont toujours cachés
      if (state.mode === 'snake' && sid.startsWith('g') && +sid.slice(1) < 3) return state;
      if (sid === 'pair') return { ...state, pair: { ...state.pair, hidden: action.hidden } };
      const gi = +sid.slice(1);
      const groups = state.groups.map((g, i) => i === gi ? { ...g, hidden: action.hidden } : g);
      return { ...state, groups };
    }

    case 'SET_ACTIVE':
      return { ...state, activeSlot: action.slotId };

    case 'RESET':
      if (state.mode === 'snake') {
        return { ...initState(), mode: 'snake', snakeSuits: state.snakeSuits, groups: makeGroups('snake', state.snakeSuits), activeSlot: 'g3' };
      }
      return { ...initState(), mode: state.mode, groups: makeGroups(state.mode) };
  }
}

// ── Context state ─────────────────────────────────────────────────────────────

function initCtx(): GameCtx {
  return { windRound: 'E', windPlayer: 'E', winBy: 'discard', waitType: null, isLastTile: false, isLastDiscard: false, isStolenKong: false, isAfterKong: false, isLastExisting: false };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalculatorTab() {
  const [state, dispatch] = useReducer(calcReducer, undefined, initState);
  const [ctx, setCtx]     = useState<GameCtx>(initCtx);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copier');

  const is7pairs = state.mode === '7pairs';
  const isSnake  = state.mode === 'snake';


  function usageCount(tile: Tile): number {
    let n = 0;
    state.groups.forEach(g => g.tiles.forEach(t => { if (tilesEqual(t, tile)) n++; }));
    state.pair.tiles.forEach(t => { if (tilesEqual(t, tile)) n++; });
    state.flowers.forEach(t => { if (tilesEqual(t, tile)) n++; });
    return n;
  }

  function calculateScore() {
    setResult(buildHand(state, ctx));
  }

  function reset() {
    dispatch({ type: 'RESET' });
    setCtx(initCtx());
    setResult(null);
  }

  function switchMode(mode: CalcMode) {
    dispatch({ type: 'SET_MODE', mode });
    setCtx(initCtx());
    setResult(null);
  }

  const optionKeys: Array<[string, keyof GameCtx]> = [
    ['Dernière tuile tirée', 'isLastTile'],
    ['Dernière tuile jetée', 'isLastDiscard'],
    ['Kong volé', 'isStolenKong'],
    ['Finir sur Kong', 'isAfterKong'],
    ['Dernière tuile existante', 'isLastExisting'],
  ];

  return (
    <div id="tab-calc" className="tab-content">
      {/* ── Contexte ── */}
      <section id="calc-context-section">
        <h2>Contexte</h2>
        <div className="ctx-grid">
          <div className="ctx-row">
            <span className="ctx-lbl">Vent dominant :</span>
            <div className="wind-sel">
              {['E','S','W','N'].map(w => (
                <button key={w} className={'wind-btn' + (ctx.windRound === w ? ' active' : '')}
                  onClick={() => setCtx(c => ({ ...c, windRound: w }))}>
                  {({ E:'Est', S:'Sud', W:'Ouest', N:'Nord' } as Record<string, string>)[w]}
                </button>
              ))}
            </div>
          </div>
          <div className="ctx-row">
            <span className="ctx-lbl">Vent du joueur :</span>
            <div className="wind-sel">
              {['E','S','W','N'].map(w => (
                <button key={w} className={'wind-btn' + (ctx.windPlayer === w ? ' active' : '')}
                  onClick={() => setCtx(c => ({ ...c, windPlayer: w }))}>
                  {({ E:'Est', S:'Sud', W:'Ouest', N:'Nord' } as Record<string, string>)[w]}
                </button>
              ))}
            </div>
          </div>
          <div className="ctx-row">
            <span className="ctx-lbl">Gain :</span>
            <button className={'win-btn' + (ctx.winBy === 'discard' ? ' active' : '')} onClick={() => setCtx(c => ({ ...c, winBy: 'discard' }))}>Écart adverse</button>
            <button className={'win-btn' + (ctx.winBy === 'self'    ? ' active' : '')} onClick={() => setCtx(c => ({ ...c, winBy: 'self' }))}>Tiré soi-même</button>
          </div>
          <div className="ctx-row ctx-checks">
            {optionKeys.map(([label, key]) => (
              <button key={key} className={'opt-btn' + (ctx[key] ? ' active' : '')}
                onClick={() => setCtx(c => ({ ...c, [key]: !c[key] }))}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Palette ── */}
      <section id="calc-palette-section">
        <h2>Palette <span id="palette-hint">(cliquer pour ajouter au groupe actif)</span></h2>
        <div id="tile-palette">
          {[
            { lbl: 'Bambous',  tiles: Array.from({length:9}, (_,i) => makeTile('bamboo', i+1)) },
            { lbl: 'Ronds',    tiles: Array.from({length:9}, (_,i) => makeTile('circle', i+1)) },
            { lbl: 'Caract.',  tiles: Array.from({length:9}, (_,i) => makeTile('character', i+1)) },
            { lbl: 'Honneurs', tiles: [...['E','S','W','N'].map(v => makeTile('wind', v)), ...['R','G','W'].map(v => makeTile('dragon', v))] },
            { lbl: 'Fleurs',   tiles: Array.from({length:8}, (_,i) => makeTile('flower', i+1)) },
          ].map(row => (
            <div key={row.lbl} className="palette-row">
              <span className="palette-label">{row.lbl}</span>
              <div className="palette-tiles">
                {row.tiles.map((t, i) => {
                  const maxTile = t.type === 'flower' ? MAX_FLOWER : MAX_PER_TILE;
                  const count   = usageCount(t);
                  const dis     = count >= maxTile ? 'palette-tile-disabled' : '';
                  return (
                    <div key={i}
                      className={`palette-tile ${t.type} ${dis}`}
                      title={tileLabel(t)}
                      onClick={() => { if (count < maxTile) dispatch({ type: 'ADD_TILE', tileType: t.type, value: t.value }); }}
                    >
                      <span className="tile-symbol">{tileSymbol(t)}</span>
                      <span className="pal-sub">{tileLabel(t)}</span>
                      {count > 0 && <span className="pal-count">{count}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Constructeur ── */}
      <section id="calc-hand-section">
        <h2>Main</h2>

        {/* Toggle mode */}
        <div id="calc-mode-row">
          <button className={'mode-btn' + (!is7pairs && !isSnake ? ' active' : '')} onClick={() => switchMode('standard')}>Standard</button>
          <button className={'mode-btn' + ( is7pairs ? ' active' : '')} onClick={() => switchMode('7pairs')}>7 Paires</button>
          <button className={'mode-btn' + ( isSnake  ? ' active' : '')} onClick={() => switchMode('snake')}>Serpentine</button>
        </div>

        <div id="hand-builder">
          {/* Section serpentine : sélection des familles */}
          {isSnake && (
            <div id="snake-suits-section">
              <div className="snake-suit-note">Groupes serpentins (cachés, auto-générés) :</div>
              {([0, 1, 2] as const).map(idx => {
                const values = [[1,4,7],[2,5,8],[3,6,9]][idx]!;
                return (
                  <div key={idx} className="snake-suit-row">
                    <span className="snake-suit-label">{values.join('-')} :</span>
                    <div className="snake-suit-btns">
                      {(['bamboo','circle','character'] as SuitType[]).map(s => {
                        const usedElsewhere = state.snakeSuits.some((ss, i) => i !== idx && ss === s);
                        const active = state.snakeSuits[idx] === s;
                        return (
                          <button key={s}
                            className={'suit-btn' + (active ? ' active' : '') + (usedElsewhere ? ' disabled' : '')}
                            disabled={usedElsewhere}
                            onClick={() => dispatch({ type: 'SET_SNAKE_SUIT', idx, suit: s })}>
                            {s === 'bamboo' ? 'Bambou' : s === 'circle' ? 'Rond' : 'Caract.'}
                          </button>
                        );
                      })}
                    </div>
                    <div className="snake-tiles-preview">
                      {state.groups[idx]!.tiles.map((t, i) => (
                        <SlotTile key={i} tile={t} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {state.groups.map((g, i) => {
            const sid   = 'g' + i;
            // En mode snake, sauter les slots 0-2 (auto-générés, affichés dans la section serpentine)
            if (isSnake && i < 3) return null;
            const t     = detectType(g.tiles);
            const compl = is7pairs ? t === 'pair_ok' : (t === 'chow' || t === 'pung' || t === 'kong');
            const inv   = t === 'invalid';
            const act   = state.activeSlot === sid;
            const cls   = ['builder-slot', act?'slot-active':'', compl?'slot-complete':'', inv?'slot-invalid':''].filter(Boolean).join(' ');
            const label = isSnake ? '4e groupe (régulier)' : is7pairs ? `Paire ${i+1}` : `Groupe ${i+1}`;
            return (
              <div key={sid} className={cls} onClick={() => dispatch({ type: 'SET_ACTIVE', slotId: sid })}>
                <div className="slot-label">
                  {label}
                  {g.tiles.length > 0 && <span className={'slot-type' + (inv?' type-invalid':'')}>{typeLabel(t)}</span>}
                </div>
                <div className="slot-tiles">
                  {g.tiles.map((tile, idx) => (
                    <SlotTile key={idx} tile={tile} winning={state.lastSlot === sid && state.lastIdx === idx} />
                  ))}
                  {g.tiles.length === 0 && <span className="slot-empty">vide</span>}
                </div>
                <div className="slot-controls" onClick={e => e.stopPropagation()}>
                  {g.tiles.length > 0 && <>
                    <button className="slot-btn" onClick={() => dispatch({ type: 'REMOVE_LAST', slotId: sid })}>⌫</button>
                    <button className="slot-btn" onClick={() => dispatch({ type: 'CLEAR_SLOT',   slotId: sid })}>✕</button>
                  </>}
                  {compl && !is7pairs && (
                    <label className="hidden-toggle">
                      <input type="checkbox" checked={g.hidden} onChange={e => dispatch({ type: 'TOGGLE_HIDDEN', slotId: sid, hidden: e.target.checked })} />
                      {' '}Caché
                    </label>
                  )}
                </div>
              </div>
            );
          })}

          {/* Paire — seulement en mode standard ou snake */}
          {!is7pairs && (() => {
            const pairT   = detectType(state.pair.tiles);
            const pairOk  = pairT === 'pair_ok';
            const pairAct = state.activeSlot === 'pair';
            const cls = ['builder-slot', pairAct?'slot-active':'', pairOk?'slot-complete':''].filter(Boolean).join(' ');
            return (
              <div className={cls} onClick={() => dispatch({ type: 'SET_ACTIVE', slotId: 'pair' })}>
                <div className="slot-label">
                  Paire
                  {state.pair.tiles.length > 0 && <span className="slot-type">{typeLabel(pairT)}</span>}
                </div>
                <div className="slot-tiles">
                  {state.pair.tiles.map((tile, idx) => (
                    <SlotTile key={idx} tile={tile} winning={state.lastSlot === 'pair' && state.lastIdx === idx} />
                  ))}
                  {state.pair.tiles.length === 0 && <span className="slot-empty">vide</span>}
                </div>
                <div className="slot-controls" onClick={e => e.stopPropagation()}>
                  {state.pair.tiles.length > 0 && <>
                    <button className="slot-btn" onClick={() => dispatch({ type: 'REMOVE_LAST', slotId: 'pair' })}>⌫</button>
                    <button className="slot-btn" onClick={() => dispatch({ type: 'CLEAR_SLOT',   slotId: 'pair' })}>✕</button>
                  </>}
                </div>
              </div>
            );
          })()}

          {/* Fleurs */}
          {(() => {
            const flAct = state.activeSlot === 'flower';
            return (
              <div className={['builder-slot flower-slot', flAct?'slot-active':''].filter(Boolean).join(' ')}
                   onClick={() => dispatch({ type: 'SET_ACTIVE', slotId: 'flower' })}>
                <div className="slot-label">Fleurs</div>
                <div className="slot-tiles">
                  {state.flowers.map((tile, idx) => <SlotTile key={idx} tile={tile} />)}
                  {state.flowers.length === 0 && <span className="slot-empty">aucune</span>}
                </div>
                <div className="slot-controls" onClick={e => e.stopPropagation()}>
                  {state.flowers.length > 0 && <>
                    <button className="slot-btn" onClick={() => dispatch({ type: 'REMOVE_LAST', slotId: 'flower' })}>⌫</button>
                    <button className="slot-btn" onClick={() => dispatch({ type: 'CLEAR_SLOT',   slotId: 'flower' })}>✕</button>
                  </>}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Attente — masquée en 7 paires (pas d'attente unique applicable) */}
        {!is7pairs && (
          <div id="wait-row">
            {isSnake && <p style={{ fontSize:'0.8rem', color:'#888', margin:'0 0 4px' }}>Attente sur le 4e groupe ou la paire uniquement</p>}
            <label htmlFor="wait-type">Attente unique :</label>
            <select id="wait-type" value={ctx.waitType ?? ''} onChange={e => setCtx(c => ({ ...c, waitType: e.target.value || null }))}>
              <option value="">Aucune</option>
              <option value="edge">Au bord (attente du 3 sur 1-2, ou du 7 sur 8-9)</option>
              <option value="closed">Au milieu (entre 2 tuiles, ex. 6-8 → 7)</option>
              <option value="pair">Sur la paire (honneur uniquement)</option>
            </select>
          </div>
        )}

        {is7pairs && (
          <p style={{ fontSize: '0.82rem', color: '#888', margin: '4px 0 8px' }}>
            La dernière paire saisie est considérée comme la tuile gagnante.
          </p>
        )}

        <div id="calc-buttons">
          <button id="calc-btn" onClick={calculateScore}>Calculer</button>
          <button id="reset-btn" onClick={reset}>Réinitialiser</button>
        </div>
      </section>

      {/* ── Résultat ── */}
      {result && (
        <section id="calc-result">
          <h2>Résultat</h2>
          {!result.ok ? (
            <p className="calc-error">⚠ {result.error}</p>
          ) : (
            <>

              {result.items.length === 0 ? (
                <p style={{ color: '#aaa', padding: 8 }}>Aucune combinaison détectée.</p>
              ) : (
                <table>
                  <thead><tr><th>Combinaison</th><th className="pts-cell">Points</th></tr></thead>
                  <tbody>
                    {result.items.map((it, i) => {
                      const page = getComboRef(it.name);
                      return (
                        <tr key={i}>
                          <td>{it.name}{page && <span className="combo-ref"> (Comb. p.{page})</span>}</td>
                          <td className="pts-cell">+{it.pts}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <div id="calc-total-box" className={result.total >= 8 ? 'score-valid' : 'score-invalid'}>
                Total : {result.total} points
                {result.total < 8 && ' — ⚠ moins de 8 pts : Mah-Jong non valide'}
              </div>
              <div className="hand-copy-box">
                <div className="hand-copy-label">Copier pour discussion :</div>
                <textarea className="hand-text-area" readOnly rows={4} spellCheck={false}
                  value={handToText(result.hand, { items: result.items, total: result.total }, 'Calculateur')}
                  onFocus={e => e.target.select()} />
                <button className="copy-action-btn" onClick={() => {
                  const text = handToText(result.hand, { items: result.items, total: result.total }, 'Calculateur');
                  navigator.clipboard.writeText(text)
                    .then(() => setCopyLabel('Copié ✓'))
                    .catch(() => setCopyLabel('Échec'))
                    .finally(() => setTimeout(() => setCopyLabel('Copier'), 1500));
                }}>{copyLabel}</button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

// ── SlotTile ─────────────────────────────────────────────────────────────────

function SlotTile({ tile, winning = false }: { tile: Tile; winning?: boolean }) {
  const sym = tileSymbol(tile);
  const lbl = tileLabel(tile);
  const cls = `tile ${tile.type}${winning ? ' winning' : ''}`;
  return (
    <div className={cls} title={lbl + (winning ? ' — tuile gagnante' : '')}>
      <span className="tile-symbol">{sym}</span>
      <span className="tile-label">{lbl}</span>
    </div>
  );
}
