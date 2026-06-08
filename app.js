// === APPLICATION PRINCIPALE ===

let currentLevel = 1;
let currentHand  = null;
let currentScore = null;

let stats = { played: 0, correct: 0, totalDiff: 0 };

// ── Init ──────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  initTabs();
  buildLevelButtons();
  bindEvents();
  newHand();
  initCalculator();
});

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });
}

function buildLevelButtons() {
  const container = document.getElementById('level-buttons');
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (i === 1 ? ' active' : '');
    btn.textContent = i;
    btn.dataset.level = i;
    btn.title = levelDescription(i);
    btn.addEventListener('click', () => {
      currentLevel = i;
      document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      newHand();
    });
    container.appendChild(btn);
  }
}

function levelDescription(n) {
  const descs = [
    '', // 0
    'Combinaisons à 1 pt : Double Chow, familles',
    'Combinaisons à 1-2 pts : Pungs, Dragons',
    'Combinaisons à 2-4 pts : Kongs, Vents du joueur',
    'Tout caché, Semi-pure (6 pts)',
    'Grande suite, Triple Chow (8 pts)',
    'Main pure, 4 premiers/derniers — avec contexte',
    '7 paires, Grande suite pure (16-24 pts)',
    'Trois petits Dragons, Quatre petits Vents (64 pts)',
    'Treize orphelins, Neuf portes (88 pts)',
    'Mains maximales, contexte complet, Main verte',
  ];
  return descs[n] || '';
}

function bindEvents() {
  document.getElementById('validate-btn').addEventListener('click', validate);
  document.getElementById('new-hand-btn').addEventListener('click', newHand);
  document.getElementById('next-btn').addEventListener('click', newHand);
  document.getElementById('answer-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') validate();
  });
  document.getElementById('hand-text').addEventListener('focus', function() { this.select(); });
  document.getElementById('copy-btn').addEventListener('click', () => {
    const ta = document.getElementById('hand-text');
    ta.select();
    document.execCommand('copy');
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copié ✓';
    setTimeout(() => { btn.textContent = 'Copier'; }, 1500);
  });
}


// ── Rendu du contexte ─────────────────────────────────────────

function renderContext() {
  const el = document.getElementById('context-info');
  const windName = { E:'Est', S:'Sud', W:'Ouest', N:'Nord' };
  const h = currentHand;
  let html = `
    <span class="ctx-badge">Vent dominant : <strong>${windName[h.windRound]}</strong></span>
    <span class="ctx-badge">Vent du joueur : <strong>${windName[h.windPlayer]}</strong></span>
  `;
  if (h.winBy === 'self') html += `<span class="ctx-badge">Gain : <strong>Tiré soi-même</strong></span>`;
  if (h.winBy === 'discard') html += `<span class="ctx-badge">Gain : <strong>Écart adverse</strong></span>`;
  if (h.isLastTile)     html += `<span class="ctx-badge" style="color:#e67e22">⚠ Dernière tuile de la muraille</span>`;
  if (h.isLastExisting) html += `<span class="ctx-badge" style="color:#e67e22">⚠ Dernière tuile existante</span>`;
  if (h.isStolenKong)   html += `<span class="ctx-badge" style="color:#e67e22">⚠ Kong volé</span>`;
  if (h.isAfterKong)    html += `<span class="ctx-badge" style="color:#e67e22">⚠ Finir sur Kong</span>`;
  el.innerHTML = html;
}

// ── Rendu de la main ──────────────────────────────────────────

function renderHandDisplay() {
  const handEl  = document.getElementById('hand-display');
  const winEl   = document.getElementById('winning-tile-display');
  const hand    = currentHand;

  // Cas spécial : 13 orphelins
  if (hand.specialType === '13orphans') {
    let html = '<div class="tile-group">';
    hand.orphanTiles.forEach(t => {
      html += renderTile(t);
    });
    html += '</div>';
    // La 14e tuile est la paire (surlignée)
    html += '<div class="tile-group" style="border-color:#f5c842">' + renderWinningTile(hand.pairTile) + '</div>';
    handEl.innerHTML = html;
    winEl.innerHTML  = '★ Tuile gagnante : ' + tileLabel(hand.pairTile);
    return;
  }

  let html = '';

  hand.groups.forEach(g => {
    const isHiddenKong = g.type === 'kong' && g.hidden;
    const displayType = isHiddenKong ? 'kong-hidden' : (g.type === 'pair7' ? 'pair' : g.type);
    const showConcealed = g.hidden && g.type !== 'pair7';
    html += renderGroup(g.tiles, displayType, false, showConcealed);
  });

  // Paire — toujours face visible pour que le décompte soit lisible
  html += renderGroup(hand.pair.tiles, 'pair', false, false);

  handEl.innerHTML = html;

  // Tuile gagnante
  if (hand.winTile) {
    winEl.innerHTML = '★ Tuile gagnante : ' + renderWinningTile(hand.winTile) +
      '<span style="margin-left:8px;vertical-align:middle;font-size:0.85rem;color:#aaa">' + tileLabel(hand.winTile) + '</span>';
  }

  // Fleurs
  if (hand.flowers && hand.flowers.length > 0) {
    let florHtml = '<div style="margin-top:8px;font-size:0.85rem;color:#aaa">Fleurs : ';
    hand.flowers.forEach(f => { florHtml += renderTile(f); });
    florHtml += '</div>';
    handEl.innerHTML += florHtml;
  }
}

// ── Validation ────────────────────────────────────────────────

