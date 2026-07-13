import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CalculatorTab } from '../components/CalculatorTab';

// Clique sur la tuile dont le title est `label` dans la palette.
function clickTile(container: HTMLElement, label: string) {
  const palette = container.querySelector('#tile-palette')!;
  fireEvent.click(within(palette as HTMLElement).getByTitle(label));
}

describe('CalculatorTab — rendu initial', () => {
  test('affiche les 3 boutons de mode', () => {
    render(<CalculatorTab />);
    expect(screen.getByText('Standard')).toBeTruthy();
    expect(screen.getByText('7 Paires')).toBeTruthy();
    expect(screen.getByText('Serpentine')).toBeTruthy();
  });

  test('affiche les boutons Calculer et Réinitialiser', () => {
    render(<CalculatorTab />);
    expect(screen.getByText('Calculer')).toBeTruthy();
    expect(screen.getByText('Réinitialiser')).toBeTruthy();
  });

  test('affiche les contrôles de contexte (vent, gain)', () => {
    render(<CalculatorTab />);
    expect(screen.getAllByText('Est').length).toBeGreaterThanOrEqual(2); // vent dominant + vent joueur
    expect(screen.getByText('Écart adverse')).toBeTruthy();
    expect(screen.getByText('Tiré soi-même')).toBeTruthy();
  });
});

describe('CalculatorTab — erreurs de validation', () => {
  test('Calculer avec main vide affiche un message d\'erreur', () => {
    render(<CalculatorTab />);
    fireEvent.click(screen.getByText('Calculer'));
    expect(screen.getByText(/4 groupes complets/)).toBeTruthy();
  });

  test('Calculer sans paire affiche un message d\'erreur sur la paire', () => {
    const { container } = render(<CalculatorTab />);
    // 4 chows complets, pas de paire
    ['1B','2B','3B',  '1R','2R','3R',  '7B','8B','9B',  '1C','2C','3C'].forEach(t =>
      clickTile(container, t)
    );
    // La paire est vide — on force l'emplacement paire actif puis on calcule sans paire
    fireEvent.click(screen.getByText('Calculer'));
    const err = container.querySelector('.calc-error');
    expect(err?.textContent).toMatch(/paire/i);
  });
});

describe('CalculatorTab — changement de mode', () => {
  test('mode 7 Paires affiche 7 slots de paire', () => {
    const { container } = render(<CalculatorTab />);
    fireEvent.click(screen.getByText('7 Paires'));
    // En 7pairs : 7 slots de paire + 1 slot fleur = 8 .builder-slot
    const slots = container.querySelectorAll('.builder-slot:not(.flower-slot)');
    expect(slots.length).toBe(7);
    // Labels "Paire 1" … "Paire 7"
    expect(screen.getByText('Paire 1')).toBeTruthy();
    expect(screen.getByText('Paire 7')).toBeTruthy();
  });

  test('mode 7 Paires : Calculer avec < 7 paires affiche l\'erreur 7 paires', () => {
    render(<CalculatorTab />);
    fireEvent.click(screen.getByText('7 Paires'));
    fireEvent.click(screen.getByText('Calculer'));
    expect(screen.getByText(/7 paires/)).toBeTruthy();
  });

  test('mode Serpentine affiche la section de sélection des familles', () => {
    render(<CalculatorTab />);
    fireEvent.click(screen.getByText('Serpentine'));
    expect(screen.getByText(/Groupes serpentins/)).toBeTruthy();
    expect(screen.getByText('4e groupe (régulier)')).toBeTruthy();
  });
});

describe('CalculatorTab — calcul complet', () => {
  test('main standard complète retourne un score ≥ 8 pts', () => {
    const { container } = render(<CalculatorTab />);

    // g0 : Chow Bambou 1-2-3
    ['1B','2B','3B'].forEach(t => clickTile(container, t));
    // g1 : Chow Rond 4-5-6
    ['4R','5R','6R'].forEach(t => clickTile(container, t));
    // g2 : Chow Caractère 7-8-9
    ['7C','8C','9C'].forEach(t => clickTile(container, t));
    // g3 : Chow Bambou 4-5-6
    ['4B','5B','6B'].forEach(t => clickTile(container, t));
    // Paire : Vert (Dragon) × 2
    ['Vert','Vert'].forEach(t => clickTile(container, t));

    fireEvent.click(screen.getByText('Calculer'));

    // La section résultat doit apparaître avec un total ≥ 8
    const resultSection = container.querySelector('#calc-result');
    expect(resultSection).toBeTruthy();
    // Le texte total doit contenir "points"
    const totalBox = container.querySelector('#calc-total-box');
    expect(totalBox).toBeTruthy();
    const totalText = totalBox!.textContent ?? '';
    const pts = parseInt(totalText.match(/(\d+)\s*points/)?.[1] ?? '0', 10);
    expect(pts).toBeGreaterThanOrEqual(8);
  });

  test('Réinitialiser après calcul masque le résultat', () => {
    const { container } = render(<CalculatorTab />);
    fireEvent.click(screen.getByText('Calculer'));
    // section d'erreur visible
    expect(container.querySelector('#calc-result')).toBeTruthy();
    fireEvent.click(screen.getByText('Réinitialiser'));
    // après reset, le résultat disparaît
    expect(container.querySelector('#calc-result')).toBeNull();
  });
});

describe('CalculatorTab — ajout et suppression de tuiles', () => {
  test('cliquer sur une tuile l\'ajoute au slot actif', () => {
    const { container } = render(<CalculatorTab />);
    clickTile(container, '3B');
    // Le slot g0 doit afficher une tuile 3B
    const slot0 = container.querySelectorAll('.builder-slot')[0]!;
    expect(slot0.textContent).toContain('3B');
  });

  test('la tuile gagnante est marquée (classe "winning")', () => {
    const { container } = render(<CalculatorTab />);
    clickTile(container, '5C');
    // La dernière tuile ajoutée reçoit la classe winning dans le slot
    const winning = container.querySelector('.winning');
    expect(winning).toBeTruthy();
  });

  test('bouton ⌫ supprime la dernière tuile du slot', () => {
    const { container } = render(<CalculatorTab />);
    clickTile(container, '2B');
    clickTile(container, '3B');
    // Deux tuiles dans g0, clic sur ⌫
    const removeBtn = container.querySelector('.slot-btn');
    expect(removeBtn).toBeTruthy();
    fireEvent.click(removeBtn!);
    // Plus que 1 tuile
    const slot0 = container.querySelectorAll('.builder-slot')[0]!;
    const tiles = slot0.querySelectorAll('.tile');
    expect(tiles.length).toBe(1);
  });
});

describe('CalculatorTab — contexte de jeu', () => {
  test('switch "Tiré soi-même" change le bouton actif', () => {
    const { container } = render(<CalculatorTab />);
    const selfBtn = screen.getByText('Tiré soi-même');
    fireEvent.click(selfBtn);
    expect(selfBtn.classList.contains('active')).toBe(true);
    const discardBtn = screen.getByText('Écart adverse');
    expect(discardBtn.classList.contains('active')).toBe(false);
  });

  test('cliquer "Dernière tuile tirée" active le bouton', () => {
    render(<CalculatorTab />);
    const btn = screen.getByText('Dernière tuile tirée');
    expect(btn.classList.contains('active')).toBe(false);
    fireEvent.click(btn);
    expect(btn.classList.contains('active')).toBe(true);
  });
});
