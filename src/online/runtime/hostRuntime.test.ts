import { describe, expect, it } from 'vitest'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import type { DiceResult, GameColor, GameState, Player, Square } from '@/types/game'

import { EncoreHost } from './hostRuntime'

// Single-row board: yellow everywhere except a red square on the start column
// (index 7), which is always adjacency-valid.
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

const createBoard = (): Square[][] => [
  COLORS.map((color, col) => ({
    color,
    hasStar: false,
    crossed: false,
    column: String.fromCharCode(65 + col),
    row: 0,
  })),
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

const dice: DiceResult[] = [
  { id: 'c-red', type: 'color', value: 'red', selected: false },
  { id: 'c-red2', type: 'color', value: 'red', selected: false },
  { id: 'n-1', type: 'number', value: 1, selected: false },
  { id: 'n-1b', type: 'number', value: 1, selected: false },
]

const createSelectionState = (): GameState => ({
  players: [createPlayer('player-0'), createPlayer('player-1')],
  currentPlayer: 0,
  activePlayer: 0,
  phase: 'active-selection',
  lastPhase: 'rolling',
  dice: dice.map((die) => ({ ...die })),
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

describe('EncoreHost', () => {
  it('maps abstract seats to player-array indices', () => {
    const host = EncoreHost.create({ activeSeatIndices: [2, 0] })
    expect(host.seatToPlayerIndex(2)).toBe(0)
    expect(host.seatToPlayerIndex(0)).toBe(1)
    expect(host.seatToPlayerIndex(3)).toBe(-1)
    expect(host.playerIndexToSeat(0)).toBe(2)
    expect(host.currentSeatIndex()).toBe(2)
  })

  it('rejects actions from a seat that is not seated', () => {
    const host = EncoreHost.create({ activeSeatIndices: [0, 1] })
    const result = host.applyAction(3, { type: 'ROLL' })
    expect(result.ok).toBe(false)
  })

  it('rejects an action when it is not the seat’s turn', () => {
    const host = EncoreHost.create({ activeSeatIndices: [0, 1] })
    const result = host.applyAction(1, { type: 'ROLL' })
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('rolls six dice for the active seat and enters active-selection', () => {
    const host = EncoreHost.create({ activeSeatIndices: [0, 1] })
    const result = host.applyAction(0, { type: 'ROLL' })
    expect(result.ok).toBe(true)
    expect(host.getState().phase).toBe('active-selection')
    expect(host.getState().dice).toHaveLength(6)
  })

  it('does not allow rolling twice in the same turn', () => {
    const host = EncoreHost.create({ activeSeatIndices: [0, 1] })
    host.applyAction(0, { type: 'ROLL' })
    const result = host.applyAction(0, { type: 'ROLL' })
    expect(result.ok).toBe(false)
  })

  it('applies an active move, marks the used dice, then hands off to the passive seat', () => {
    const host = EncoreHost.fromSnapshot(createSelectionState(), [0, 1])
    const result = host.applyAction(0, {
      type: 'MOVE',
      colorDiceId: 'c-red',
      numberDiceId: 'n-1',
      squares: [{ row: 0, col: 7 }],
    })

    expect(result.ok).toBe(true)
    const state = host.getState()
    expect(state.players[0].board[0][7].crossed).toBe(true)
    expect(state.dice.find((die) => die.id === 'c-red')?.selected).toBe(true)
    expect(state.dice.find((die) => die.id === 'n-1')?.selected).toBe(true)
    expect(state.phase).toBe('passive-selection')
    expect(state.currentPlayer).toBe(1)
    expect(host.currentSeatIndex()).toBe(1)
  })

  it('rejects a passive move that reuses a die the active player consumed', () => {
    const host = EncoreHost.fromSnapshot(createSelectionState(), [0, 1])
    host.applyAction(0, {
      type: 'MOVE',
      colorDiceId: 'c-red',
      numberDiceId: 'n-1',
      squares: [{ row: 0, col: 7 }],
    })

    const reuse = host.applyAction(1, {
      type: 'MOVE',
      colorDiceId: 'c-red',
      numberDiceId: 'n-1',
      squares: [{ row: 0, col: 7 }],
    })
    expect(reuse.ok).toBe(false)
  })

  it('lets the passive seat use the remaining dice and starts the next round', () => {
    const host = EncoreHost.fromSnapshot(createSelectionState(), [0, 1])
    host.applyAction(0, {
      type: 'MOVE',
      colorDiceId: 'c-red',
      numberDiceId: 'n-1',
      squares: [{ row: 0, col: 7 }],
    })
    const passive = host.applyAction(1, {
      type: 'MOVE',
      colorDiceId: 'c-red2',
      numberDiceId: 'n-1b',
      squares: [{ row: 0, col: 7 }],
    })

    expect(passive.ok).toBe(true)
    const state = host.getState()
    expect(state.players[1].board[0][7].crossed).toBe(true)
    expect(state.phase).toBe('rolling')
    expect(state.activePlayer).toBe(1)
    expect(state.currentPlayer).toBe(1)
  })

  it('rejects an out-of-range move without throwing (network-sourced squares)', () => {
    const host = EncoreHost.fromSnapshot(createSelectionState(), [0, 1])
    const result = host.applyAction(0, {
      type: 'MOVE',
      colorDiceId: 'c-red',
      numberDiceId: 'n-1',
      squares: [{ row: 99, col: 99 }],
    })
    expect(result.ok).toBe(false)
    // State is untouched and the turn pointer still resolves cleanly.
    expect(host.getState().phase).toBe('active-selection')
    expect(host.currentSeatIndex()).toBe(0)
  })

  it('advances the turn on skip', () => {
    const host = EncoreHost.fromSnapshot(createSelectionState(), [0, 1])
    const result = host.applyAction(0, { type: 'SKIP' })
    expect(result.ok).toBe(true)
    expect(host.getState().phase).toBe('passive-selection')
    expect(host.getState().currentPlayer).toBe(1)
  })

  it('reports game over and stops the turn pointer once a game finishes', () => {
    const finishing = createSelectionState()
    finishing.currentPlayer = 1
    finishing.phase = 'passive-selection'
    finishing.pendingGameOver = true
    const host = EncoreHost.fromSnapshot(finishing, [0, 1])

    const result = host.applyAction(1, { type: 'SKIP' })
    expect(result.ok).toBe(true)
    expect(host.gameIsOver).toBe(true)
    expect(host.currentSeatIndex()).toBeNull()
    expect([null, 0, 1]).toContain(host.winnerSeatIndex())
  })
})
