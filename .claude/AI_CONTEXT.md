# AI Context

## Architecture du repo
Le projet est une application React moderne construite avec **Vite** et **TypeScript**. L'UI utilise **Tailwind CSS** et les composants de **shadcn/ui**.

- `src/components/`: composants React
  - `game/`: logique d'affichage spécifique au jeu (`DicePanel`, `EncoreGame`, `GameBoard`, `ScorePanel`)
  - `ui/`: composants de base shadcn/ui
- `src/hooks/`: hooks personnalisés contenant la logique métier
  - `useEncoreGame.ts`: coeur de la logique du jeu et machine à états
  - `useAIPlayer.ts`: logique de décision pour les joueurs IA
- `src/lib/`: utilitaires (`utils.ts` pour Tailwind Merge, etc.)
- `src/pages/`: pages de l'application (`Index`, `NotFound`)
- `src/types/`: définitions des types TypeScript (`game.ts`)

## Conventions
- **Composants** : utiliser des composants fonctionnels avec des fonctions fléchées (`const MyComponent = () => ...`).
- **Nommage** : PascalCase pour les composants et types; camelCase pour fonctions, hooks et variables.
- **Imports** : utiliser l'alias `@/` pour pointer vers `src/`.
- **Hooks** : séparer la logique complexe dans des hooks personnalisés pour garder les composants UI simples.
- **Style** : utiliser Tailwind CSS pour le styling.

## Où vivent les tests
*Note : actuellement, aucun framework de test (Vitest/Jest) n'est configuré dans le projet.*
- Si un framework est ajouté, placer les tests unitaires et d'intégration dans `src/` à côté du code testé (ex. `MyComponent.test.tsx`) ou dans un dossier `__tests__/`.

## Commandes de validation
- `pnpm dev` : lance le serveur de développement.
- `pnpm build` : compile l'application pour la production.
- `pnpm lint` : vérifie la qualité du code avec ESLint.
- `pnpm preview` : prévisualise le build de production.

## Ce qu'il ne faut pas casser
- **Machine à états du jeu** : le flux des tours (`Rolling -> Active Selection -> Passive Selection -> Switching`) est critique. Toute modification dans `useEncoreGame.ts` doit préserver ce cycle.
- **Accessibilité** : les composants shadcn/ui sont accessibles par défaut; conserver cette propriété.
- **Réactivité IA** : l'IA doit continuer à jouer automatiquement dans les phases `-ai`.
- **Score** : le calcul des points (colonnes, bonus de couleur) est sensible.

## Ce qui est interdit
- **Mélange logique/UI** : ne pas mettre de logique de calcul complexe (ex. validation de coup) directement dans `src/components/game`; utiliser les hooks.
- **Modifications directes de l'état** : toujours passer par les fonctions de `useEncoreGame` pour modifier l'état du jeu.
- **Type `any`** : à proscrire au profit de types TypeScript précis.
- **Bibliothèques externes lourdes** : éviter d'ajouter des dépendances sans nécessité absolue pour garder le build léger.
- **Refactor large non demandé** : éviter les restructurations importantes sans demande explicite.
