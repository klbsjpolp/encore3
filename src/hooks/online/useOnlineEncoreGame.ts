import type { LobbyReadyState, RoomSession, RoomSummary } from '@klbsjpolp/realtime-core'
import { useCallback, useMemo, useRef, useState } from 'react'

import { applyMoveToState } from '@/hooks/encore-game/applyMove'
import { isValidMoveSelection } from '@/hooks/encore-game/moveValidation'
import type { EncoreAction } from '@/online/runtime/actionSchema'
import type { EncoreHost } from '@/online/runtime/hostRuntime'
import type { EncoreGameView } from '@/online/runtime/views'
import { clearOnlineSession } from '@/online/session'
import type { ColorDiceResult, DiceResult, GameState, NumberDiceResult } from '@/types/game'

import type { ConnectionStatus, HostRoomMeta, HostSnapshotPayload } from './types'
import { useOnlineConnection } from './useOnlineConnection'

interface Selection {
  color: ColorDiceResult | null
  number: NumberDiceResult | null
  fromJoker: { color: boolean; number: boolean }
}

const EMPTY_SELECTION: Selection = {
  color: null,
  number: null,
  fromJoker: { color: false, number: false },
}

const isSelectionPhase = (phase: GameState['phase']): boolean =>
  phase === 'active-selection' || phase === 'passive-selection'

