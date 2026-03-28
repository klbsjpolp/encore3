import { describe, expect, it } from 'vitest'

import type { GameState, Player, Square } from '@/types/game'

import { computeBestAIMove } from './aiPlayer'

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

const createAIPlayer = (overrides: Partial<Player> = {}): Player => ({
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
  ...overrides,
})

const createGameState = (player: Player, dice: GameState['dice']): GameState => ({
  players: [player],
  currentPlayer: 0,
  activePlayer: 0,
  phase: 'active-selection-ai',
  dice,
  selectedDice: { color: null, number: null },
  selectedFromJoker: { color: false, number: false },
  gameStarted: true,
  winner: null,
  winners: [],
  pendingGameOver: false,
  claimedFirstColumnBonus: {},
  claimedFirstColorBonus: {},
  claimedSecondColorBonus: {},
})

describe('computeBestAIMove', () => {
  it('considers orange when the color die is wild', () => {
    const move = computeBestAIMove(
      createGameState(createAIPlayer(), [
        { id: 'color-wild', type: 'color', value: 'wild', selected: false },
        { id: 'number-1', type: 'number', value: 1, selected: false },
      ]),
      (squares, color, board) =>
        color === 'orange' &&
        squares.length === 1 &&
        board[squares[0].row][squares[0].col].color === 'orange',
    )

    expect(move).not.toBeNull()
    expect(move?.squares).toEqual([{ row: 0, col: 0 }])
  })

  it('ignores double-joker combinations when the AI lacks jokers', () => {
    const move = computeBestAIMove(
      createGameState(createAIPlayer({ jokersRemaining: 1 }), [
        { id: 'color-wild', type: 'color', value: 'wild', selected: false },
        { id: 'number-wild', type: 'number', value: 'wild', selected: false },
      ]),
      () => true,
    )

    expect(move).toBeNull()
  })
})
