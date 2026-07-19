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

// Shallow structural check on the fields the renderer and reducers actually
// index into. Peer-relayed views/snapshots come from another client's browser,
// so a malformed or version-skewed payload is validated (and dropped) here
// rather than throwing deep inside a render/reducer path.
const isGameStateLike = (value: unknown): value is GameState => {
  if (!isRecord(value)) {
    return false
  }
  return (
    Array.isArray(value.players) &&
    Array.isArray(value.dice) &&
    typeof value.phase === 'string' &&
    typeof value.currentPlayer === 'number' &&
    typeof value.activePlayer === 'number' &&
    isRecord(value.selectedDice)
  )
}

export const isEncoreGameView = (value: unknown): value is EncoreGameView =>
  isRecord(value) &&
  isGameStateLike(value.gameState) &&
  Array.isArray(value.activeSeatIndices) &&
  value.activeSeatIndices.every((seat) => typeof seat === 'number')

export { isGameStateLike }