export function useOnlineEncoreGame(session: RoomSession | null) {
  const [view, setView] = useState<EncoreGameView | null>(null)
  const [roomSummary, setRoomSummary] = useState<RoomSummary | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [lastError, setLastError] = useState<string | null>(null)
  const [lobbyRemovalReason, setLobbyRemovalReason] = useState<'removed' | 'restore-failed' | null>(
    null,
  )
  // Local dice selection overlay for the acting client. The authoritative view
  // never carries an in-progress selection (the host clears it on every move),
  // so the acting seat tracks its own highlight until it confirms.
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION)

  const websocketRef = useRef<WebSocket | null>(null)
  const viewRef = useRef<EncoreGameView | null>(null)
  const hostRef = useRef<EncoreHost | null>(null)
  const roomMetaRef = useRef<HostRoomMeta | null>(null)
  const activeSeatIndicesRef = useRef<number[]>([])
  const lastBroadcastTurnRef = useRef<number | null>(null)
  const intentionalLeaveRef = useRef(false)

  const isHost = session != null && session.seatIndex === session.hostSeatIndex

  const commitView = useCallback((nextView: EncoreGameView | null) => {
    viewRef.current = nextView
    setView(nextView)
  }, [])

  const sendRaw = useCallback((message: unknown): boolean => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      return false
    }
    websocketRef.current.send(JSON.stringify(message))
    return true
  }, [])

  const sendRelay = useCallback(
    (kind: 'move' | 'event' | 'view', payload: unknown, toSeats?: number[]): boolean =>
      sendRaw({ type: 'relay', kind, payload, toSeats }),
    [sendRaw],
  )

  // Single rendering path for both roles: adopt the authoritative view and drop
  // any stale local selection (a new state invalidates an in-progress choice).
  const ingestView = useCallback(
    (incomingView: EncoreGameView): void => {
      setConnectionStatus('connected')
      setLastError(null)
      setSelection(EMPTY_SELECTION)
      if (incomingView.gameState.phase === 'game-over') {
        clearOnlineSession()
      }
      commitView(incomingView)
    },
    [commitView],
  )

  // Host authority: advance the abstract turn, relay the shared view to every
  // guest, store the reconnection snapshot, and signal game over.
  const pushAuthority = useCallback((): void => {
    const host = hostRef.current
    if (!host || !session) {
      return
    }

    const currentTurn = host.currentSeatIndex()
    if (currentTurn !== null && currentTurn !== lastBroadcastTurnRef.current) {
      lastBroadcastTurnRef.current = currentTurn
      sendRaw({ type: 'setTurn', currentSeatIndex: currentTurn })
    }

    sendRelay('view', host.getView())

    const snapshot: HostSnapshotPayload = {
      state: host.serializeSnapshot(),
      activeSeatIndices: activeSeatIndicesRef.current,
    }
    sendRaw({ type: 'snapshot', payload: snapshot })

    if (host.gameIsOver) {
      sendRaw({ type: 'endGame', winnerSeatIndex: host.winnerSeatIndex() })
    }
  }, [sendRaw, sendRelay, session])

  const applyHostAction = useCallback(
    (action: EncoreAction): void => {
      const host = hostRef.current
      if (!host || !session) {
        return
      }
      const result = host.applyAction(session.seatIndex, action)
      if (!result.ok) {
        setLastError(result.error ?? null)
        return
      }
      ingestView(host.getView())
      pushAuthority()
    },
    [ingestView, pushAuthority, session],
  )

  const sendAction = useCallback(
    (action: EncoreAction): void => {
      if (isHost) {
        applyHostAction(action)
      } else {
        // Only the host applies actions; target it directly instead of
        // broadcasting to every seat (other guests would just ignore it).
        sendRelay('move', action, session ? [session.hostSeatIndex] : undefined)
      }
    },
    [applyHostAction, isHost, sendRelay, session],
  )

  useOnlineConnection({
    session,
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
  })

  // ---------------------------------------------------------------------------
  // Seat / turn derivation
  // ---------------------------------------------------------------------------
  const activeSeatIndices = view?.activeSeatIndices ?? []
  const myPlayerIndex = session ? activeSeatIndices.indexOf(session.seatIndex) : -1
  const authoritativeState = view?.gameState ?? null
  const isMyTurn =
    authoritativeState != null &&
    myPlayerIndex >= 0 &&
    authoritativeState.currentPlayer === myPlayerIndex &&
    authoritativeState.phase !== 'game-over'

  // Merge the local selection overlay into the authoritative state so the
  // reused selection hook and board see the acting player's in-progress choice.
  const gameState = useMemo<GameState | null>(() => {
    if (!authoritativeState) {
      return null
    }
    if (!isMyTurn) {
      return authoritativeState
    }
    return {
      ...authoritativeState,
      selectedDice: { color: selection.color, number: selection.number },
      selectedFromJoker: { ...selection.fromJoker },
    }
  }, [authoritativeState, isMyTurn, selection])

  // ---------------------------------------------------------------------------
  // Actions (mirror the local useEncoreGame surface so the UI can be shared)
  // ---------------------------------------------------------------------------
  const rollNewDice = useCallback((): boolean => {
    const state = viewRef.current?.gameState
    if (!state || !isMyTurn || state.phase !== 'rolling') {
      return false
    }
    sendAction({ type: 'ROLL' })
    return true
  }, [isMyTurn, sendAction])

  const selectDice = useCallback(
    (dice: DiceResult): void => {
      const state = viewRef.current?.gameState
      if (!state || !isMyTurn || !isSelectionPhase(state.phase)) {
        return
      }
      // Passive players cannot reuse dice the active player already consumed.
      if (dice.selected && state.phase === 'passive-selection') {
        return
      }
      // Defend against a relayed view whose players array does not cover our
      // seat (the shape guard should already reject it, but never crash here).
      const player = state.players[myPlayerIndex]
      if (!player) {
        return
      }
      setSelection((prev) => {
        const nextFromJoker = { ...prev.fromJoker, [dice.type]: dice.value === 'wild' }
        const jokersNeeded = (nextFromJoker.color ? 1 : 0) + (nextFromJoker.number ? 1 : 0)
        if (jokersNeeded > player.jokersRemaining) {
          return prev
        }
        return dice.type === 'color'
          ? { ...prev, color: dice, fromJoker: nextFromJoker }
          : { ...prev, number: dice, fromJoker: nextFromJoker }
      })
    },
    [isMyTurn, myPlayerIndex],
  )

  const makeMove = useCallback(
    (squares?: { row: number; col: number }[]): boolean => {
      const state = viewRef.current?.gameState
      if (!state || !isMyTurn || !squares || !selection.color || !selection.number) {
        return false
      }
      // Validate against the authoritative rules before spending a round-trip.
      const application = applyMoveToState(
        state,
        squares,
        { color: selection.color, number: selection.number },
        selection.fromJoker,
      )
      if (!application) {
        return false
      }
      sendAction({
        type: 'MOVE',
        colorDiceId: selection.color.id,
        numberDiceId: selection.number.id,
        squares,
      })
      setSelection(EMPTY_SELECTION)
      return true
    },
    [isMyTurn, selection, sendAction],
  )

  const skipTurn = useCallback((): void => {
    const state = viewRef.current?.gameState
    if (!state || !isMyTurn || !isSelectionPhase(state.phase)) {
      return
    }
    sendAction({ type: 'SKIP' })
    setSelection(EMPTY_SELECTION)
  }, [isMyTurn, sendAction])

  // ---------------------------------------------------------------------------
  // Lobby controls
  // ---------------------------------------------------------------------------
  const startGame = useCallback((): void => {
    // roomSummary.version is populated by the first presence message, which also
    // populates the connectedSeats/lobbySeats that canStartGame gates on — so by
    // the time the host can trigger this, the version is defined (not undefined).
    sendRaw({ type: 'startGame', clientVersion: roomSummary?.version })
  }, [roomSummary?.version, sendRaw])

  const sendSetReady = useCallback(
    (playerName?: string): void => {
      sendRaw({ type: 'setReady', playerName })
    },
    [sendRaw],
  )

  const sendSetUnready = useCallback((): void => {
    sendRaw({ type: 'setUnready' })
  }, [sendRaw])

  const kickSeat = useCallback(
    (targetSeatIndex: number): void => {
      sendRaw({ type: 'kickSeat', targetSeatIndex })
    },
    [sendRaw],
  )

  const leaveLobby = useCallback((): void => {
    intentionalLeaveRef.current = true
    sendRaw({ type: 'leaveLobby' })
  }, [sendRaw])

  // ---------------------------------------------------------------------------
  // Lobby / room derivation
  // ---------------------------------------------------------------------------
  const room = roomSummary && roomSummary.roomCode === session?.roomCode ? roomSummary : null
  const seatCapacity = room?.seatCapacity ?? session?.seatCapacity ?? 4
  const hostSeatIndex = room?.hostSeatIndex ?? session?.hostSeatIndex ?? 0
  const connectedSeats = room?.connectedSeats ?? []
  const lobbySeats = room?.lobbySeats ?? []
  const roomStatus = room?.status ?? 'WAITING'
  const isLocalHost = session?.seatIndex === hostSeatIndex
  const myReadyState: LobbyReadyState =
    lobbySeats.find((seat) => seat.seatIndex === session?.seatIndex)?.readyState ?? 'never-ready'
  // Single source of truth for "every connected seat is ready", shared by the
  // host's start-gating below and the lobby's status text.
  const allSeatsReady =
    connectedSeats.length >= 2 &&
    connectedSeats.every(
      (seatIndex) =>
        lobbySeats.find((seat) => seat.seatIndex === seatIndex)?.readyState === 'ready',
    )
  const canStartGame = Boolean(isLocalHost && roomStatus === 'WAITING' && allSeatsReady)

  return {
    // Connection / room
    connectionStatus,
    lastError,
    lobbyRemovalReason,
    roomCode: room?.roomCode ?? session?.roomCode ?? '',
    roomStatus,
    seatCapacity,
    hostSeatIndex,
    connectedSeats,
    lobbySeats,
    isLocalHost,
    myReadyState,
    mySeatIndex: session?.seatIndex ?? null,
    canStartGame,
    allSeatsReady,
    // Game
    gameState,
    activeSeatIndices,
    myPlayerIndex,
    isMyTurn,
    hasGameView: view !== null,
    // Actions
    rollNewDice,
    selectDice,
    makeMove,
    skipTurn,
    isValidMove: isValidMoveSelection,
    // Lobby controls
    startGame,
    sendSetReady,
    sendSetUnready,
    kickSeat,
    leaveLobby,
  }
}
