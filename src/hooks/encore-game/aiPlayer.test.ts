import { describe, expect, it } from 'vitest'

import type { GameColor, GameState, Player, Square } from '@/types/game'

import { computeBestAIMove } from './aiPlayer'

const createSingleRowBoard = (colors: GameColor[]): Square[][] => [
  colors.map((color, col) => ({
    color,
    hasStar: false,
    crossed: false,
    column: String.fromCharCode(65 + col),
    row: 0,
  })),
]

const createBoard = (rows: GameColor[][]): Square[][] =>
  rows.map((colors, row) =>
    colors.map((color, col) => ({
      color,
      hasStar: false,
      crossed: false,
      column: String.fromCharCode(65 + col),
      row,
    })),
  )

// A single orange square sitting on the start column (index 7).
const orangeOnStartColumnColors: GameColor[] = [
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'orange',
]

const createAIPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-0',
  name: 'AI',
  isAI: true,
  board: createSingleRowBoard(orangeOnStartColumnColors),
  boardConfiguration: {
    id: 'classic',
    fillClass: 'mock',
    colorLayout: [orangeOnStartColumnColors],
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
    )

    expect(move).not.toBeNull()
    expect(move?.squares).toEqual([{ row: 0, col: 7 }])
  })

  it('ignores double-joker combinations when the AI lacks jokers', () => {
    const move = computeBestAIMove(
      createGameState(createAIPlayer({ jokersRemaining: 1 }), [
        { id: 'color-wild', type: 'color', value: 'wild', selected: false },
        { id: 'number-wild', type: 'number', value: 'wild', selected: false },
      ]),
    )

    expect(move).toBeNull()
  })

  // The start column (index 7) sits at the far end of the red component, so
  // the component's scan-order prefix is not a valid selection by itself.
  const startColumnEdgeColors: GameColor[] = [
    'yellow',
    'yellow',
    'yellow',
    'yellow',
    'yellow',
    'red',
    'red',
    'red',
    'yellow',
  ]

  it('finds a move anchored on the start column when the component prefix is invalid', () => {
    const move = computeBestAIMove(
      createGameState(createAIPlayer({ board: createSingleRowBoard(startColumnEdgeColors) }), [
        { id: 'color-red', type: 'color', value: 'red', selected: false },
        { id: 'number-1', type: 'number', value: 1, selected: false },
      ]),
    )

    expect(move?.squares).toEqual([{ row: 0, col: 7 }])
  })

  it('finds a multi-square move reaching the start column when the component prefix is invalid', () => {
    const move = computeBestAIMove(
      createGameState(createAIPlayer({ board: createSingleRowBoard(startColumnEdgeColors) }), [
        { id: 'color-red', type: 'color', value: 'red', selected: false },
        { id: 'number-2', type: 'number', value: 2, selected: false },
      ]),
    )

    expect(move).not.toBeNull()
    expect(new Set(move?.squares.map((square) => square.col))).toEqual(new Set([6, 7]))
  })

  it('still skips when no selection can reach the start column or a crossed square', () => {
    const colors: GameColor[] = [
      'yellow',
      'yellow',
      'yellow',
      'yellow',
      'red',
      'red',
      'yellow',
      'yellow',
      'yellow',
    ]
    const move = computeBestAIMove(
      createGameState(createAIPlayer({ board: createSingleRowBoard(colors) }), [
        { id: 'color-red', type: 'color', value: 'red', selected: false },
        { id: 'number-2', type: 'number', value: 2, selected: false },
      ]),
    )

    expect(move).toBeNull()
  })

  // Two reds on the start column, reachable with either the real "2" die or the
  // wild number die. A second row keeps the columns from completing so the two
  // moves are otherwise equivalent; the AI should keep its joker.
  const twoRedBoard = createBoard([
    ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'red', 'red'],
    ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
  ])

  it('prefers the real number die over the wild one for an equivalent move', () => {
    const move = computeBestAIMove(
      createGameState(createAIPlayer({ board: twoRedBoard }), [
        { id: 'color-red', type: 'color', value: 'red', selected: false },
        { id: 'number-wild', type: 'number', value: 'wild', selected: false },
        { id: 'number-2', type: 'number', value: 2, selected: false },
      ]),
    )

    expect(move?.number.value).toBe(2)
    expect(new Set(move?.squares.map((square) => square.col))).toEqual(new Set([6, 7]))
  })

  it('still spends a joker when it is the only way to move', () => {
    const move = computeBestAIMove(
      createGameState(createAIPlayer({ board: twoRedBoard }), [
        { id: 'color-red', type: 'color', value: 'red', selected: false },
        { id: 'number-wild', type: 'number', value: 'wild', selected: false },
      ]),
    )

    expect(move?.number.value).toBe('wild')
    expect(new Set(move?.squares.map((square) => square.col))).toEqual(new Set([6, 7]))
  })
})
