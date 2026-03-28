import type { GameState } from '@/types/game'

export const getGameStateMessage = (gameState: GameState) => {
  if (gameState.phase === 'player-switching') {
    return 'Changement de joueur...'
  }

  if (gameState.phase === 'game-over') {
    return gameState.winners.length > 1
      ? `🤝 Égalité : ${gameState.winners.map((player) => player.name).join(', ')}`
      : `🎉 ${gameState.winner?.name} gagne ! 🎉`
  }

  if (gameState.phase === 'rolling') {
    return 'Lancer les dés'
  }

  if (gameState.phase === 'active-selection') {
    return 'Tour du joueur actif'
  }

  if (gameState.phase === 'passive-selection') {
    return 'Tour des joueurs passifs'
  }

  return null
}

export const getGameStatusLabel = (gameState: GameState) => {
  if (gameState.phase === 'player-switching') {
    return 'Changement...'
  }

  if (gameState.phase === 'game-over') {
    return gameState.winners.length > 1 ? 'Égalité' : `${gameState.winner?.name} gagne !`
  }

  if (gameState.phase === 'rolling') {
    return 'Lancer dés'
  }

  if (gameState.phase === 'active-selection') {
    return 'Joueur actif'
  }

  if (gameState.phase === 'passive-selection') {
    return 'Joueurs passifs'
  }

  return 'En cours'
}
