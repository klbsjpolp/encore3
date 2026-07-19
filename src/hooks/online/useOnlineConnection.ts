import {
  getDefaultPlayerName,
  normalizePlayerName,
  PROTOCOL_VERSION,
  type RoomSession,
  type RoomSummary,
  type ServerMessage,
} from '@klbsjpolp/realtime-core'
import { type Dispatch, type RefObject, type SetStateAction, useEffect, useRef } from 'react'

import { parseEncoreAction } from '@/online/runtime/actionSchema'
import { EncoreHost } from '@/online/runtime/hostRuntime'
import type { EncoreGameView } from '@/online/runtime/views'
import { clearOnlineSession } from '@/online/session'
import { RECONNECT_DELAYS_MS, WEBSOCKET_PING_INTERVAL_MS } from '@/online/timing'

import {
  type ConnectionStatus,
  type HostRoomMeta,
  type HostSnapshotPayload,
  toRoomMeta,
} from './types'

export interface UseOnlineConnectionParams {
  session: RoomSession | null
  // Shared refs owned by the host hook.
  websocketRef: RefObject<WebSocket | null>
  viewRef: RefObject<EncoreGameView | null>
  hostRef: RefObject<EncoreHost | null>
  roomMetaRef: RefObject<HostRoomMeta | null>
  activeSeatIndicesRef: RefObject<number[]>
  lastBroadcastTurnRef: RefObject<number | null>
  intentionalLeaveRef: RefObject<boolean>
  // Collaborators owned by the host hook.
  ingestView: (incomingView: EncoreGameView) => void
  pushAuthority: () => void
  sendRelay: (kind: 'move' | 'event' | 'view', payload: unknown, toSeats?: number[]) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setLastError: (error: string | null) => void
  setRoomSummary: Dispatch<SetStateAction<RoomSummary | null>>
  setLobbyRemovalReason: (reason: 'host-left' | 'kicked' | null) => void
}

const buildHostFromLobby = (activeSeatIndices: number[], meta: HostRoomMeta | null): EncoreHost => {
  const playerNames = activeSeatIndices.map((seat) => {
    const displayName = meta?.lobbySeats.find(
      (lobbySeat) => lobbySeat.seatIndex === seat,
    )?.displayName
    return normalizePlayerName(displayName) ?? getDefaultPlayerName(seat)
  })

  return EncoreHost.create({ activeSeatIndices, playerNames })
}

/**
 * Owns the WebSocket lifecycle for an online session: opening the socket,
 * authenticating, the ping keepalive, exponential-backoff reconnect, and
 * routing each server message to the host hook's collaborators. Re-runs only
 * when the session changes; the collaborators are read through a synced ref so
 * a re-render does not tear down a live socket.
 */
