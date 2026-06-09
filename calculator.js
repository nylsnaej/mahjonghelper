// === CALCULATEUR DE MAIN MCR ===

let calcState = {
  groups: makeEmptyGroups(),
  pair:    { tiles: [], hidden: true },
  flowers: [],
  activeSlot: 'g0',   // 'g0'..'g3' | 'pair' | 'flower'
  lastTile: null,     // dernière tuile ajoutée = tuile gagnante
  lastSlot: null,     // slot contenant la tuile gagnante
  lastIdx:  null,     // index dans le slot
  ctx: {
    windRound: 'E', windPlayer: 'E', winBy: 'discard', waitType: null,
    isLastTile: false, isLastDiscard: false,
    isStolenKong: false, isAfterKong: false, isLastExisting: false,
  },
};

function makeEmptyGroups() {
  return Array.from({length:4}, () => ({ tiles:[], hidden:false }));
}

// ── Détection du type d'un groupe ──────────────────────────────

function detectType(tiles) {
  if (tiles.length === 0) return null;
  if (tiles.length === 1) return 'single';
  if (tiles.length === 2) return tilesEqual(tiles[0], tiles[1]) ? 'pair_ok' : 'pair_bad';
  if (tiles.length === 3) {
    if (tiles.every(t => tilesEqual(t, tiles[0]))) return 'pung';
    const suits = ['bamboo','circle','character'];
    if (suits.includes(tiles[0].type) && tiles.every(t => t.type === tiles[0].type)) {
      const v = tiles.map(t => t.value).sort((a,b)=>a-b);
      if (v[1]-v[0]===1 && v[2]-v[1]===1) return 'chow';
    }
    return 'invalid';
  }
  if (tiles.length === 4) return tiles.every(t => tilesEqual(t, tiles[0])) ? 'kong' : 'invalid';
  return 'invalid';
}

function isGroupComplete(slotId) {
  if (slotId === 'pair')   return detectType(calcState.pair.tiles) === 'pair_ok';
  if (slotId === 'flower') return false;
  const t = detectType(calcState.groups[+slotId[1]].tiles);
  return t === 'chow' || t === 'pung' || t === 'kong';
}

function slotLabel(slotId) {
  if (slotId === 'pair')   return 'Paire';
  if (slotId === 'flower') return 'Fleurs';
  return 'Groupe ' + (+slotId[1]+1);
}

function typeLabel(t) {
  return { chow:'Chow', pung:'Pung', kong:'Kong', pair_ok:'Paire ✓',
           pair_bad:'Paire ✗', single:'+1', invalid:'⚠ Invalide' }[t] || '';
}

// ── Gestion du slot actif ──────────────────────────────────────

function nextSlot(current) {
  const order = ['g0','g1','g2','g3','pair','flower'];
  for (let i = order.indexOf(current)+1; i < order.length; i++) {
    if (!isGroupComplete(order[i])) return order[i];
  }
  return 'flower';
}

// ── Ajout / suppression de tuiles ─────────────────────────────

function addTile(type, value) {
  const tile = makeTile(type, isNaN(value) ? value : +value);
  const slot = calcState.activeSlot;

  if (slot === 'flower') {
    if (tile.type !== 'flower') return;
    if (calcState.flowers.length >= 8) return;
    calcState.flowers.push(tile);
    // les fleurs ne sont pas tuile gagnante
    refresh(); return;
  }
  if (slot === 'pair') {
    if (calcState.pair.tiles.length >= 2) return;
    calcState.pair.tiles.push(tile);
    calcState.lastTile = tile; calcState.lastSlot = 'pair'; calcState.lastIdx = calcState.pair.tiles.length - 1;
    if (isGroupComplete('pair')) calcState.activeSlot = nextSlot('pair');
    refresh(); return;
  }
  const g = calcState.groups[+slot[1]];
  if (g.tiles.length >= 4) return;
  g.tiles.push(tile);
  calcState.lastTile = tile; calcState.lastSlot = slot; calcState.lastIdx = g.tiles.length - 1;
  const t = detectType(g.tiles);
  if (t === 'chow' || t === 'pung') calcState.activeSlot = nextSlot(slot);
  refresh();
}

function removeLast(slotId, ev) {
  if (ev) ev.stopPropagation();
  if (slotId === 'pair')   { calcState.pair.tiles.pop(); }
  else if (slotId === 'flower') { calcState.flowers.pop(); }
  else { calcState.groups[+slotId[1]].tiles.pop(); }
  if (calcState.lastSlot === slotId) { calcState.lastTile = null; calcState.lastSlot = null; calcState.lastIdx = null; }
  calcState.activeSlot = slotId;
  refresh();
}

