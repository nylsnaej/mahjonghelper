// === DÉFINITION DES TUILES MCR ===

const BAMBOO_SYMBOLS = ['🀐','🀑','🀒','🀓','🀔','🀕','🀖','🀗','🀘'];
const CIRCLE_SYMBOLS = ['🀙','🀚','🀛','🀜','🀝','🀞','🀟','🀠','🀡'];
// Caractères : pas d'emoji Unicode natif lisible, on utilise des chiffres stylés + étiquette
const CHAR_SYMBOLS    = ['一','二','三','四','五','六','七','八','九'];
const WIND_SYMBOLS    = { E:'東', S:'南', W:'西', N:'北' };
const DRAGON_SYMBOLS  = { R:'中', G:'發', W:'白' };
const FLOWER_SYMBOLS  = ['🌸','🌺','🌻','🌼','🍀','🍁','🌿','🎋'];

// Crée un objet tuile
// type: 'bamboo'|'circle'|'character'|'wind'|'dragon'|'flower'
// value: 1-9 pour les familles, 'E'/'S'/'W'/'N' pour vents, 'R'/'G'/'W' pour dragons, 1-8 pour fleurs
function makeTile(type, value) {
  return { type, value };
}

function tileSymbol(tile) {
  switch (tile.type) {
    case 'bamboo':    return BAMBOO_SYMBOLS[tile.value - 1];
    case 'circle':    return CIRCLE_SYMBOLS[tile.value - 1];
    case 'character': return CHAR_SYMBOLS[tile.value - 1];
    case 'wind':      return WIND_SYMBOLS[tile.value];
    case 'dragon':    return DRAGON_SYMBOLS[tile.value];
    case 'flower':    return FLOWER_SYMBOLS[tile.value - 1];
  }
}

function tileLabel(tile) {
  switch (tile.type) {
    case 'bamboo':    return tile.value + 'B';
    case 'circle':    return tile.value + 'R';
    case 'character': return tile.value + 'C';
    case 'wind':      return ({E:'Est',S:'Sud',W:'Ouest',N:'Nord'})[tile.value];
    case 'dragon':    return ({R:'Rouge',G:'Vert',W:'Blanc'})[tile.value];
    case 'flower':    return 'Fleur';
  }
}

function tileKey(tile) {
  return tile.type + '_' + tile.value;
}

function tilesEqual(a, b) {
  return a.type === b.type && a.value === b.value;
}

// Rendu HTML d'une tuile
function renderTile(tile, classes = '') {
  const sym = tileSymbol(tile);
  const lbl = tileLabel(tile);
  const cls = `tile ${tile.type} ${classes}`.trim();
  return `<div class="${cls}" title="${lbl}">
    <span class="tile-symbol">${sym}</span>
    <span class="tile-label">${lbl}</span>
  </div>`;
}

// Rendu d'un groupe de tuiles (chow, pung, kong, paire)
// groupType: 'chow'|'pung'|'kong'|'pair'|'kong-hidden'
// concealed: true → entoure le groupe d'un cadre rouge "caché"
function renderGroup(tiles, groupType, isHidden = false, concealed = false) {
  const cls = 'tile-group' + (groupType === 'kong-hidden' ? ' kong-hidden' : '');
  let inner = `<div class="${cls}">`;
  tiles.forEach((t, i) => {
    let extraClass = '';
    if (groupType === 'kong-hidden') {
      extraClass = (i === 0 || i === 3) ? 'hidden' : '';
    } else if (isHidden) {
      extraClass = 'hidden';
    }
    inner += renderTile(t, extraClass);
  });
  inner += '</div>';
  if (concealed) {
    return `<div class="group-concealed-wrap">${inner}<span class="group-concealed-lbl">caché</span></div>`;
  }
  return inner;
}

// Rendu de la tuile gagnante (surlignée)
function renderWinningTile(tile) {
  const sym = tileSymbol(tile);
  const lbl = tileLabel(tile);
  const cls = `tile ${tile.type} winning`;
  return `<div class="${cls}" title="${lbl} — tuile gagnante">
    <span class="tile-symbol">${sym}</span>
    <span class="tile-label">${lbl}</span>
  </div>`;
}
