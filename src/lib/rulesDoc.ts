// Documentation des règles MCR confirmées ou en suspens.
// Chaque entrée liste les sources qui ont permis de trancher.
// Statut :
//   'confirmed' = règle appliquée dans combinations.ts, confirmée par ≥1 source
//   'pending'   = question ouverte, règle NON appliquée en attendant confirmation
//   'disputed'  = sources contradictoires

export type RuleStatus = 'confirmed' | 'pending' | 'disputed';

export interface RuleSource {
  type: 'pdf' | 'website' | 'expert';
  ref: string;
  quote?: string;
}

export interface RuleDoc {
  id: string;
  rule: string;
  status: RuleStatus;
  sources: RuleSource[];
  note?: string;
}

export const RULES_DOC: RuleDoc[] = [

  // ── Exclusions "Sans honneurs" ────────────────────────────────────────────

  {
    id: 'tout-ordinaire-excl-sans-honneurs',
    rule: '"Tout ordinaire" exclut "Sans honneurs"',
    status: 'confirmed',
    sources: [
      {
        type: 'pdf',
        ref: 'MCR_Combinaisons.pdf p.12 (FFMJ Mai 2013)',
        quote: '« Tout ordinaire : une main avec uniquement les tuiles simples (entre 2 et 8) et aucune tuile d\'Honneur (Dragon ou Vent) ni d\'extrémités (1 ou 9) »',
      },
    ],
    note: 'Tout ordinaire implique par définition l\'absence d\'honneurs → Sans honneurs est un sous-ensemble redondant.',
  },

  {
    id: 'tout-chow-excl-sans-honneurs',
    rule: '"Tout Chow" exclut "Sans honneurs"',
    status: 'confirmed',
    sources: [
      {
        type: 'pdf',
        ref: 'MCR_Combinaisons.pdf p.11 (FFMJ Mai 2013)',
        quote: '« Tout Chows : une main composée de 4 Chows et d\'une paire, avec uniquement les 3 familles, sans les honneurs » + « Le point pour « pas d\'honneur » est inclus par définition »',
      },
      {
        type: 'pdf',
        ref: 'MCR_Combinaisons.pdf p.29 exemples 1 et 2 — Grande suite pure',
        quote: 'Exemple 1 (sans Tout Chow) : compte "Pas d\'honneur". Exemple 2 (avec Tout Chow) : ne compte PAS "Pas d\'honneur". Preuve par comparaison.',
      },
      {
        type: 'website',
        ref: 'ventdestmahjong.fr mains 217, Triple Chows, et test #14',
        quote: 'Calcul validé sans "Sans honneurs" quand "Tout Chow" est présent.',
      },
    ],
    note: 'Tout Chow requiert par définition l\'absence d\'honneurs. Note : l\'expert initial du test #1 comptait +1 Sans honneurs avec Tout Chow — c\'était une erreur. Les tests #1, #5, #12 ont été corrigés en conséquence.',
  },

  // ── Exclusions "Double Chow" ──────────────────────────────────────────────

  {
    id: 'triple-chows-excl-double-chow',
    rule: '"Triple Chows" exclut "Double Chow" (familles différentes)',
    status: 'confirmed',
    sources: [
      {
        type: 'pdf',
        ref: 'MCR_Combinaisons.pdf pp.37-38 (FFMJ Mai 2013)',
        quote: 'Tous les exemples PDF avec Triple Chows ne montrent que Double Chow pur en complément, jamais Double Chow (familles différentes).',
      },
    ],
    note: 'Triple Chows capture déjà la notion « même valeur dans 3 familles différentes ».',
  },

  // ── Cumuls autorisés ─────────────────────────────────────────────────────

  {
    id: 'deux-pungs-caches-cumul-tout-pung',
    rule: '"Deux Pungs cachés" se cumule avec "Tout Pung"',
    status: 'confirmed',
    sources: [
      {
        type: 'pdf',
        ref: 'MCR_Combinaisons.pdf p.11 (FFMJ Mai 2013)',
        quote: '« Cette combinaison peut se cumuler avec les points des Pungs. »',
      },
      {
        type: 'website',
        ref: 'https://www.mahjongdenhaag.nl/mcrfan49-all-pungs',
        quote: '"Two Concealed Pungs" est listé explicitement dans la section "COMBINES WITH" pour "All Pungs".',
      },
    ],
    note: 'Le site ventdestmahjong.fr exemple 233 omet ce cumul — il est en tort. Différence : +2 pts.',
  },

  // ── Règles de détection ───────────────────────────────────────────────────

  {
    id: 'tout-cache-ignore-pair-hidden',
    rule: '"Tout caché donné/tiré" ne requiert pas que la paire soit marquée hidden',
    status: 'confirmed',
    sources: [
      {
        type: 'pdf',
        ref: 'MCR_Combinaisons.pdf p.10 (FFMJ Mai 2013)',
        quote: '« Aucune tuile n\'est exposée (visible) »',
      },
    ],
    note: 'En MCR la paire (tête) n\'est jamais déclarée/exposée comme un groupe. Seuls les 4 groupes comptent pour évaluer si la main est cachée.',
  },

  {
    id: 'kong-combos-excl-bonus-individuels',
    rule: '"Kong caché + Kong exposé", "Deux Kongs exposés", "2 Kongs cachés" excluent les bonus individuels Kong exposé/Kong caché',
    status: 'confirmed',
    sources: [
      {
        type: 'pdf',
        ref: 'MCR_Combinaisons.pdf p.17 (Kong caché + Kong exposé), p.14 (Deux Kongs exposés), p.20 (2 Kongs cachés)',
        quote: '« peut se cumuler avec les points des Kongs » — tous les exemples PDF cumulent uniquement les bonus de valeur (Pung d\'extrémité, Pung de Dragon…), jamais les bonus structurels Kong exposé (+1) ou Kong caché (+2).',
      },
      {
        type: 'website',
        ref: 'ventdestmahjong.fr main 238',
        quote: 'Calcul validé sans "Kong exposé" ni "Kong caché" individuels.',
      },
    ],
    note: '"Peut se cumuler avec les points des Kongs" désigne les bonus liés à la VALEUR des tuiles (extrémité, dragon…), pas les bonus structurels. Note : "Tout Pung" exemple 3 PDF p.15 montre que "Kong exposé" EST cumulable avec "Tout Pung" — seuls les combos de kongs l\'excluent.',
  },

  {
    id: 'grande-suite-pure-excl-deux-chows-extremite',
    rule: '"Grande suite pure" exclut "Deux Chows purs d\'extrémité"',
    status: 'confirmed',
    sources: [
      {
        type: 'pdf',
        ref: 'MCR_Combinaisons.pdf p.29 exemple 1 (FFMJ Mai 2013)',
        quote: 'L\'exemple de Grande suite pure contient nécessairement 1-2-3 et 7-8-9 de la même famille, mais n\'y liste pas "Deux Chows purs d\'extrémité".',
      },
      {
        type: 'website',
        ref: 'ventdestmahjong.fr main 217',
        quote: 'Calcul validé sans "Deux Chows purs d\'extrémité".',
      },
    ],
    note: 'Grande suite pure inclut par définition les suites 1-2-3 et 7-8-9 dans la même famille — les compter séparément serait du double comptage. "Sans honneurs" reste comptable (PDF p.29 exemple 1 le montre explicitement).',
  },

  {
    id: 'tout-expose-excl-attente-paire',
    rule: '"Tout exposé" exclut "Attente unique sur la paire"',
    status: 'confirmed',
    sources: [
      {
        type: 'pdf',
        ref: 'MCR_Combinaisons.pdf p.16 (FFMJ Mai 2013)',
        quote: '« Étant donné la définition de cette combinaison, le point pour attente sur la paire est inclus. »',
      },
      {
        type: 'website',
        ref: 'ventdestmahjong.fr main 202',
        quote: 'Calcul validé sans "Attente unique sur la paire".',
      },
    ],
    note: 'Tout exposé requiert par définition que la dernière tuile soit un écart sur la paire — l\'attente est donc toujours "sur la paire", la combiner serait redondant.',
  },

  // ── Questions en suspens ──────────────────────────────────────────────────

  {
    id: 'triple-pung-excl-double-pung',
    rule: '"Triple Pung" exclut "Double Pung" ?',
    status: 'pending',
    sources: [],
    note: 'Non confirmé dans les PDFs. Non implémenté.',
  },

  {
    id: 'trois-petits-dragons-excl-deux-dragons',
    rule: '"Trois petits Dragons" exclut "Deux Dragons" ?',
    status: 'pending',
    sources: [],
    note: 'Non vérifié dans les PDFs.',
  },

  {
    id: 'trois-grands-dragons-excl-deux-dragons',
    rule: '"Trois grands Dragons" exclut "Deux Dragons" et "Pung de Dragon" ?',
    status: 'pending',
    sources: [],
    note: 'Non vérifié dans les PDFs.',
  },
];