function clearSlot(slotId, ev) {
  if (ev) ev.stopPropagation();
  if (slotId === 'pair')   { calcState.pair = { tiles:[], hidden:false }; }
  else if (slotId === 'flower') { calcState.flowers = []; }
  else { calcState.groups[+slotId[1]] = { tiles:[], hidden:false }; }
  if (calcState.lastSlot === slotId) { calcState.lastTile = null; calcState.lastSlot = null; calcState.lastIdx = null; }
  calcState.activeSlot = slotId;
  refresh();
}

function toggleHidden(slotId, checked, ev) {
  if (ev) ev.stopPropagation();
  if (slotId === 'pair') calcState.pair.hidden = checked;
  else calcState.groups[+slotId[1]].hidden = checked;
}

function setActive(slotId) {
  calcState.activeSlot = slotId;
  renderBuilder();
}

// ── Comptage d'utilisation (pour désactiver la palette) ───────

function usageCount(tile) {
  let n = 0;
  calcState.groups.forEach(g => g.tiles.forEach(t => { if (tilesEqual(t, tile)) n++; }));
  calcState.pair.tiles.forEach(t => { if (tilesEqual(t, tile)) n++; });
  calcState.flowers.forEach(t => { if (tilesEqual(t, tile)) n++; });
  return n;
}

// ── Rendu palette ──────────────────────────────────────────────

function renderPalette() {
  const el = document.getElementById('tile-palette');
  const rows = [
    { lbl:'Bambous',   tiles: Array.from({length:9}, (_,i) => makeTile('bamboo', i+1)) },
    { lbl:'Ronds',     tiles: Array.from({length:9}, (_,i) => makeTile('circle', i+1)) },
    { lbl:'Caract.',   tiles: Array.from({length:9}, (_,i) => makeTile('character', i+1)) },
    { lbl:'Honneurs',  tiles: [
        ...['E','S','W','N'].map(v => makeTile('wind', v)),
        ...['R','G','W'].map(v => makeTile('dragon', v)),
    ]},
    { lbl:'Fleurs',    tiles: Array.from({length:8}, (_,i) => makeTile('flower', i+1)) },
  ];

  let html = '';
  rows.forEach(row => {
    html += `<div class="palette-row"><span class="palette-label">${row.lbl}</span><div class="palette-tiles">`;
    row.tiles.forEach(t => {
      const max   = t.type === 'flower' ? 1 : 4;
      const count = usageCount(t);
      const dis   = count >= max ? 'palette-tile-disabled' : '';
      const sym   = tileSymbol(t);
      const lbl   = tileLabel(t);
      html += `<div class="palette-tile ${t.type} ${dis}"
                    data-type="${t.type}" data-value="${t.value}"
                    title="${lbl}">
                 <span class="tile-symbol">${sym}</span>
                 <span class="pal-sub">${lbl}</span>
                 ${count > 0 ? `<span class="pal-count">${count}</span>` : ''}
               </div>`;
    });
    html += '</div></div>';
  });
  el.innerHTML = html;
}

// ── Rendu constructeur ─────────────────────────────────────────

