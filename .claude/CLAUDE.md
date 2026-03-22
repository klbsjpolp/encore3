## Contexte projet

- Lire et suivre les règles décrites dans :
  - @AI_CONTEXT.md
  - @../AGENTS.md

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
