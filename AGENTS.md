# AGENTS.md

Ce dépôt contient un jeu React moderne construit avec **Vite** et **TypeScript**. L'UI utilise **Tailwind CSS** et les composants de **shadcn/ui**.

## Objectif pour les agents
Avant toute modification, lire :
- `.claude/AI_CONTEXT.md` pour l'architecture et les contraintes
- ce fichier `AGENTS.md` pour les règles de travail interopérables

## Architecture du repo
- `src/components/`: composants React
  - `game/`: composants visuels liés au jeu (`DicePanel`, `EncoreGame`, `GameBoard`, `ScorePanel`)
  - `ui/`: composants de base shadcn/ui
- `src/hooks/`: logique métier et orchestration
  - `useEncoreGame.ts`: coeur de la logique du jeu et machine à états
  - `useAIPlayer.ts`: logique de décision de l'IA
- `src/lib/`: utilitaires
- `src/pages/`: pages de l'application
- `src/types/`: types TypeScript du domaine

## Principes d'architecture
- La logique métier doit rester dans les hooks ou fonctions dédiées, pas dans les composants UI.
- Les composants de `src/components/game` doivent rester orientés affichage et interactions.
- L'état doit être modifié uniquement via les fonctions prévues par `useEncoreGame`.
- Préserver la machine à états du jeu : `Rolling -> Active Selection -> Passive Selection -> Switching`.
- Préserver l'automatisation des tours IA dans les phases `-ai`.
- Préserver le calcul des scores, colonnes et bonus de couleur.
- Préserver l'accessibilité des composants et interactions.

## Conventions de code
- Utiliser des composants fonctionnels avec des fonctions fléchées.
- PascalCase pour composants et types.
- camelCase pour fonctions, hooks et variables.
- Utiliser l'alias `@/` pour les imports vers `src/`.
- Éviter `any`; préférer des types TypeScript explicites.
- Éviter d'ajouter des dépendances lourdes sans justification claire.
- Éviter les abstractions nouvelles si elles n'apportent pas un gain clair.

## Workflow obligatoire
Pour toute feature, bugfix ou refactor :
1. Explorer le code existant et identifier les fichiers touchés.
2. Résumer brièvement l'objectif et proposer un plan court avant édition.
3. Faire les changements minimaux nécessaires.
4. Ajouter ou adapter les tests si un cadre de test existe.
5. Exécuter les validations pertinentes avant de terminer.
6. Résumer les fichiers modifiés, les impacts et les risques résiduels.

## Validations
Commandes disponibles :
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm preview`

Il n'y a actuellement pas de framework de test configuré. Ne pas prétendre avoir exécuté des tests unitaires/integration inexistants. Si des tests sont ajoutés plus tard, les placer à côté du code concerné ou dans un dossier `__tests__/`.

## Garde-fous
- Ne pas déplacer de fichiers sans raison.
- Ne pas modifier des fichiers de configuration sensibles sans l'expliquer.
- Ne pas mélanger logique métier et UI.
- Ne pas introduire de refactor large non demandé.
- En cas d'incertitude sur une règle métier, préserver le comportement existant et expliciter l'hypothèse.
