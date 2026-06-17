# CLAUDE.md — mahjonghelper

Guide de travail pour Claude Code sur ce projet.

## Contexte du projet

Site d'entraînement au comptage de points Mah-Jong MCR (Mahjong Competition Rules), déployé sur https://mahjong.feytaud.fr.

Stack : React 19 + TypeScript + Vite 8 + Vitest 4. Déploiement automatique via GitHub Actions (push sur main → git pull + npm ci + npm run build sur le VPS).

---

## Sources de vérité pour les règles MCR

### 1. Les deux PDFs (source primaire absolue)

Les deux PDFs dans la racine du projet font autorité sur toute autre source :

- **`MCR_Combinaisons.pdf`** — FFMJ, Mai 2013. Décrit les 81 combinaisons, leurs points, leurs exclusions et leurs exemples de calcul. **C'est la référence principale.**
- **`MCR_Regles.pdf`** — Règles générales du jeu.

Pour extraire du texte d'une page PDF :
```bash
pdftotext -f <page> -l <page> MCR_Combinaisons.pdf -
```

Quand une règle est ambiguë, chercher dans le PDF :
1. La **définition** de la combinaison (souvent elle dit déjà "sans honneurs", "inclus par définition", etc.)
2. Les **exemples de calcul** — ce qui est présent ou absent dans un exemple est aussi informatif que la définition textuelle (ex : PDF p.29 exemple 2 de Grande suite pure ne liste pas "Pas d'honneur" car Tout Chow l'exclut)
3. Les **remarques** sous chaque combinaison

### 2. Site de référence secondaire

**ventdestmahjong.fr/fr/checkpoints.php** — exemples de mains numérotées avec scores validés.

À utiliser pour :
- Valider nos calculs sur des mains concrètes
- Identifier des règles d'exclusion que le PDF confirme ensuite

Limites connues : le site a des erreurs ou omissions sur certaines mains (ex : omet "Deux Pungs cachés" dans l'exemple 233 — le PDF autorise explicitement le cumul). **Toujours vérifier dans le PDF avant d'implémenter une différence.**

### 3. Site de référence complémentaire

**mahjongdenhaag.nl** — documentation des combinaisons MCR en anglais, avec sections "COMBINES WITH" et exclusions explicites. Utile pour confirmer des cumuls douteux.

---

## Processus de validation d'une règle

1. **Identifier la divergence** : notre score ≠ score du site de référence
2. **Lire le PDF** : chercher la page concernée via `pdftotext`, lire définition + exemples + remarques
3. **Confirmer ou infirmer** : si le PDF confirme la règle → implémenter. Si le PDF contredit le site → garder notre comportement et noter la divergence dans le test
4. **Documenter dans `src/lib/rulesDoc.ts`** : chaque règle confirmée ou en suspens avec ses sources et citations exactes
5. **Ajouter un test de régression** dans `src/tests/combinations.test.ts` avec la main concernée

---

## Architecture des règles dans le code

### `src/lib/combinations.ts`

Fonction principale `scoreHand(hand: Hand): ScoreResult`.

- Les combinaisons sont ajoutées dans l'ordre croissant de points (1 pt → 88 pts)
- La fonction `applyExclusions(items)` est appelée en fin de calcul — elle retire les combinaisons subsumées
- Si aucune combinaison n'est détectée, "Main sans valeur" (+8) est ajouté automatiquement
- Les groupes de type `'snake'` comptent comme chows pour "Tout Chow" (PDF p.25 exemple 2)

### `src/lib/rulesDoc.ts`

Catalogue structuré des règles avec :
- `status: 'confirmed' | 'pending' | 'disputed'`
- `sources: [{type: 'pdf'|'website'|'expert', ref, quote}]`
- `note` : contexte et nuances

**Mettre à jour ce fichier à chaque nouvelle règle confirmée ou en suspens.**

---

## Tests de régression

`src/tests/combinations.test.ts` — 20 tests (2026-06-18).

Chaque test représente une main validée par une source externe (site de référence ou expert). Format :
- Commentaire avec la main, la tuile gagnante, le contexte
- Référence explicite (URL du site ou source)
- Score attendu avec détail des combinaisons
- `expectNotHas` pour les exclusions importantes

Quand un test et le site de référence divergent d'1 pt : vérifier le PDF. Si le PDF confirme le site → corriger le test. Si le PDF contredit le site → garder notre valeur et noter dans le commentaire du test.

---

## Modes du calculateur

Le `CalculatorTab` a 3 modes (`CalcMode`) :

- **Standard** : 4 groupes (chow/pung/kong) + paire
- **7 Paires** : 7 slots paire, max 2 occurrences par tuile dans la palette
- **Serpentine** : 3 sélecteurs de famille (1-4-7 / 2-5-8 / 3-6-9, auto-générés) + 4e groupe normal + paire. L'attente unique est restreinte au 4e groupe et à la paire (PDF p.25 : pas d'attente sur les groupes serpentins).

---

## Types MCR de groupes

`GroupType = 'chow' | 'pung' | 'kong' | 'pair7' | 'snake'`

- `'snake'` : groupe serpentin (1-4-7, 2-5-8 ou 3-6-9 dans une même famille), toujours `hidden: true`

---

## Règles d'exclusion implémentées — résumé rapide

| Combinaison présente | Exclut |
|---|---|
| Tout Chow | Sans honneurs |
| Tout ordinaire | Sans honneurs |
| Les quatre premiers/derniers, Les trois premiers/derniers/du milieu, Tout Pung paire, Tout extrémité, Tout honneur et extrémité | Sans honneurs |
| Les trois du milieu | Tout ordinaire |
| Tout Pung paire | Tout Pung, Tout ordinaire |
| Tout extrémité | Tout Pung, Pung d'extrémité (tous) |
| Tout honneur et extrémité | Tout Pung, Extrémité ou honneur partout, Pung de Vent (tous), Pung d'extrémité (tous) |
| Tout honneur | Tout Pung, Pung de Vent (tous) |
| Quatre petits Vents | Pung de Vent (tous) |
| Quatre Pungs purs consécutifs | Tout Pung, Trois Pungs purs consécutifs |
| Trois Pungs cachés | Deux Pungs cachés |
| Quatre Pungs cachés | Tout Pung, Tout caché donné, Trois Pungs cachés, Deux Pungs cachés |
| Quadruple Chows purs | Triple Chow pur, Double Chow pur, 4 identiques (tous) |
| Triple Chows | Double Chow |
| Grande suite pure | Deux Chows purs d'extrémité |
| Tout exposé | Attente unique sur la paire |
| Kong caché + Kong exposé | Kong exposé (tous), Kong caché (tous) |
| Deux Kongs exposés | Kong exposé (tous) |
| 2 Kongs cachés | Kong caché (tous) |
| Dernière tuile tirée | Tirer soi-même |
| Finir sur le Kong | Tirer soi-même |
| Kong volé | Dernière tuile existante |

---

## Bugs de détection corrigés (à garder en tête)

- **`chowStart(g)`** = `Math.min(...g.tiles.map(t => t.value))` — normalise le début d'un chow indépendamment de l'ordre de saisie dans le calculateur. Utilisé partout où on compare des débuts de chow (pairages, Grande suite, Triple Chows, Grande suite pure, Chows purs superposés, Triple/Quadruple Chow pur).

- **Triple Chows double comptage** : un `Set tcFound` par valeur de départ évite de compter deux fois Triple Chows quand la main contient 2 chows de la même famille et valeur (ex. [B1,R1,Ch1,Ch1] → Triple Chows compté 1 seule fois).

- **Pairages Double Chow pur vs Double Chow** : deux ensembles `used` distincts (`usedInPur` / `usedInOther`). Double Chow pur n'empêche pas la détection d'un Double Chow cross-famille sur le même chow. Ex. [C7,C7,B7] → Double Chow pur (C7+C7) + Double Chow (C7+B7).

- **Avertissement calculateur** : si la tuile gagnante vient d'un écart adverse et que le groupe qu'elle complète est un pung/kong marqué "Caché", un avertissement orange s'affiche. Raison : "Un Pung caché = 3 tuiles tirées soi-même" (PDF p.11) — un pung complété par un écart n'est pas caché.

---

## Règles en suspens (non implémentées)

- **Triple Pung exclut-il Double Pung ?** Non confirmé dans le PDF
- **Trois petits Dragons exclut-il Deux Dragons ?** Non vérifié
- **Trois grands Dragons** : exclusions non vérifiées
