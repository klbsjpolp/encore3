import { describe, expect, it } from 'vitest'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import type {
  ColorDiceResult,
  GameColor,
  GameState,
  NumberDiceResult,
  Player,
  Square,
} from '@/types/game'

import { advanceStateOnSkip, advanceStateWithMove } from './advance'

const COLORS: GameColor[] = [
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'red',
]

const boardConfiguration: BoardConfiguration = {
  id: 'classic',
  fillClass: 'mock',
  colorLayout: [COLORS],
  starPositions: new Set<string>(),
}

const createPlayer = (id: string): Player => ({
  id,
  name: id,
  isAI: false,
  board: [
    COLORS.map((color, col) => ({
      color,
      hasStar: false,
      crossed: false,
      column: String.fromCharCode(65 + col),
      row: 0,
    })),
  ] as Square[][],
  boardConfiguration,
  starsCollected: 0,
  completedColors: [],
  completedColorsFirst: [],
  completedColorsNotFirst: [],
  completedColumnsFirst: [],
  completedColumnsNotFirst: [],
  jokersRemaining: 8,
})

const redDie: ColorDiceResult = { id: 'c-red', type: 'color', value: 'red', selected: false }
const oneDie: NumberDiceResult = { id: 'n-1', type: 'number', value: 1, selected: false }

const createState = (phase: GameState['phase']): GameState => ({
  players: [createPlayer('player-0'), createPlayer('player-1')],
  currentPlayer: 0,
  activePlayer: 0,
  phase,
  lastPhase: 'rolling',
  dice: [{ ...redDie }, { ...oneDie }],
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

describe('advanceStateWithMove', () => {
  it('applies the placement, marks active dice, and enters player-switching', () => {
    const next = advanceStateWithMove(
      createState('active-selection'),
      [{ row: 0, col: 7 }],
      {
        color: redDie,
        number: oneDie,
      },
      { color: false, number: false },
    )

    expect(next).not.toBeNull()
    expect(next?.players[0].board[0][7].crossed).toBe(true)
    expect(next?.dice.find((die) => die.id === 'c-red')?.selected).toBe(true)
    expect(next?.dice.find((die) => die.id === 'n-1')?.selected).toBe(true)
    expect(next?.phase).toBe('player-switching')
    expect(next?.lastPhase).toBe('active-selection')
    expect(next?.selectedDice).toEqual({ color: null, number: null })
  })

  it('does not mark dice as used during passive selection', () => {
    const next = advanceStateWithMove(
      createState('passive-selection'),
      [{ row: 0, col: 7 }],
      {
        color: redDie,
        number: oneDie,
      },
      { color: false, number: false },
    )

    expect(next?.dice.every((die) => !die.selected)).toBe(true)
  })

  it('returns null for an illegal placement', () => {
    const next = advanceStateWithMove(
      createState('active-selection'),
      [
        { row: 0, col: 7 },
        { row: 0, col: 6 },
      ],
      { color: redDie, number: oneDie },
      { color: false, number: false },
    )

    expect(next).toBeNull()
  })
})

describe('advanceStateOnSkip', () => {
  it('hands the turn off and clears the selection', () => {
    const next = advanceStateOnSkip(createState('passive-selection'))
    expect(next.phase).toBe('player-switching')
    expect(next.lastPhase).toBe('passive-selection')
    expect(next.selectedDice).toEqual({ color: null, number: null })
    expect(next.selectedFromJoker).toEqual({ color: false, number: false })
  })
})
