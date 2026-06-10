import { useReducer, useState } from 'react';
import { makeTile, tileSymbol, tileLabel, tilesEqual } from '../lib/tiles';
import { scoreHand, getComboRef } from '../lib/combinations';
import { handToText } from '../lib/handText';
import type { Tile, Hand } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

type CalcMode = 'standard' | '7pairs';

interface SlotGroup { tiles: Tile[]; hidden: boolean; }

interface CalcState {
  mode: CalcMode;
  groups: SlotGroup[];   // 4 slots en standard, 7 en 7pairs
  pair: SlotGroup;       // utilisé seulement en standard
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
  if (slotId === 'flower') return false;
  if (slotId === 'pair') {
    if (state.mode === '7pairs') return false;
    return detectType(state.pair.tiles) === 'pair_ok';
  }
  const idx = +slotId[1]!;
  if (idx >= state.groups.length) return false;
  const t = detectType(state.groups[idx]!.tiles);
  return state.mode === '7pairs' ? t === 'pair_ok' : (t === 'chow' || t === 'pung' || t === 'kong');
}

function slotOrder(mode: CalcMode): string[] {
  return mode === '7pairs'
    ? ['g0','g1','g2','g3','g4','g5','g6']
    : ['g0','g1','g2','g3','pair','flower'];
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

function makeGroups(mode: CalcMode): SlotGroup[] {
  const n = mode === '7pairs' ? 7 : 4;
  return Array.from({ length: n }, () => ({ tiles: [], hidden: false }));
}

// ── Reducer ──────────────────────────────────────────────────────────────────

function initState(): CalcState {
  return {
    mode: 'standard',
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
      return { ...initState(), mode: action.mode, groups: makeGroups(action.mode) };
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

      const gi = +slot[1]!;
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
      const clearing = state.lastSlot === sid;
      const reset = clearing ? { lastTile: null, lastSlot: null, lastIdx: null } : {};
      if (sid === 'pair') {
        return { ...state, pair: { ...state.pair, tiles: state.pair.tiles.slice(0,-1) }, activeSlot: sid, ...reset };
      }
      if (sid === 'flower') {
        return { ...state, flowers: state.flowers.slice(0,-1), activeSlot: sid };
      }
      const gi = +sid[1]!;
      const groups = state.groups.map((g, i) => i === gi ? { ...g, tiles: g.tiles.slice(0,-1) } : g);
      return { ...state, groups, activeSlot: sid, ...reset };
    }

    case 'CLEAR_SLOT': {
      const sid = action.slotId;
      const clearing = state.lastSlot === sid;
      const reset = clearing ? { lastTile: null, lastSlot: null, lastIdx: null } : {};
      if (sid === 'pair') {
        return { ...state, pair: { tiles: [], hidden: false }, activeSlot: sid, ...reset };
      }
      if (sid === 'flower') {
        return { ...state, flowers: [], activeSlot: sid };
      }
      const gi = +sid[1]!;
      const groups = state.groups.map((g, i) => i === gi ? { tiles: [], hidden: false } : g);
      return { ...state, groups, activeSlot: sid, ...reset };
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
      return { ...initState(), mode: state.mode, groups: makeGroups(state.mode) };
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

  const is7pairs = state.mode === '7pairs';

  function usageCount(tile: Tile): number {
    let n = 0;
    state.groups.forEach(g => g.tiles.forEach(t => { if (tilesEqual(t, tile)) n++; }));
    state.pair.tiles.forEach(t => { if (tilesEqual(t, tile)) n++; });
    state.flowers.forEach(t => { if (tilesEqual(t, tile)) n++; });
    return n;
  }

  function detectWaitType(): string | null {
    if (is7pairs) return null;
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
    if (is7pairs) {
      const complete = state.groups.filter(g => detectType(g.tiles) === 'pair_ok');
      if (complete.length < 7) {
        setResult({ ok: false, error: `Il faut 7 paires — actuellement : ${complete.length}/7.` });
        return;
      }
      // La paire gagnante = dernier slot modifié
      const winIdx = (state.lastSlot?.startsWith('g') ? +state.lastSlot[1]! : 6);
      const winSlot = state.groups[winIdx] ?? state.groups[6]!;
      const pairGroups = state.groups
        .map((g, i) => i === winIdx ? null : { type: 'pair7' as const, tiles: g.tiles, hidden: true })
        .filter((g): g is NonNullable<typeof g> => g !== null);
      const hand: Hand = {
        groups: pairGroups,
        pair:    { tiles: winSlot.tiles, hidden: true },
        flowers: state.flowers,
        winTile: state.lastTile,
        winBy:   ctx.winBy,
        waitType: (ctx.waitType ?? null) as 'edge' | 'closed' | 'pair' | null,
        windRound: ctx.windRound, windPlayer: ctx.windPlayer,
        isLastTile: ctx.isLastTile, isLastDiscard: ctx.isLastDiscard,
        isStolenKong: ctx.isStolenKong, isAfterKong: ctx.isAfterKong, isLastExisting: ctx.isLastExisting,
        specialType: '7pairs',
      };
      const { items, total } = scoreHand(hand);
      setResult({ ok: true, hand, items, total });
      return;
    }

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

  function switchMode(mode: CalcMode) {
    dispatch({ type: 'SET_MODE', mode });
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
                  const maxTile = t.type === 'flower' ? MAX_FLOWER : (is7pairs ? 2 : MAX_PER_TILE);
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
          <button className={'mode-btn' + (!is7pairs ? ' active' : '')} onClick={() => switchMode('standard')}>Standard</button>
          <button className={'mode-btn' + ( is7pairs ? ' active' : '')} onClick={() => switchMode('7pairs')}>7 Paires</button>
        </div>

        <div id="hand-builder">
          {state.groups.map((g, i) => {
            const sid   = 'g' + i;
            const t     = detectType(g.tiles);
            const compl = is7pairs ? t === 'pair_ok' : (t === 'chow' || t === 'pung' || t === 'kong');
            const inv   = t === 'invalid';
            const act   = state.activeSlot === sid;
            const cls   = ['builder-slot', act?'slot-active':'', compl?'slot-complete':'', inv?'slot-invalid':''].filter(Boolean).join(' ');
            const label = is7pairs ? `Paire ${i+1}` : `Groupe ${i+1}`;
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

          {/* Paire — seulement en mode standard */}
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