function validate() {
  const input   = document.getElementById('answer-input');
  const userAns = parseInt(input.value, 10);
  if (isNaN(userAns)) {
    document.getElementById('feedback').textContent = 'Entrez un nombre de points.';
    return;
  }

  const correct = currentScore.total;
  const diff    = Math.abs(userAns - correct);

  stats.played++;
  stats.totalDiff += diff;

  let fbClass, fbText;
  if (diff === 0) {
    fbClass = 'feedback-correct';
    fbText  = '✓ Exact ! ' + correct + ' points.';
    stats.correct++;
  } else if (diff <= 2) {
    fbClass = 'feedback-close';
    fbText  = 'Presque ! La réponse était ' + correct + ' pts (écart : ' + diff + ').';
  } else {
    fbClass = 'feedback-wrong';
    fbText  = '✗ La réponse était ' + correct + ' pts (votre réponse : ' + userAns + ').';
  }

  const fb = document.getElementById('feedback');
  fb.textContent = fbText;
  fb.className   = fbClass;

  updateStats();
  showDetail();
}

// ── Représentation texte de la main ──────────────────────────

function handToText(hand, score, level) {
  const windName = { E:'Est', S:'Sud', W:'Ouest', N:'Nord' };
  const lines = [];

  // Contexte
  const ctx = [
    'Niveau ' + level,
    'Vent dominant : ' + windName[hand.windRound],
    'Vent joueur : ' + windName[hand.windPlayer],
    'Gain : ' + (hand.winBy === 'self' ? 'tiré soi-même' : 'écart adverse'),
  ];
  if (hand.isLastTile)     ctx.push('dernière tuile tirée');
  if (hand.isLastDiscard)  ctx.push('dernière tuile jetée');
  if (hand.isStolenKong)   ctx.push('kong volé');
  if (hand.isAfterKong)    ctx.push('finir sur kong');
  if (hand.isLastExisting) ctx.push('dernière tuile existante');
  lines.push(ctx.join(' | '));

  // Groupes
  if (hand.specialType === '13orphans') {
    lines.push('Treize orphelins [' + hand.orphanTiles.map(tileLabel).join(' ') + ']');
  } else if (hand.specialType === '7pairs') {
    const allPairs = [...hand.groups.map(g => g.tiles), hand.pair.tiles];
    lines.push('Sept paires [' + allPairs.map(p => p.map(tileLabel).join('')).join(' / ') + ']');
  } else {
    const typeName = { chow:'Chow', pung:'Pung', kong:'Kong', pair7:'Paire' };
    const parts = hand.groups.map(g => {
      const t = typeName[g.type] || g.type;
      return t + (g.hidden ? ' caché' : '') + ' [' + g.tiles.map(tileLabel).join(' ') + ']';
    });
    parts.push('Paire [' + hand.pair.tiles.map(tileLabel).join(' ') + ']');
    if (hand.flowers.length) parts.push('Fleur ×' + hand.flowers.length);
    lines.push(parts.join(' · '));
  }

  // Tuile gagnante + attente
  let winLine = 'Tuile gagnante : ' + tileLabel(hand.winTile);
  if (hand.waitType === 'pair')   winLine += ' (attente sur la paire)';
  if (hand.waitType === 'edge')   winLine += ' (attente au bord)';
  if (hand.waitType === 'closed') winLine += ' (attente au milieu)';
  lines.push(winLine);

  // Score
  const scoreStr = score.items.map(it => it.name + ' +' + it.pts).join(' | ');
  lines.push('Score : ' + (scoreStr || 'aucune combinaison') + ' = ' + score.total + ' pts');

  return lines.join('\n');
}

// ── Détail du calcul ──────────────────────────────────────────

function showDetail() {
  const section = document.getElementById('detail-section');
  const content = document.getElementById('detail-content');
  const summary = document.getElementById('score-summary');
  const items   = currentScore.items;
  const total   = currentScore.total;

  if (items.length === 0) {
    content.innerHTML = '<p style="color:#aaa">Aucune combinaison détectée.</p>';
  } else {
    let html = '<table><thead><tr><th>Combinaison</th><th class="pts-cell">Points</th></tr></thead><tbody>';
    items.forEach(item => {
      const page = getComboRef(item.name);
      const ref  = page ? ` <span class="combo-ref">(Comb. p.${page})</span>` : '';
      html += `<tr><td>${item.name}${ref}</td><td class="pts-cell">+${item.pts}</td></tr>`;
    });
    html += '</tbody></table>';
    content.innerHTML = html;
  }

  summary.textContent = 'Total : ' + total + ' points';
  document.getElementById('hand-text').value = handToText(currentHand, currentScore, currentLevel);
  section.classList.remove('hidden');

  // Masquer la zone de saisie après validation
  document.getElementById('validate-btn').disabled = true;
  document.getElementById('answer-input').disabled = true;
}

// ── Stats ─────────────────────────────────────────────────────

function updateStats() {
  document.getElementById('stat-played').textContent  = stats.played;
  document.getElementById('stat-correct').textContent = stats.correct;
  const avg = stats.played > 0 ? Math.round(stats.totalDiff / stats.played) : '—';
  document.getElementById('stat-avg').textContent = avg;
}

// Réactivation des inputs pour la prochaine main
function newHand() {
  document.getElementById('validate-btn').disabled = false;
  document.getElementById('answer-input').disabled = false;

  currentHand  = generateHand(currentLevel);
  currentScore = scoreHand(currentHand);

  document.getElementById('detail-section').classList.add('hidden');
  document.getElementById('answer-section').classList.remove('hidden');
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = '';
  document.getElementById('answer-input').value = '';
  document.getElementById('answer-input').focus();

  renderContext();
  renderHandDisplay();
}
