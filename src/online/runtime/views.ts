import type { GameState } from '@/types/game'

/**
 * Payload broadcast by the host inside `relay { kind: 'view' }`. Encore is an
 * open-information game — every board and die is public — so unlike hidden-hand
 * games there is nothing to redact: the host relays the full authoritative game
 * state and each client renders it relative to its own seat.
 */
export interface EncoreGameView {
  gameState: GameState
  activeSeatIndices: number[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// Structural check on the fields the renderer and reducers actually index into.
// Enough of a Player that `players[i].jokersRemaining` / `.board` / the
// completed-column lookups can't throw on a peer-relayed payload.
const isPlayerLike = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.jokersRemaining === 'number' &&
  Array.isArray(value.board) &&
  Array.isArray(value.completedColumnsFirst) &&
  Array.isArray(value.completedColumnsNotFirst) &&
  Array.isArray(value.completedColors) &&
  Array.isArray(value.completedColorsFirst) &&
  Array.isArray(value.completedColorsNotFirst)

// Peer-relayed views/snapshots come from another client's browser (the relay
// server only forwards opaque payloads), so a malformed or version-skewed
// payload is validated (and dropped) here rather than throwing deep inside a
// render/reducer path.
const isGameStateLike = (value: unknown): value is GameState => {
  if (!isRecord(value)) {
    return false
  }
  return (
    Array.isArray(value.players) &&
    value.players.every(isPlayerLike) &&
    Array.isArray(value.dice) &&
    typeof value.phase === 'string' &&
    typeof value.currentPlayer === 'number' &&
    typeof value.activePlayer === 'number' &&
    isRecord(value.selectedDice)
  )
}

export const isEncoreGameView = (value: unknown): value is EncoreGameView => {
  if (
    !isRecord(value) ||
    !isGameStateLike(value.gameState) ||
    !Array.isArray(value.activeSeatIndices)
  ) {
    return false
  }
  // A player array shorter than the seating would leave `players[mySeat]`
  // undefined even when `currentPlayer` looks valid — reject that mismatch.
  return (
    value.activeSeatIndices.every((seat) => typeof seat === 'number') &&
    value.gameState.players.length === value.activeSeatIndices.length
  )
}

export { isGameStateLike }
