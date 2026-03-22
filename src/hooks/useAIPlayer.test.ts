import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { GameState, Player, Square } from '@/types/game'

import { useAIPlayer } from './useAIPlayer'

const orangeOnlyBoard: Square[][] = [
  [
    {
      color: 'orange',
      hasStar: false,
      crossed: false,
      column: 'A',
      row: 0,
    },
  ],
]

const aiPlayer: Player = {
  id: 'player-0',
  name: 'AI',
  isAI: true,
  board: orangeOnlyBoard,
  boardConfiguration: {
    id: 'classic',
    fillClass: 'mock',
    colorLayout: [['orange']],
    starPositions: new Set<string>(),
  },
  starsCollected: 0,
  completedColors: [],
  completedColorsFirst: [],
  completedColorsNotFirst: [],
  completedColumnsFirst: [],
  completedColumnsNotFirst: [],
  jokersRemaining: 1,
}

const gameState: GameState = {
  players: [aiPlayer],
  currentPlayer: 0,
  activePlayer: 0,
  phase: 'active-selection-ai',
  dice: [
    { id: 'color-wild', type: 'color', value: 'wild', selected: false },
    { id: 'number-1', type: 'number', value: 1, selected: false },
  ],
  selectedDice: { color: null, number: null },
  selectedFromJoker: { color: false, number: false },
  gameStarted: true,
  winner: null,
  winners: [],
  pendingGameOver: false,
  claimedFirstColumnBonus: {},
  claimedFirstColorBonus: {},
  claimedSecondColorBonus: {},
}

describe('useAIPlayer', () => {
  it('considers orange when the color die is wild', () => {
    const { result } = renderHook(() => useAIPlayer())

    const move = result.current.makeAIMove(
      gameState,
      (squares, color, board) =>
        color === 'orange' &&
        squares.length === 1 &&
        board[squares[0].row][squares[0].col].color === 'orange',
    )

    expect(move).not.toBeNull()
    expect(move?.squares).toEqual([{ row: 0, col: 0 }])
  })
})
