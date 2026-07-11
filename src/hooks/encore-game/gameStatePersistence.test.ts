import { describe, expect, it } from 'vitest'

import type { GameColor, GameState, Player, Square } from '@/types/game'

import {
  parseStoredGameState,
  serializeGameState,
  shouldPersistGameState,
} from './gameStatePersistence'

const createBoard = (colors: GameColor[]): Square[][] => [
  colors.map((color, col) => ({
    color,
    hasStar: false,
    crossed: false,
    column: String.fromCharCode(65 + col),
    row: 0,
  })),
]

const createPlayer = (id: string): Player => ({
  id,
  name: id,
  isAI: false,
  board: createBoard(['red', 'blue']),
  boardConfiguration: {
    id: 'classic',
    fillClass: 'mock',
    colorLayout: [['red', 'blue']],
    starPositions: new Set(['0,1']),
  },
  starsCollected: 2,
  completedColors: ['red'],
  completedColorsFirst: ['red'],
  completedColorsNotFirst: [],
  completedColumnsFirst: ['A'],
  completedColumnsNotFirst: [],
  jokersRemaining: 5,
})

const createGameState = (overrides: Partial<GameState> = {}): GameState => ({
  players: [createPlayer('player-0'), createPlayer('player-1')],
  currentPlayer: 1,
  activePlayer: 0,
  phase: 'passive-selection',
  lastPhase: 'active-selection',
  dice: [{ id: 'color-red', type: 'color', value: 'red', selected: true }],
  selectedDice: { color: null, number: null },
  selectedFromJoker: { color: false, number: false },
  gameStarted: true,
  winner: null,
  winners: [],
  pendingGameOver: false,
  claimedFirstColumnBonus: { A: 'player-0' },
  claimedFirstColorBonus: { red: 'player-0' },
  claimedSecondColorBonus: {},
  ...overrides,
})

describe('serializeGameState / parseStoredGameState', () => {
  it('round-trips a game state including star position sets', () => {
    const state = createGameState()

    const restored = parseStoredGameState(serializeGameState(state))

    expect(restored).toEqual(state)
    expect(restored?.players[0].boardConfiguration.starPositions).toBeInstanceOf(Set)
    expect([...(restored?.players[0].boardConfiguration.starPositions ?? [])]).toEqual(['0,1'])
  })

  it('rejects malformed payloads', () => {
    expect(parseStoredGameState('not json')).toBeNull()
    expect(parseStoredGameState('42')).toBeNull()
    expect(parseStoredGameState('{}')).toBeNull()
    expect(parseStoredGameState(JSON.stringify({ gameStarted: true, players: [] }))).toBeNull()
  })

  it('rejects states with an unknown phase or out-of-range player indexes', () => {
    const gameOver = serializeGameState(createGameState({ phase: 'game-over' }))
    expect(parseStoredGameState(gameOver)).toBeNull()

    const badIndex = serializeGameState(createGameState({ currentPlayer: 2 }))
    expect(parseStoredGameState(badIndex)).toBeNull()
  })

  it('rejects players with corrupted boards', () => {
    const state = createGameState()
    const serialized = serializeGameState(state)
    const tampered = serialized.replace('"red"', '"purple"')

    expect(parseStoredGameState(tampered)).toBeNull()
  })
})

describe('shouldPersistGameState', () => {
  it('persists only started games that are not over', () => {
    expect(shouldPersistGameState(createGameState())).toBe(true)
    expect(shouldPersistGameState(createGameState({ gameStarted: false }))).toBe(false)
    expect(shouldPersistGameState(createGameState({ phase: 'game-over' }))).toBe(false)
  })
})
