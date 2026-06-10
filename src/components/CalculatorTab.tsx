import { useReducer, useState } from 'react';
import { makeTile, tileSymbol, tileLabel, tilesEqual } from '../lib/tiles';
import { scoreHand, getComboRef } from '../lib/combinations';
import { handToText } from '../lib/handText';
import type { Tile, Hand } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

interface SlotGroup { tiles: Tile[]; hidden: boolean; }

interface CalcState {
  groups: SlotGroup[];
  pair: SlotGroup;
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
  | { type: 'RESET' };

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectType(tiles: Tile[]): string {
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

function isGroupComplete(state: CalcState, slotId: string): boolean {
  if (slotId === 'pair')   return detectType(state.pair.tiles) === 'pair_ok';
  if (slotId === 'flower') return false;
  const t = detectType(state.groups[+slotId[1]!]!.tiles);
  return t === 'chow' || t === 'pung' || t === 'kong';
}

function nextSlot(state: CalcState, current: string): string {
  const order = ['g0','g1','g2','g3','pair','flower'];
  for (let i = order.indexOf(current) + 1; i < order.length; i++) {
    if (!isGroupComplete(state, order[i]!)) return order[i]!;
  }
  return 'flower';
}

function typeLabel(t: string): string {
  return ({ chow:'Chow', pung:'Pung', kong:'Kong', pair_ok:'Paire ✓', pair_bad:'Paire ✗', single:'+1', invalid:'⚠ Invalide' } as Record<string, string>)[t] ?? '';
}

const MAX_PER_TILE = 4;
const MAX_FLOWER   = 1;

// ── Reducer ──────────────────────────────────────────────────────────────────

function initState(): CalcState {
  return {
    groups: Array.from({ length: 4 }, () => ({ tiles: [], hidden: false })),
    pair:   { tiles: [], hidden: false },
    flowers: [],
    activeSlot: 'g0',
    lastTile: null, lastSlot: null, lastIdx: null,
  };
}

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case 'ADD_TILE': {
      const tile = makeTile(action.tileType as Tile['type'], isNaN(action.value as number) ? action.value : +action.value);
      const slot = state.activeSlot;

      if (slot === 'flower') {
        if (tile.type !== 'flower' || state.flowers.length >= 8) return state;
        return { ...state, flowers: [...state.flowers, tile] };
      }

      const newState = { ...state };

      if (slot === 'pair') {
        if (state.pair.tiles.length >= 2) return state;
        const tiles = [...state.pair.tiles, tile];
        const idx   = tiles.length - 1;
        newState.pair = { ...state.pair, tiles };
        newState.lastTile = tile; newState.lastSlot = 'pair'; newState.lastIdx = idx;
        const nextSt = { ...newState };
        if (detectType(tiles) === 'pair_ok') nextSt.activeSlot = nextSlot(newState, 'pair');
        return nextSt;
      }

      const gi = +slot[1]!;
      const g  = state.groups[gi]!;
      if (g.tiles.length >= 4) return state;
      const tiles = [...g.tiles, tile];
      const idx   = tiles.length - 1;
      const groups = state.groups.map((grp, i) => i === gi ? { ...grp, tiles } : grp);
      newState.groups  = groups;
      newState.lastTile = tile; newState.lastSlot = slot; newState.lastIdx = idx;
      const t = detectType(tiles);
      if (t === 'chow' || t === 'pung') newState.activeSlot = nextSlot({ ...newState }, slot);
      return newState;
    }

    case 'REMOVE_LAST': {
      const sid = action.slotId;
      const clearing = state.lastSlot === sid;
      if (sid === 'pair') {
        return { ...state, pair: { ...state.pair, tiles: state.pair.tiles.slice(0, -1) }, activeSlot: sid, ...(clearing ? { lastTile: null, lastSlot: null, lastIdx: null } : {}) };
      }
      if (sid === 'flower') {
        return { ...state, flowers: state.flowers.slice(0, -1), activeSlot: sid };
      }
      const gi = +sid[1]!;
      const groups = state.groups.map((g, i) => i === gi ? { ...g, tiles: g.tiles.slice(0, -1) } : g);
      return { ...state, groups, activeSlot: sid, ...(clearing ? { lastTile: null, lastSlot: null, lastIdx: null } : {}) };
    }

    case 'CLEAR_SLOT': {
      const sid = action.slotId;
      const clearing = state.lastSlot === sid;
      if (sid === 'pair') {
        return { ...state, pair: { tiles: [], hidden: false }, activeSlot: sid, ...(clearing ? { lastTile: null, lastSlot: null, lastIdx: null } : {}) };
      }
      if (sid === 'flower') {
        return { ...state, flowers: [], activeSlot: sid };
      }
      const gi = +sid[1]!;
      const groups = state.groups.map((g, i) => i === gi ? { tiles: [], hidden: false } : g);
      return { ...state, groups, activeSlot: sid, ...(clearing ? { lastTile: null, lastSlot: null, lastIdx: null } : {}) };
    }

    case 'TOGGLE_HIDDEN': {
      const sid = action.slotId;
      if (sid === 'pair') return { ...state, pair: { ...state.pair, hidden: action.hidden } };
      const gi = +sid[1]!;
      const groups = state.groups.map((g, i) => i === gi ? { ...g, hidden: action.hidden } : g);
      return { ...state, groups };
    }

    case 'SET_ACTIVE':
      return { ...state, activeSlot: action.slotId };

    case 'RESET':
      return initState();
  }
}

