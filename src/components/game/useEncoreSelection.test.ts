import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import type { GameState, Player, Square } from '@/types/game'

import { useEncoreSelection } from './useEncoreSelection'

const boardConfiguration: BoardConfiguration = {
  id: 'classic',
  fillClass: 'bg-slate-900',
  colorLayout: [
    ['orange', 'orange'],
    ['blue', 'blue'],
  ],
  starPositions: new Set<string>(),
}

const createBoard = (): Square[][] => [
  [
    { color: 'orange', hasStar: false, crossed: false, column: 'A', row: 0 },
    { color: 'orange', hasStar: false, crossed: false, column: 'B', row: 0 },
  ],
  [
    { color: 'blue', hasStar: false, crossed: false, column: 'A', row: 1 },
    { color: 'blue', hasStar: false, crossed: false, column: 'B', row: 1 },
  ],
]

const createPlayer = (): Player => ({
  id: 'p1',
  name: 'Player 1',
  isAI: false,
  board: createBoard(),
  boardConfiguration,
  starsCollected: 0,
  completedColors: [],
  completedColorsFirst: [],
  completedColorsNotFirst: [],
  completedColumnsFirst: [],
  completedColumnsNotFirst: [],
  jokersRemaining: 8,
})

const createGameState = (): GameState => ({
  players: [createPlayer()],
  currentPlayer: 0,
  activePlayer: 0,
  phase: 'active-selection',
  dice: [],
  selectedDice: {
    color: { id: 'color-1', type: 'color', value: 'orange', selected: true },
    number: { id: 'number-1', type: 'number', value: 2, selected: true },
  },
  selectedFromJoker: { color: false, number: false },
  gameStarted: true,
  winner: null,
  winners: [],
  pendingGameOver: false,
  claimedFirstColumnBonus: {},
  claimedFirstColorBonus: {},
  claimedSecondColorBonus: {},
})

describe('useEncoreSelection', () => {
  it('selects a valid connected group and confirms the move', () => {
    const makeMove = vi.fn()
    const skipTurn = vi.fn()
    const isValidMove = vi.fn(() => true)

    const { result } = renderHook(() =>
      useEncoreSelection({
        gameState: createGameState(),
        makeMove,
        skipTurn,
        isValidMove,
      }),
    )

    act(() => {
      result.current.handleSquareClick(0, 0)
    })

    expect(result.current.selectedSquares).toHaveLength(2)
    expect(result.current.canMakeMove()).toBe(true)

    act(() => {
      result.current.handleConfirmMove()
    })

    expect(makeMove).toHaveBeenCalledTimes(1)
    expect(makeMove).toHaveBeenCalledWith(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    )
    expect(result.current.selectedSquares).toEqual([])
    expect(skipTurn).not.toHaveBeenCalled()
  })

  it('clears selection when skipping turn', () => {
    const makeMove = vi.fn()
    const skipTurn = vi.fn()
    const isValidMove = vi.fn(() => true)

    const { result } = renderHook(() =>
      useEncoreSelection({
        gameState: createGameState(),
        makeMove,
        skipTurn,
        isValidMove,
      }),
    )

    act(() => {
      result.current.handleSquareClick(0, 0)
    })
    expect(result.current.selectedSquares).toHaveLength(2)

    act(() => {
      result.current.onSkipTurn()
    })

    expect(skipTurn).toHaveBeenCalledTimes(1)
    expect(result.current.selectedSquares).toEqual([])
  })
})