function renderBuilder() {
  const el = document.getElementById('hand-builder');
  let html = '';

  // 4 groupes
  calcState.groups.forEach((g, i) => {
    const sid   = 'g' + i;
    const t     = detectType(g.tiles);
    const compl = t === 'chow' || t === 'pung' || t === 'kong';
    const inv   = t === 'invalid';
    const act   = calcState.activeSlot === sid;
    const cls   = ['builder-slot', act?'slot-active':'', compl?'slot-complete':'', inv?'slot-invalid':''].join(' ');
    const typeCls = inv ? 'slot-type type-invalid' : 'slot-type';

    html += `<div class="${cls}" onclick="setActive('${sid}')">
      <div class="slot-label">Groupe ${i+1}
        ${g.tiles.length ? `<span class="${typeCls}">${typeLabel(t)}</span>` : ''}
      </div>
      <div class="slot-tiles">
        ${g.tiles.map((tile, idx) => renderTileInSlot(tile, calcState.lastSlot === sid && calcState.lastIdx === idx)).join('')}
        ${!g.tiles.length ? '<span class="slot-empty">vide</span>' : ''}
      </div>
      <div class="slot-controls">
        ${g.tiles.length ? `<button class="slot-btn" onclick="removeLast('${sid}',event)">⌫</button>
                            <button class="slot-btn" onclick="clearSlot('${sid}',event)">✕</button>` : ''}
        ${compl ? `<label class="hidden-toggle" onclick="event.stopPropagation()">
                     <input type="checkbox" ${g.hidden?'checked':''} onchange="toggleHidden('${sid}',this.checked,event)"> Caché
                   </label>` : ''}
      </div>
    </div>`;
  });

  // Paire
  const pairT   = detectType(calcState.pair.tiles);
  const pairOk  = pairT === 'pair_ok';
  const pairAct = calcState.activeSlot === 'pair';
  html += `<div class="${['builder-slot', pairAct?'slot-active':'', pairOk?'slot-complete':''].join(' ')}"
               onclick="setActive('pair')">
    <div class="slot-label">Paire
      ${calcState.pair.tiles.length ? `<span class="slot-type">${typeLabel(pairT)}</span>` : ''}
    </div>
    <div class="slot-tiles">
      ${calcState.pair.tiles.map((tile, idx) => renderTileInSlot(tile, calcState.lastSlot === 'pair' && calcState.lastIdx === idx)).join('')}
      ${!calcState.pair.tiles.length ? '<span class="slot-empty">vide</span>' : ''}
    </div>
    <div class="slot-controls">
      ${calcState.pair.tiles.length ? `<button class="slot-btn" onclick="removeLast('pair',event)">⌫</button>
                                        <button class="slot-btn" onclick="clearSlot('pair',event)">✕</button>` : ''}
    </div>
  </div>`;

  // Fleurs
  const flAct = calcState.activeSlot === 'flower';
  html += `<div class="${['builder-slot flower-slot', flAct?'slot-active':''].join(' ')}"
               onclick="setActive('flower')">
    <div class="slot-label">Fleurs</div>
    <div class="slot-tiles">
      ${calcState.flowers.map(tile => renderTileInSlot(tile)).join('')}
      ${!calcState.flowers.length ? '<span class="slot-empty">aucune</span>' : ''}
    </div>
    <div class="slot-controls">
      ${calcState.flowers.length ? `<button class="slot-btn" onclick="removeLast('flower',event)">⌫</button>
                                     <button class="slot-btn" onclick="clearSlot('flower',event)">✕</button>` : ''}
    </div>
  </div>`;

  el.innerHTML = html;
}

// Rendu d'une tuile dans les slots (taille palette = 40×54)
function renderTileInSlot(tile, isWinning = false) {
  const sym = tileSymbol(tile);
  const lbl = tileLabel(tile);
  const cls = `tile ${tile.type}${isWinning ? ' winning' : ''}`;
  return `<div class="${cls}" title="${lbl}${isWinning ? ' — tuile gagnante' : ''}">
    <span class="tile-symbol">${sym}</span>
    <span class="tile-label">${lbl}</span>
  </div>`;
}

// ── Calcul ────────────────────────────────────────────────────

function calculateScore() {
  // Validation
  const validGroups = calcState.groups.filter(g => {
    const t = detectType(g.tiles);
    return t === 'chow' || t === 'pung' || t === 'kong';
  });
  const pairOk = detectType(calcState.pair.tiles) === 'pair_ok';

  if (validGroups.length < 4) {
    showCalcResult(null, `Il faut 4 groupes complets — actuellement : ${validGroups.length}/4.`);
    return;
  }
  if (!pairOk) {
    showCalcResult(null, 'La paire doit contenir 2 tuiles identiques.');
    return;
  }

  const hand = {
    groups: validGroups.map(g => ({
      type: detectType(g.tiles),
      tiles: g.tiles,
      hidden: g.hidden,
    })),
    pair:    calcState.pair,
    flowers: calcState.flowers,
    winTile: calcState.lastTile || calcState.pair.tiles[1] || null,
    winBy:   calcState.ctx.winBy,
    waitType: calcState.ctx.waitType,
    windRound:   calcState.ctx.windRound,
    windPlayer:  calcState.ctx.windPlayer,
    isLastTile:  calcState.ctx.isLastTile,
    isLastDiscard: calcState.ctx.isLastDiscard,
    isStolenKong:  calcState.ctx.isStolenKong,
    isAfterKong:   calcState.ctx.isAfterKong,
    isLastExisting: calcState.ctx.isLastExisting,
    specialType: null,
  };

  showCalcResult(scoreHand(hand), null, hand);
}

