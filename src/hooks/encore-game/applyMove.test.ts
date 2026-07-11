import { describe, expect, it } from 'vitest'

import type {
  ColorDiceResult,
  GameColor,
  GameState,
  NumberDiceResult,
  Player,
  Square,
} from '@/types/game'

import { applyMoveToState } from './applyMove'

const applyMoveOrFail = (...args: Parameters<typeof applyMoveToState>) => {
  const application = applyMoveToState(...args)
  if (!application) {
    throw new Error('Expected a valid move application')
  }
  return application
}

const createSingleRowBoard = (colors: GameColor[], starColumns: number[] = []): Square[][] => [
  colors.map((color, col) => ({
    color,
    hasStar: starColumns.includes(col),
    crossed: false,
    column: String.fromCharCode(65 + col),
    row: 0,
  })),
]

// Yellow everywhere except a lone red square on the start column (index 7).
const defaultColors: GameColor[] = [
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'red',
]

const createPlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
  id,
  name: id,
  isAI: false,
  board: createSingleRowBoard(defaultColors),
  boardConfiguration: {
    id: 'classic',
    fillClass: 'mock',
    colorLayout: [defaultColors],
    starPositions: new Set<string>(),
  },
  starsCollected: 0,
  completedColors: [],
  completedColorsFirst: [],
  completedColorsNotFirst: [],
  completedColumnsFirst: [],
  completedColumnsNotFirst: [],
  jokersRemaining: 2,
  ...overrides,
})

const createGameState = (players: Player[], overrides: Partial<GameState> = {}): GameState => ({
  players,
  currentPlayer: 0,
  activePlayer: 0,
  phase: 'active-selection',
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

const redDie: ColorDiceResult = { id: 'color-red', type: 'color', value: 'red', selected: false }
const wildColorDie: ColorDiceResult = {
  id: 'color-wild',
  type: 'color',
  value: 'wild',
  selected: false,
}
const oneDie: NumberDiceResult = { id: 'number-1', type: 'number', value: 1, selected: false }
const wildNumberDie: NumberDiceResult = {
  id: 'number-wild',
  type: 'number',
  value: 'wild',
  selected: false,
}
const noJokers = { color: false, number: false }

describe('applyMoveToState', () => {
  it('crosses squares, collects stars and claims first column and color bonuses', () => {
    const player = createPlayer('player-0', {
      board: createSingleRowBoard(defaultColors, [7]),
    })
    const state = createGameState([player])

    const application = applyMoveOrFail(
      state,
      [{ row: 0, col: 7 }],
      {
        color: redDie,
        number: oneDie,
      },
      noJokers,
    )

    const updated = application.players[0]
    expect(updated.board[0][7].crossed).toBe(true)
    expect(updated.starsCollected).toBe(1)
    expect(updated.jokersRemaining).toBe(2)
    expect(updated.completedColumnsFirst).toEqual(['H'])
    expect(updated.completedColorsFirst).toEqual(['red'])
    expect(application.claimedFirstColumnBonus).toEqual({ H: 'player-0' })
    expect(application.claimedFirstColorBonus).toEqual({ red: 'player-0' })
    expect(application.pendingGameOver).toBe(false)
  })

  it('grants not-first bonuses when another player claimed them and flags pending game over', () => {
    const player = createPlayer('player-1', {
      completedColors: ['blue'],
      completedColorsFirst: ['blue'],
    })
    const state = createGameState([createPlayer('player-0'), player], {
      currentPlayer: 1,
      claimedFirstColumnBonus: { H: 'player-0' },
      claimedFirstColorBonus: { red: 'player-0' },
    })

    const application = applyMoveOrFail(
      state,
      [{ row: 0, col: 7 }],
      {
        color: redDie,
        number: oneDie,
      },
      noJokers,
    )

    const updated = application.players[1]
    expect(updated.completedColumnsNotFirst).toEqual(['H'])
    expect(updated.completedColorsNotFirst).toEqual(['red'])
    expect(application.claimedSecondColorBonus).toEqual({ red: 'player-1' })
    expect(application.pendingGameOver).toBe(true)
  })

  it('resolves wild dice from the selection and spends jokers', () => {
    const state = createGameState([createPlayer('player-0')])

    const application = applyMoveOrFail(
      state,
      [{ row: 0, col: 7 }],
      {
        color: wildColorDie,
        number: wildNumberDie,
      },
      { color: true, number: true },
    )

    const updated = application.players[0]
    expect(updated.board[0][7].crossed).toBe(true)
    expect(updated.jokersRemaining).toBe(0)
    expect(application.claimedFirstColorBonus).toEqual({ red: 'player-0' })
  })

  it('returns null for an invalid selection or missing jokers', () => {
    const state = createGameState([createPlayer('player-0', { jokersRemaining: 1 })])

    // Selection size does not match the number die.
    expect(
      applyMoveToState(
        state,
        [
          { row: 0, col: 7 },
          { row: 0, col: 6 },
        ],
        {
          color: redDie,
          number: oneDie,
        },
        noJokers,
      ),
    ).toBeNull()

    // Selection does not touch the start column or a crossed square.
    expect(
      applyMoveToState(
        state,
        [{ row: 0, col: 0 }],
        {
          color: { ...redDie, value: 'yellow' },
          number: oneDie,
        },
        noJokers,
      ),
    ).toBeNull()

    // Two jokers needed but only one remaining.
    expect(
      applyMoveToState(
        state,
        [{ row: 0, col: 7 }],
        {
          color: wildColorDie,
          number: wildNumberDie,
        },
        { color: true, number: true },
      ),
    ).toBeNull()
  })
})
