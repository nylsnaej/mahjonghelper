import { useState, useCallback, useEffect } from 'react';
import { TileComponent } from './TileComponent';
import { TileGroup } from './TileGroup';
import { generateHand } from '../lib/generator';
import { scoreHand, getComboRef } from '../lib/combinations';
import { tileLabel } from '../lib/tiles';
import { handToText } from '../lib/handText';
import type { Hand, ScoreResult } from '../types';

const LEVEL_DESCS = [
  'Mode Tout : niveaux 1-10 + suite serpentine',
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

const WIND_NAME: Record<string, string> = { E: 'Est', S: 'Sud', W: 'Ouest', N: 'Nord' };

interface Stats { played: number; correct: number; totalDiff: number; }

export function TrainingTab() {
  const [level, setLevel]           = useState(1);
  const [hand, setHand]             = useState<Hand | null>(null);
  const [score, setScore]           = useState<ScoreResult | null>(null);
  const [answer, setAnswer]         = useState('');
  const [feedback, setFeedback]     = useState<{ text: string; cls: string } | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [validated, setValidated]   = useState(false);
  const [stats, setStats]           = useState<Stats>({ played: 0, correct: 0, totalDiff: 0 });
  const [copyLabel, setCopyLabel]   = useState('Copier');

  const startNewHand = useCallback((lvl: number) => {
    const h = generateHand(lvl);
    setHand(h);
    setScore(scoreHand(h));
    setAnswer('');
    setFeedback(null);
    setShowDetail(false);
    setValidated(false);
  }, []);

  useEffect(() => { startNewHand(level); }, []);

  function handleNewHand() { startNewHand(level); }

  function handleLevelChange(lvl: number) {
    setLevel(lvl);
    startNewHand(lvl);
  }

  function validate() {
    const userAns = parseInt(answer, 10);
    if (isNaN(userAns)) { setFeedback({ text: 'Entrez un nombre de points.', cls: '' }); return; }
    if (!score) return;

    const correct = score.total;
    const diff = Math.abs(userAns - correct);

    setStats(s => ({ played: s.played + 1, correct: s.correct + (diff === 0 ? 1 : 0), totalDiff: s.totalDiff + diff }));

    if (diff === 0)      setFeedback({ text: '✓ Exact ! ' + correct + ' points.', cls: 'feedback-correct' });
    else if (diff <= 2)  setFeedback({ text: 'Presque ! La réponse était ' + correct + ' pts (écart : ' + diff + ').', cls: 'feedback-close' });
    else                 setFeedback({ text: '✗ La réponse était ' + correct + ' pts (votre réponse : ' + userAns + ').', cls: 'feedback-wrong' });

    setShowDetail(true);
    setValidated(true);
  }

  function handleCopy() {
    if (!hand || !score) return;
    const ta = document.getElementById('hand-text-area') as HTMLTextAreaElement | null;
    if (ta) { ta.select(); document.execCommand('copy'); }
    setCopyLabel('Copié ✓');
    setTimeout(() => setCopyLabel('Copier'), 1500);
  }

  if (!hand || !score) return null;

  const avgDiff = stats.played > 0 ? Math.round(stats.totalDiff / stats.played) : '—';

  return (
    <div id="tab-train" className="tab-content">
      {/* Niveaux */}
      <div id="level-bar">
        <span>Niveau :</span>
        <div id="level-buttons">
          <button
            className={'level-btn' + (level === 0 ? ' active' : '')}
            title={LEVEL_DESCS[0]}
            onClick={() => handleLevelChange(0)}
          >Tout</button>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              className={'level-btn' + (n === level ? ' active' : '')}
              title={LEVEL_DESCS[n]}
              onClick={() => handleLevelChange(n)}
            >{n}</button>
          ))}
        </div>
      </div>

      {/* Main gagnante */}
      <section id="hand-section">
        <h2>Main gagnante</h2>

        {/* Contexte */}
        <div id="context-info">
          <span className="ctx-badge">Vent dominant : <strong>{WIND_NAME[hand.windRound]}</strong></span>
          <span className="ctx-badge">Vent du joueur : <strong>{WIND_NAME[hand.windPlayer]}</strong></span>
          {hand.winBy === 'self'    && <span className="ctx-badge">Gain : <strong>Tiré soi-même</strong></span>}
          {hand.winBy === 'discard' && <span className="ctx-badge">Gain : <strong>Écart adverse</strong></span>}
          {hand.isLastTile     && <span className="ctx-badge" style={{ color: '#e67e22' }}>⚠ Dernière tuile de la muraille</span>}
          {hand.isLastExisting && <span className="ctx-badge" style={{ color: '#e67e22' }}>⚠ Dernière tuile existante</span>}
          {hand.isStolenKong   && <span className="ctx-badge" style={{ color: '#e67e22' }}>⚠ Kong volé</span>}
          {hand.isAfterKong    && <span className="ctx-badge" style={{ color: '#e67e22' }}>⚠ Finir sur Kong</span>}
        </div>

        {/* Tuiles */}
        <div id="hand-display">
          {hand.specialType === '13orphans' ? (
            <>
              <div className="tile-group">
                {(hand.orphanTiles ?? []).map((t, i) => <TileComponent key={i} tile={t} />)}
              </div>
              <div className="tile-group" style={{ borderColor: '#f5c842' }}>
                {hand.pairTile && <TileComponent tile={hand.pairTile} winning />}
              </div>
            </>
          ) : (
            <>
              {hand.groups.map((g, i) => {
                const isHiddenKong = g.type === 'kong' && g.hidden;
                const concealed    = g.hidden && g.type !== 'pair7';
                return (
                  <TileGroup
                    key={i}
                    tiles={g.tiles}
                    isHiddenKong={isHiddenKong}
                    concealed={concealed}
                    concealedLabel={g.type === 'snake' ? 'serpentin' : undefined}
                  />
                );
              })}
              <TileGroup tiles={hand.pair.tiles} />
              {hand.flowers.length > 0 && (
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#aaa', width: '100%' }}>
                  Fleurs :&nbsp;{hand.flowers.map((f, i) => <TileComponent key={i} tile={f} />)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tuile gagnante */}
        <div id="winning-tile-display">
          {hand.specialType === '13orphans' && hand.pairTile
            ? '★ Tuile gagnante : ' + tileLabel(hand.pairTile)
            : hand.winTile && (
              <>★ Tuile gagnante : <TileComponent tile={hand.winTile} winning />&nbsp;
                <span style={{ marginLeft: 8, verticalAlign: 'middle', fontSize: '0.85rem', color: '#aaa' }}>{tileLabel(hand.winTile)}</span>
              </>
            )
          }
        </div>
      </section>

      {/* Réponse */}
      <section id="answer-section">
        <div id="question-text">Combien vaut cette main ?</div>
        <div id="input-row">
          <input
            type="number"
            id="answer-input"
            min="0"
            placeholder="Votre réponse en points"
            value={answer}
            disabled={validated}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !validated) validate(); }}
            autoFocus
          />
          <button id="validate-btn" disabled={validated} onClick={validate}>Valider</button>
          <button id="new-hand-btn" onClick={handleNewHand}>Nouvelle main</button>
        </div>
        {feedback && <div id="feedback" className={feedback.cls}>{feedback.text}</div>}
      </section>

      {/* Détail */}
      {showDetail && (
        <section id="detail-section">
          <h2>Détail du calcul</h2>
          <div id="detail-content">
            {score.items.length === 0 ? (
              <p style={{ color: '#aaa' }}>Aucune combinaison détectée.</p>
            ) : (
              <table>
                <thead><tr><th>Combinaison</th><th className="pts-cell">Points</th></tr></thead>
                <tbody>
                  {score.items.map((item, i) => {
                    const page = getComboRef(item.name);
                    return (
                      <tr key={i}>
                        <td>{item.name}{page && <span className="combo-ref"> (Comb. p.{page})</span>}</td>
                        <td className="pts-cell">+{item.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div id="score-summary">Total : {score.total} points</div>
          <div id="hand-copy-box">
            <div id="hand-copy-label">Copier pour discussion :</div>
            <textarea
              id="hand-text-area"
              readOnly
              rows={4}
              spellCheck={false}
              value={handToText(hand, score, level)}
              onFocus={e => e.target.select()}
            />
            <button id="copy-btn" onClick={handleCopy}>{copyLabel}</button>
          </div>
          <button id="next-btn" onClick={handleNewHand}>Main suivante →</button>
        </section>
      )}

      <footer>
        <div id="stats">
          Mains jouées : <span id="stat-played">{stats.played}</span> |
          Correctes : <span id="stat-correct">{stats.correct}</span> |
          Score moyen d'écart : <span id="stat-avg">{avgDiff}</span>
        </div>
      </footer>
    </div>
  );
}
