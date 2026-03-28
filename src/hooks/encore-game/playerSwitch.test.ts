import { describe, expect, it } from 'vitest'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import type { GameColor, GameState, Player, Square } from '@/types/game'

import { resolvePlayerSwitch, shouldAnimatePlayerSwitch } from './playerSwitch'

const makeBoard = (colors: GameColor[][]): Square[][] =>
  colors.map((row, rowIndex) =>
    row.map((color, colIndex) => ({
      color,
      hasStar: false,
      crossed: false,
      column: String.fromCharCode(65 + colIndex),
      row: rowIndex,
    })),
  )

const mockBoardConfig = (colors: GameColor[][]): BoardConfiguration => ({
  id: 'classic',
  fillClass: 'mock',
  colorLayout: colors,
  starPositions: new Set<string>(),
})

const makePlayer = (id: string, name: string, isAI = false): Player => {
  const colors: GameColor[][] = [
    ['red', 'red', 'blue'],
    ['green', 'yellow', 'orange'],
  ]

  return {
    id,
    name,
    isAI,
    board: makeBoard(colors),
    boardConfiguration: mockBoardConfig(colors),
    starsCollected: 0,
    completedColors: [],
    completedColorsFirst: [],
    completedColorsNotFirst: [],
    completedColumnsFirst: [],
    completedColumnsNotFirst: [],
    jokersRemaining: 2,
  }
}

const createSwitchingState = (overrides: Partial<GameState> = {}): GameState => ({
  players: [makePlayer('p1', 'Player 1'), makePlayer('p2', 'Player 2')],
  currentPlayer: 0,
  activePlayer: 0,
  phase: 'player-switching',
  lastPhase: 'active-selection',
  dice: [],
  selectedDice: { color: null, number: null },
  selectedFromJoker: { color: false, number: false },
  gameStarted: true,
  winner: null,
  winners: [],
  pendingGameOver: false,
  claimedFirstColumnBonus: {},
  claimedFirstColorBonus: {},
  claimedSecondColorBonus: {},
  ...overrides,
})

describe('resolvePlayerSwitch', () => {
  it('animates only when the current player board changes', () => {
    expect(shouldAnimatePlayerSwitch(createSwitchingState())).toBe(true)
    expect(
      shouldAnimatePlayerSwitch(
        createSwitchingState({
          currentPlayer: 1,
          activePlayer: 0,
          lastPhase: 'passive-selection',
        }),
      ),
    ).toBe(false)
  })

  it('moves from active selection to the next passive player', () => {
    const nextState = resolvePlayerSwitch(createSwitchingState())

    expect(nextState.phase).toBe('passive-selection')
    expect(nextState.currentPlayer).toBe(1)
    expect(nextState.activePlayer).toBe(0)
  })

  it('moves from passive selection to the next rolling phase', () => {
    const nextState = resolvePlayerSwitch(
      createSwitchingState({
        currentPlayer: 1,
        activePlayer: 0,
        lastPhase: 'passive-selection',
      }),
    )

    expect(nextState.phase).toBe('rolling')
    expect(nextState.currentPlayer).toBe(1)
    expect(nextState.activePlayer).toBe(1)
  })

  it('finishes the game when the pending game-over flag is set', () => {
    const players = [makePlayer('p1', 'Player 1'), makePlayer('p2', 'Player 2')]
    players[0].completedColorsFirst = ['red']
    players[0].completedColors = ['red']

    const nextState = resolvePlayerSwitch(
      createSwitchingState({
        players,
        currentPlayer: 1,
        activePlayer: 0,
        lastPhase: 'passive-selection',
        pendingGameOver: true,
      }),
    )

    expect(nextState.phase).toBe('game-over')
    expect(nextState.pendingGameOver).toBe(false)
    expect(nextState.winners).toHaveLength(1)
  })
})
