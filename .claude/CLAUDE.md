# Instructions Claude Code

## Contexte projet
- @AI_CONTEXT.md
- @../AGENTS.md

## Règles de travail
- Respecter l'architecture décrite dans `AI_CONTEXT.md`.
- Respecter les règles interopérables décrites dans `../AGENTS.md`.
- Faire des changements minimaux.
- Exécuter les validations pertinentes avant de terminer.
- Ne pas mélanger logique métier et UI.
- Ne pas déplacer de fichiers sans raison.
- Ne pas introduire de nouvelles abstractions sans justification.
- Ne pas modifier les fichiers de configuration sensibles sans l'expliquer.
- Ne pas prétendre avoir exécuté des tests qui n'existent pas dans le projet.

## Workflow obligatoire pour une feature
1. Explorer le code existant et identifier les fichiers touchés.
2. Proposer un plan court avant édition.
3. Faire les changements minimaux nécessaires.
4. Ajouter ou adapter les tests si un framework de test existe.
5. Exécuter `pnpm lint` et/ou `pnpm build` selon la nature du changement.
6. Résumer les impacts, les risques résiduels et les fichiers modifiés.

## Priorités
1. Préserver les règles métier et la machine à états du jeu.
2. Préserver la lisibilité et la simplicité.
3. Préserver le comportement existant sauf demande explicite.