// ── Context state ─────────────────────────────────────────────────────────────

interface Ctx {
  windRound: string; windPlayer: string; winBy: 'self' | 'discard';
  waitType: string | null;
  isLastTile: boolean; isLastDiscard: boolean;
  isStolenKong: boolean; isAfterKong: boolean; isLastExisting: boolean;
}

function initCtx(): Ctx {
  return { windRound: 'E', windPlayer: 'E', winBy: 'discard', waitType: null, isLastTile: false, isLastDiscard: false, isStolenKong: false, isAfterKong: false, isLastExisting: false };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalculatorTab() {
  const [state, dispatch] = useReducer(calcReducer, undefined, initState);
  const [ctx, setCtx]     = useState<Ctx>(initCtx);
  const [result, setResult] = useState<{ ok: true; hand: Hand; items: { name: string; pts: number }[]; total: number } | { ok: false; error: string } | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copier');

  function usageCount(tile: Tile): number {
    let n = 0;
    state.groups.forEach(g => g.tiles.forEach(t => { if (tilesEqual(t, tile)) n++; }));
    state.pair.tiles.forEach(t => { if (tilesEqual(t, tile)) n++; });
    state.flowers.forEach(t => { if (tilesEqual(t, tile)) n++; });
    return n;
  }

  function detectWaitType(): string | null {
    const { lastSlot, lastIdx } = state;
    if (!lastSlot || lastIdx === null) return null;
    if (lastSlot === 'pair') return 'pair';
    const g = state.groups[+lastSlot[1]!];
    if (!g || detectType(g.tiles) !== 'chow') return null;
    const vals   = g.tiles.map(t => t.value as number).sort((a, b) => a - b);
    const winVal = g.tiles[lastIdx]!.value as number;
    if (winVal === vals[1])                  return 'closed';
    if (winVal === vals[2] && vals[0] === 1) return 'edge';
    if (winVal === vals[0] && vals[2] === 9) return 'edge';
    return null;
  }

  function calculateScore() {
    const validGroups = state.groups.filter(g => {
      const t = detectType(g.tiles);
      return t === 'chow' || t === 'pung' || t === 'kong';
    });
    if (validGroups.length < 4) {
      setResult({ ok: false, error: `Il faut 4 groupes complets — actuellement : ${validGroups.length}/4.` });
      return;
    }
    if (detectType(state.pair.tiles) !== 'pair_ok') {
      setResult({ ok: false, error: 'La paire doit contenir 2 tuiles identiques.' });
      return;
    }

    const hand: Hand = {
      groups: validGroups.map(g => ({ type: detectType(g.tiles) as 'chow' | 'pung' | 'kong', tiles: g.tiles, hidden: g.hidden })),
      pair:    state.pair,
      flowers: state.flowers,
      winTile: state.lastTile ?? state.pair.tiles[1] ?? null,
      winBy:   ctx.winBy,
      waitType: (ctx.waitType ?? detectWaitType()) as 'edge' | 'closed' | 'pair' | null,
      windRound: ctx.windRound, windPlayer: ctx.windPlayer,
      isLastTile: ctx.isLastTile, isLastDiscard: ctx.isLastDiscard,
      isStolenKong: ctx.isStolenKong, isAfterKong: ctx.isAfterKong, isLastExisting: ctx.isLastExisting,
      specialType: null,
    };

    const { items, total } = scoreHand(hand);
    setResult({ ok: true, hand, items, total });
  }

  function reset() {
    dispatch({ type: 'RESET' });
    setCtx(initCtx());
    setResult(null);
  }

  const optionKeys: Array<[string, keyof Ctx]> = [
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
          {/* Vent dominant */}
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
          {/* Vent du joueur */}
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
          {/* Gain */}
          <div className="ctx-row">
            <span className="ctx-lbl">Gain :</span>
            <button className={'win-btn' + (ctx.winBy === 'discard' ? ' active' : '')} onClick={() => setCtx(c => ({ ...c, winBy: 'discard' }))}>Écart adverse</button>
            <button className={'win-btn' + (ctx.winBy === 'self' ? ' active' : '')}    onClick={() => setCtx(c => ({ ...c, winBy: 'self' }))}>Tiré soi-même</button>
          </div>
          {/* Options */}
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
                  const max   = t.type === 'flower' ? MAX_FLOWER : MAX_PER_TILE;
                  const count = usageCount(t);
                  const dis   = count >= max ? 'palette-tile-disabled' : '';
                  return (
                    <div key={i}
                      className={`palette-tile ${t.type} ${dis}`}
                      title={tileLabel(t)}
                      onClick={() => { if (count < max) dispatch({ type: 'ADD_TILE', tileType: t.type, value: t.value }); }}
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
        <div id="hand-builder">
          {state.groups.map((g, i) => {
            const sid   = 'g' + i;
            const t     = detectType(g.tiles);
            const compl = t === 'chow' || t === 'pung' || t === 'kong';
            const inv   = t === 'invalid';
            const act   = state.activeSlot === sid;
            const cls   = ['builder-slot', act?'slot-active':'', compl?'slot-complete':'', inv?'slot-invalid':''].filter(Boolean).join(' ');
            return (
              <div key={sid} className={cls} onClick={() => dispatch({ type: 'SET_ACTIVE', slotId: sid })}>
                <div className="slot-label">
                  Groupe {i+1}
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
                    <button className="slot-btn" onClick={() => dispatch({ type: 'CLEAR_SLOT', slotId: sid })}>✕</button>
                  </>}
                  {compl && (
                    <label className="hidden-toggle">
                      <input type="checkbox" checked={g.hidden} onChange={e => dispatch({ type: 'TOGGLE_HIDDEN', slotId: sid, hidden: e.target.checked })} />
                      {' '}Caché
                    </label>
                  )}
                </div>
              </div>
            );
          })}

          {/* Paire */}
          {(() => {
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
                    <button className="slot-btn" onClick={() => dispatch({ type: 'CLEAR_SLOT', slotId: 'pair' })}>✕</button>
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
                    <button className="slot-btn" onClick={() => dispatch({ type: 'CLEAR_SLOT', slotId: 'flower' })}>✕</button>
                  </>}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Attente */}
        <div id="wait-row">
          <label htmlFor="wait-type">Attente unique :</label>
          <select id="wait-type" value={ctx.waitType ?? ''} onChange={e => setCtx(c => ({ ...c, waitType: e.target.value || null }))}>
            <option value="">Aucune</option>
            <option value="edge">Au bord (attente du 3 sur 1-2, ou du 7 sur 8-9)</option>
            <option value="closed">Au milieu (entre 2 tuiles, ex. 6-8 → 7)</option>
            <option value="pair">Sur la paire (honneur uniquement)</option>
          </select>
        </div>

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
                  const ta = document.querySelector<HTMLTextAreaElement>('#calc-result .hand-text-area');
                  if (ta) { ta.select(); document.execCommand('copy'); }
                  setCopyLabel('Copié ✓');
                  setTimeout(() => setCopyLabel('Copier'), 1500);
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
