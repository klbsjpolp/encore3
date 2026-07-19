import { describe, expect, it } from 'vitest'

import { isEncoreGameView } from './views'

const playerLike = (id: string) => ({
  id,
  name: id,
  isAI: false,
  board: [],
  boardConfiguration: undefined,
  starsCollected: 0,
  completedColors: [],
  completedColorsFirst: [],
  completedColorsNotFirst: [],
  completedColumnsFirst: [],
  completedColumnsNotFirst: [],
  jokersRemaining: 8,
})

const gameStateLike = (playerIds: string[]) => ({
  players: playerIds.map(playerLike),
  currentPlayer: 0,
  activePlayer: 0,
  phase: 'rolling',
  dice: [],
  selectedDice: { color: null, number: null },
  selectedFromJoker: { color: false, number: false },
  gameStarted: true,
  winner: null,
  winners: [],
  pendingGameOver: false,
})

describe('isEncoreGameView', () => {
  it('accepts a well-formed view', () => {
    expect(
      isEncoreGameView({
        gameState: gameStateLike(['player-0', 'player-1']),
        activeSeatIndices: [0, 1],
      }),
    ).toBe(true)
  })

  it('rejects a non-object payload', () => {
    expect(isEncoreGameView(null)).toBe(false)
    expect(isEncoreGameView('view')).toBe(false)
  })

  it('rejects a game state missing core fields', () => {
    expect(isEncoreGameView({ gameState: { phase: 'rolling' }, activeSeatIndices: [0, 1] })).toBe(
      false,
    )
  })

  it('rejects players that are not Player-shaped', () => {
    const view = {
      gameState: {
        ...gameStateLike(['player-0', 'player-1']),
        players: [{ id: 'x' }, { id: 'y' }],
      },
      activeSeatIndices: [0, 1],
    }
    expect(isEncoreGameView(view)).toBe(false)
  })

  it('rejects a players array shorter than the seating', () => {
    expect(
      isEncoreGameView({ gameState: gameStateLike(['player-0']), activeSeatIndices: [0, 1] }),
    ).toBe(false)
  })

  it('rejects non-numeric seat indices', () => {
    expect(
      isEncoreGameView({
        gameState: gameStateLike(['player-0', 'player-1']),
        activeSeatIndices: [0, 'x'],
      }),
    ).toBe(false)
  })
})
