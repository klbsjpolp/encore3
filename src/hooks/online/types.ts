import type { RoomSummary } from '@klbsjpolp/realtime-core'

import type { EncoreGameView } from '@/online/runtime/views'
import type { GameState } from '@/types/game'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

/** Opaque blob the host stores on the server for its own reconnection. */
export interface HostSnapshotPayload {
  state: GameState
  activeSeatIndices: number[]
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