function showCalcResult(result, errorMsg, hand) {
  const el = document.getElementById('calc-result');
  el.classList.remove('hidden');

  if (errorMsg) {
    el.innerHTML = `<p class="calc-error">⚠ ${errorMsg}</p>`;
    return;
  }

  let html = '<h2>Résultat</h2>';
  if (result.items.length === 0) {
    html += '<p style="color:#aaa;padding:8px">Aucune combinaison détectée.</p>';
  } else {
    html += '<table><thead><tr><th>Combinaison</th><th class="pts-cell">Points</th></tr></thead><tbody>';
    result.items.forEach(it => {
      const page = getComboRef(it.name);
      const ref  = page ? ` <span class="combo-ref">(Comb. p.${page})</span>` : '';
      html += `<tr><td>${it.name}${ref}</td><td class="pts-cell">+${it.pts}</td></tr>`;
    });
    html += '</tbody></table>';
  }
  const valid = result.total >= 8;
  html += `<div id="calc-total-box" class="${valid ? 'score-valid' : 'score-invalid'}">
    Total : ${result.total} points
    ${!valid ? ' — ⚠ moins de 8 pts : Mah-Jong non valide' : ''}
  </div>`;
  if (hand) {
    const txt = handToText(hand, result, 'Calculateur').replace(/</g,'&lt;');
    html += `<div class="hand-copy-box">
      <div class="hand-copy-label">Copier pour discussion :</div>
      <textarea class="hand-text-area" readonly rows="4" spellcheck="false"
                onfocus="this.select()">${txt}</textarea>
      <button class="copy-action-btn" onclick="
        this.previousElementSibling.select();
        document.execCommand('copy');
        this.textContent='Copié ✓';
        setTimeout(()=>{this.textContent='Copier'},1500)
      ">Copier</button>
    </div>`;
  }
  el.innerHTML = html;
}

function resetCalc() {
  calcState.groups   = makeEmptyGroups();
  calcState.pair     = { tiles:[], hidden:true };
  calcState.flowers  = [];
  calcState.activeSlot = 'g0';
  calcState.lastTile = null; calcState.lastSlot = null; calcState.lastIdx = null;
  calcState.ctx.isLastTile = false;
  calcState.ctx.isLastDiscard = false;
  calcState.ctx.isStolenKong = false;
  calcState.ctx.isAfterKong = false;
  calcState.ctx.isLastExisting = false;
  document.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('calc-result').classList.add('hidden');
  document.getElementById('wait-type').value = '';
  calcState.ctx.waitType = null;
  refresh();
}

// ── Rafraîchissement global ────────────────────────────────────

function refresh() {
  renderBuilder();
  renderPalette();
}

// ── Initialisation ─────────────────────────────────────────────

function initCalculator() {
  renderPalette();
  renderBuilder();

  // Palette : délégation d'événement
  document.getElementById('tile-palette').addEventListener('click', e => {
    const t = e.target.closest('.palette-tile');
    if (!t || t.classList.contains('palette-tile-disabled')) return;
    addTile(t.dataset.type, t.dataset.value);
  });

  // Contexte — vent dominant
  document.querySelectorAll('#ctx-wind-round .wind-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ctx-wind-round .wind-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calcState.ctx.windRound = btn.dataset.wind;
    });
  });

  // Contexte — vent du joueur
  document.querySelectorAll('#ctx-wind-player .wind-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ctx-wind-player .wind-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calcState.ctx.windPlayer = btn.dataset.wind;
    });
  });

  // Contexte — mode de gain
  document.querySelectorAll('.win-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.win-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calcState.ctx.winBy = btn.dataset.win;
    });
  });

  // Boutons options (toggle)
  const checks = {
    'opt-last-tile':    'isLastTile',
    'opt-last-discard': 'isLastDiscard',
    'opt-stolen-kong':  'isStolenKong',
    'opt-after-kong':   'isAfterKong',
    'opt-last-exist':   'isLastExisting',
  };
  Object.entries(checks).forEach(([id, key]) => {
    document.getElementById(id).addEventListener('click', function() {
      this.classList.toggle('active');
      calcState.ctx[key] = this.classList.contains('active');
    });
  });

  // Attente unique
  document.getElementById('wait-type').addEventListener('change', e => {
    calcState.ctx.waitType = e.target.value || null;
  });

  // Boutons
  document.getElementById('calc-btn').addEventListener('click', calculateScore);
  document.getElementById('reset-btn').addEventListener('click', resetCalc);
}
