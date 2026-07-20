## Contexte projet

- Lire et suivre les règles décrites dans :
  - @AI_CONTEXT.md
  - @../AGENTS.md

## Architecture (aperçu rapide)

- `src/hooks/encore-game/` : logique de jeu pure (règles, dés, scoring, IA) — pas de JSX.
- `src/components/game/` : composants UI + hooks React (ex: `useEncoreSelection`, `useSpacebarShortcut`).
- `src/data/boards/` : définitions des plateaux.
- `src/lib/` : utilitaires transverses (son, vibration, PWA, versioning).
- Le jeu est une machine à états finis ; le détail des phases est documenté dans [README.md § Game State Machine](../README.md#game-state-machine).

## Pièges connus

- `pnpm test` est ~2x plus lent sur CI qu'en local (voir README) : viser une marge de sécurité sur les tests avec délais/timeouts.
- Ne jamais utiliser `as const` sur un tableau passé à `navigator.vibrate()` (`src/lib/vibration.ts`) : ça infère un tuple `readonly`, rejeté par le typage de l'API. Vite/esbuild ne type-check pas, donc l'erreur ne surgit que via `tsc --noEmit` (CI).

## Principes généraux

- Respecter l’architecture du projet.
- Faire des changements minimaux et ciblés.
- Préserver les patterns existants.
- Ne pas introduire de nouvelles abstractions sans justification.
- Ne pas déplacer ou restructurer des fichiers sans raison claire.
- Ne pas modifier des fichiers de configuration sensibles sans l’expliquer.

## Tests et validation

- Ajouter ou adapter les tests lorsqu’une logique existante est modifiée.
- Exécuter les validations pertinentes avant de considérer la tâche terminée.
- Ne jamais affirmer qu’une validation a été exécutée si ce n’est pas le cas.

## Workflow obligatoire pour une tâche

1. Explorer le code existant et identifier les fichiers concernés.
2. Proposer un plan court avant de modifier le code.
3. Implémenter les changements minimaux nécessaires.
4. Ajouter ou adapter les tests si nécessaire.
5. Appliquer le formatage (`pnpm format`) puis les auto-fix lint (`pnpm lint:fix`) après modifications.
6. Exécuter les validations pertinentes définies dans le projet.
7. Résumer les impacts, fichiers modifiés et risques résiduels.

## Style attendu

- privilégier la simplicité
- privilégier la lisibilité
- éviter le sur-design
- respecter strictement le formatage et l’ordre des imports définis par Prettier et ESLint
