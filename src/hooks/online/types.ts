import type { RoomSummary } from '@klbsjpolp/realtime-core'

import type { EncoreGameView } from '@/online/runtime/views'
import { isGameStateLike } from '@/online/runtime/views'
import type { GameState } from '@/types/game'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

/** Opaque blob the host stores on the server for its own reconnection. */
export interface HostSnapshotPayload {
  state: GameState
  activeSeatIndices: number[]
}

// The snapshot is data the host itself stored server-side, but the persisted
// schema could drift from the client's GameState across a deploy — validate its
// shape before rebuilding a runtime from it instead of failing deep in a reducer.
export const isHostSnapshotPayload = (value: unknown): value is HostSnapshotPayload => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    isGameStateLike(candidate.state) &&
    Array.isArray(candidate.activeSeatIndices) &&
    candidate.activeSeatIndices.every((seat) => typeof seat === 'number')
  )
}

/** Room metadata the host needs, derived from the server's presence updates. */
export interface HostRoomMeta {
  connectedSeats: number[]
  hostSeatIndex: number
  lobbySeats: RoomSummary['lobbySeats']
  status: RoomSummary['status']
}

export const toRoomMeta = (room: RoomSummary): HostRoomMeta => ({
  connectedSeats: room.connectedSeats,
  hostSeatIndex: room.hostSeatIndex,
  lobbySeats: room.lobbySeats,
  status: room.status,
})

export type { EncoreGameView }
