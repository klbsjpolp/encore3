# Projet Vite + React + Shadcn/UI

Ce projet est une application web construite avec Vite, React, TypeScript, et la bibliothèque de composants shadcn/ui.

## Installation

Pour installer les dépendances du projet, exécutez la commande suivante :

```bash
pnpm install
```

## Scripts disponibles

Dans ce projet, vous pouvez exécuter les scripts suivants :

### `pnpm dev`

Lance l'application en mode développement.
Ouvrez [http://localhost:5173](http://localhost:5173) pour la voir dans votre navigateur.

### `pnpm build`

Compile l'application pour la production dans le dossier `dist`.

### `pnpm build:dev`

Compile l'application pour le développement dans le dossier `dist`.

### `pnpm lint`

Exécute ESLint pour trouver et corriger les problèmes dans le code.

### `pnpm preview`

Lance un serveur local pour prévisualiser la version de production.

## Game State Machine

Le jeu est contrôlé par une machine à états finis. Voici les différentes phases et l'ordre dans lequel elles se déroulent.

Les phases avec le suffixe `-ai` sont des états non interactifs où l'IA prend une décision.

### 1. Début du tour (Phase Active)

Le tour commence pour le joueur "actif".

- **`rolling`**: Le joueur humain doit cliquer sur "Lancer les dés".
- **`rolling-ai`**: L'IA attend un court instant avant de lancer automatiquement les dés.

*Transition*: Après le lancer, la phase devient `active-selection` ou `active-selection-ai`.

### 2. Sélection du joueur actif

Le joueur actif choisit une combinaison de dés et des cases sur son plateau.

- **`active-selection`**: Le joueur humain sélectionne un dé de couleur et un dé numérique.
- **`active-selection-ai`**: L'IA évalue les coups possibles et sélectionne une combinaison.

*Transition*: Une fois le coup joué ou passé, la phase devient `player-switching`.

### 3. Tours des joueurs passifs

Le jeu passe en revue chaque joueur "passif" l'un après l'autre.

- **`passive-selection`**: Le joueur humain peut utiliser la même combinaison de dés pour cocher des cases sur son propre plateau.
- **`passive-selection-ai`**: L'IA évalue si elle peut jouer avec la combinaison de dés actuelle.

*Transition*: Après chaque joueur passif, la phase redevient `player-switching` pour passer au joueur suivant.

### 4. Changement de joueur (Phase de transition)

- **`player-switching`**: C'est un état de transition qui détermine la prochaine phase en fonction de la phase précédente (`lastPhase`).
  - Si le tour actif vient de se terminer, on passe au premier joueur passif (`passive-selection` ou `passive-selection-ai`).
  - Si un tour passif vient de se terminer, on passe au joueur passif suivant.
  - Si tous les joueurs passifs ont joué, un nouveau tour commence, et on retourne à la phase `rolling` ou `rolling-ai` avec un nouveau joueur actif.

### 5. Fin du jeu

- **`game-over`**: Cette phase est atteinte lorsqu'un joueur remplit deux couleurs complètes. Le jeu se termine et un gagnant est déclaré.