export function useOnlineConnection(params: UseOnlineConnectionParams): void {
  const { session } = params

  const paramsRef = useRef(params)
  useEffect(() => {
    paramsRef.current = params
  })

  const pingIntervalRef = useRef<number | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const {
      websocketRef,
      viewRef,
      hostRef,
      roomMetaRef,
      activeSeatIndicesRef,
      lastBroadcastTurnRef,
      intentionalLeaveRef,
      ingestView,
      pushAuthority,
      sendRelay,
      setConnectionStatus,
      setLastError,
      setRoomSummary,
      setLobbyRemovalReason,
    } = paramsRef.current

    const clearPingInterval = () => {
      if (pingIntervalRef.current !== null) {
        window.clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
    }

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    if (!session) {
      clearReconnectTimeout()
      clearPingInterval()
      websocketRef.current?.close()
      websocketRef.current = null
      viewRef.current = null
      hostRef.current = null
      roomMetaRef.current = null
      activeSeatIndicesRef.current = []
      lastBroadcastTurnRef.current = null
      return
    }

    const activeSession = session
    const localIsHost = activeSession.seatIndex === activeSession.hostSeatIndex
    viewRef.current = null
    intentionalLeaveRef.current = false
    hostRef.current = null
    roomMetaRef.current = null
    activeSeatIndicesRef.current = []
    lastBroadcastTurnRef.current = null

    let socket: WebSocket | null = null
    let isCancelled = false
    let reconnectAttempt = 0
    const isCurrentSocket = (candidate: WebSocket): boolean => websocketRef.current === candidate

    const startPingLoop = (currentSocket: WebSocket) => {
      clearPingInterval()
      pingIntervalRef.current = window.setInterval(() => {
        if (!isCurrentSocket(currentSocket) || currentSocket.readyState !== WebSocket.OPEN) {
          return
        }
        currentSocket.send(JSON.stringify({ type: 'ping' }))
      }, WEBSOCKET_PING_INTERVAL_MS)
    }

    const scheduleReconnect = () => {
      if (isCancelled || reconnectTimeoutRef.current !== null) {
        return
      }
      const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)]
      reconnectAttempt += 1
      setConnectionStatus('connecting')
      clearPingInterval()
      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectTimeoutRef.current = null
        connect()
      }, delay)
    }

    const connect = () => {
      if (isCancelled) {
        return
      }

      const currentSocket = new WebSocket(activeSession.wsUrl)
      socket = currentSocket
      websocketRef.current = currentSocket
      let resyncRequested = false

      currentSocket.addEventListener('open', () => {
        if (!isCurrentSocket(currentSocket)) {
          return
        }
        reconnectAttempt = 0
        currentSocket.send(
          JSON.stringify({
            type: 'auth',
            protocolVersion: PROTOCOL_VERSION,
            roomCode: activeSession.roomCode,
            seatIndex: activeSession.seatIndex,
            seatToken: activeSession.seatToken,
          }),
        )
        startPingLoop(currentSocket)
      })

      currentSocket.addEventListener('message', (event) => {
        if (!isCurrentSocket(currentSocket) || typeof event.data !== 'string') {
          return
        }

        let message: ServerMessage
        try {
          message = JSON.parse(event.data) as ServerMessage
        } catch (error) {
          console.warn('Failed to parse websocket message:', error)
          return
        }

        switch (message.type) {
          case 'gameStarted': {
            setConnectionStatus('connected')
            setLastError(null)
            activeSeatIndicesRef.current = message.activeSeatIndices
            lastBroadcastTurnRef.current = message.currentSeatIndex

            if (localIsHost) {
              const host = buildHostFromLobby(message.activeSeatIndices, roomMetaRef.current)
              hostRef.current = host
              ingestView(host.getView())
              pushAuthority()
            }
            break
          }
          case 'snapshotRestore': {
            if (localIsHost && message.payload) {
              const payload = message.payload as HostSnapshotPayload
              activeSeatIndicesRef.current = payload.activeSeatIndices
              const host = EncoreHost.fromSnapshot(payload.state, payload.activeSeatIndices)
              hostRef.current = host
              lastBroadcastTurnRef.current = host.currentSeatIndex()
              ingestView(host.getView())
              pushAuthority()
            }
            break
          }
          case 'relayed': {
            if (localIsHost) {
              const host = hostRef.current
              if (!host) {
                break
              }

              if (message.kind === 'move') {
                const action = parseEncoreAction(message.payload)
                if (!action) {
                  break
                }
                const result = host.applyAction(message.fromSeat, action)
                if (result.ok) {
                  ingestView(host.getView())
                  pushAuthority()
                } else {
                  // Correct the offending guest with the authoritative view.
                  sendRelay('view', host.getView(), [message.fromSeat])
                }
              } else if (message.kind === 'event') {
                const payload = message.payload as { resync?: boolean } | null
                if (payload?.resync) {
                  sendRelay('view', host.getView(), [message.fromSeat])
                }
              }
              // Host ignores relayed 'view'.
            } else if (message.kind === 'view') {
              ingestView(message.payload as EncoreGameView)
            }
            break
          }
          case 'turn':
            // Views carry the current player; nothing extra to do.
            break
          case 'presence': {
            setConnectionStatus('connected')
            roomMetaRef.current = toRoomMeta(message.room)
            setRoomSummary(message.room)
            if (message.room.status === 'FINISHED') {
              clearOnlineSession()
            }

            // Guest reconnecting into a running game: ask the host for our view.
            if (!localIsHost && message.room.status === 'ACTIVE' && !resyncRequested) {
              resyncRequested = true
              sendRelay('event', { resync: true })
            }
            break
          }
          case 'actionRejected': {
            const knownStatus = roomMetaRef.current?.status ?? null
            if (knownStatus === 'WAITING') {
              intentionalLeaveRef.current = true
              currentSocket.close()
              setLobbyRemovalReason('kicked')
            } else {
              setLastError(message.reason)
            }
            break
          }
          case 'roomClosed':
            clearOnlineSession()
            if (message.status === 'WAITING') {
              setLobbyRemovalReason('host-left')
            }
            setRoomSummary((previous) =>
              previous ? { ...previous, status: message.status } : previous,
            )
            break
        }
      })

      currentSocket.addEventListener('close', () => {
        if (!isCurrentSocket(currentSocket)) {
          return
        }
        websocketRef.current = null
        clearPingInterval()

        if (isCancelled || intentionalLeaveRef.current) {
          setConnectionStatus('disconnected')
          return
        }
        scheduleReconnect()
      })

      currentSocket.addEventListener('error', () => {
        if (!isCurrentSocket(currentSocket)) {
          return
        }
        setConnectionStatus('connecting')
      })
    }

    const connectTimeoutId = window.setTimeout(connect, 0)

    return () => {
      isCancelled = true
      window.clearTimeout(connectTimeoutId)
      clearReconnectTimeout()
      clearPingInterval()

      if (websocketRef.current === socket) {
        websocketRef.current = null
      }

      if (
        socket &&
        (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
      ) {
        socket.close()
      }
    }
    // Collaborators are read from paramsRef (stable); only the session identity
    // should tear down and rebuild the socket.
  }, [session])
}
