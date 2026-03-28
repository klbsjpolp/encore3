import type { GameState, Player } from '@/types/game'

import { determineWinners } from './scoring'

export const PLAYER_SWITCH_ANIMATION_DELAY_MS = 400
export const PLAYER_SWITCH_ANIMATION_DURATION_MS = 200
export const PLAYER_SWITCH_DELAY_MS =
  PLAYER_SWITCH_ANIMATION_DELAY_MS + PLAYER_SWITCH_ANIMATION_DURATION_MS

const getWinnerState = (players: Player[]) => {
  const winners = determineWinners(players)

  return {
    winner: winners.length === 1 ? winners[0] : null,
    winners,
  }
}

const resolveGameOverOrNextRoll = (state: GameState, nextActivePlayer: number): GameState => {
  if (state.pendingGameOver) {
    return {
      ...state,
      phase: 'game-over',
      pendingGameOver: false,
      ...getWinnerState(state.players),
    }
  }

  const nextPlayer = state.players[nextActivePlayer]

  return {
    ...state,
    phase: nextPlayer.isAI ? 'rolling-ai' : 'rolling',
    currentPlayer: nextActivePlayer,
    activePlayer: nextActivePlayer,
  }
}

export const resolvePlayerSwitch = (state: GameState): GameState => {
  if (state.phase !== 'player-switching') {
    return state
  }

  const { players, currentPlayer, activePlayer, lastPhase } = state

  if (lastPhase === 'active-selection' || lastPhase === 'active-selection-ai') {
    const nextPlayerIndex = (activePlayer + 1) % players.length

    if (nextPlayerIndex === activePlayer) {
      return resolveGameOverOrNextRoll(state, activePlayer)
    }

    const nextPlayer = players[nextPlayerIndex]

    return {
      ...state,
      phase: nextPlayer.isAI ? 'passive-selection-ai' : 'passive-selection',
      currentPlayer: nextPlayerIndex,
    }
  }

  if (lastPhase === 'passive-selection' || lastPhase === 'passive-selection-ai') {
    const nextPlayerIndex = (currentPlayer + 1) % players.length

    if (nextPlayerIndex === activePlayer) {
      return resolveGameOverOrNextRoll(state, (activePlayer + 1) % players.length)
    }

    const nextPlayer = players[nextPlayerIndex]

    return {
      ...state,
      phase: nextPlayer.isAI ? 'passive-selection-ai' : 'passive-selection',
      currentPlayer: nextPlayerIndex,
    }
  }

  return state
}

export const shouldAnimatePlayerSwitch = (state: GameState): boolean => {
  if (state.phase !== 'player-switching') {
    return false
  }

  return resolvePlayerSwitch(state).currentPlayer !== state.currentPlayer
}
