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
