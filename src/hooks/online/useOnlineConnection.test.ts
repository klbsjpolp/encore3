import type { RoomSession } from '@klbsjpolp/realtime-core'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EncoreGameView } from '@/online/runtime/views'
import type { GameState } from '@/types/game'

import type { UseOnlineConnectionParams } from './useOnlineConnection'
import { useOnlineConnection } from './useOnlineConnection'

type Listener = (event: unknown) => void

class MockWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 3
  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.CONNECTING
  sent: string[] = []
  private listeners: Record<string, Listener[]> = {}

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: Listener) {
    ;(this.listeners[type] ??= []).push(listener)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.emit('close')
  }

  emit(type: string, event?: unknown) {
    ;(this.listeners[type] ?? []).forEach((listener) => listener(event))
  }

  fireOpen() {
    this.readyState = MockWebSocket.OPEN
    this.emit('open')
  }

  fireMessage(payload: unknown) {
    this.emit('message', { data: JSON.stringify(payload) })
  }
}

const playerFixture = (id: string) => ({
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

const gameStateFixture = (): GameState => ({
  players: [
    playerFixture('player-0'),
    playerFixture('player-1'),
  ] as unknown as GameState['players'],
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
  claimedFirstColumnBonus: {},
  claimedFirstColorBonus: {},
  claimedSecondColorBonus: {},
})

const viewFixture = (): EncoreGameView => ({
  gameState: gameStateFixture(),
  activeSeatIndices: [0, 1],
})

const makeSession = (overrides: Partial<RoomSession> = {}): RoomSession => ({
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  hostSeatIndex: 0,
  roomCode: 'ABC',
  seatCapacity: 4,
  seatIndex: 1,
  seatToken: 'token',
  wsUrl: 'ws://test/ws',
  ...overrides,
})

const makeParams = (session: RoomSession): UseOnlineConnectionParams => ({
  session,
  websocketRef: { current: null },
  viewRef: { current: null },
  hostRef: { current: null },
  roomMetaRef: { current: null },
  activeSeatIndicesRef: { current: [] },
  lastBroadcastTurnRef: { current: null },
  intentionalLeaveRef: { current: false },
  ingestView: vi.fn(),
  pushAuthority: vi.fn(),
  sendRelay: vi.fn(),
  setConnectionStatus: vi.fn(),
  setLastError: vi.fn(),
  setRoomSummary: vi.fn(),
  setLobbyRemovalReason: vi.fn(),
})

// Mount the hook and open the socket (the hook defers connect() via setTimeout).
const mountConnected = async (params: UseOnlineConnectionParams) => {
  renderHook(() => useOnlineConnection(params))
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  const { instances } = MockWebSocket
  const socket = instances[instances.length - 1]
  act(() => socket.fireOpen())
  return socket
}

describe('useOnlineConnection routing', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('authenticates on open', async () => {
    const params = makeParams(makeSession())
    const socket = await mountConnected(params)
    const auth = JSON.parse(socket.sent[0])
    expect(auth.type).toBe('auth')
    expect(auth.roomCode).toBe('ABC')
    expect(auth.seatIndex).toBe(1)
  })

  it('ingests a valid relayed view for a guest', async () => {
    const params = makeParams(makeSession())
    const socket = await mountConnected(params)
    act(() =>
      socket.fireMessage({ type: 'relayed', kind: 'view', fromSeat: 0, payload: viewFixture() }),
    )
    expect(params.ingestView).toHaveBeenCalledTimes(1)
  })

  it('drops a malformed relayed view instead of ingesting it', async () => {
    const params = makeParams(makeSession())
    const socket = await mountConnected(params)
    act(() =>
      socket.fireMessage({
        type: 'relayed',
        kind: 'view',
        fromSeat: 0,
        payload: { gameState: { phase: 'rolling' } },
      }),
    )
    expect(params.ingestView).not.toHaveBeenCalled()
  })

  it('surfaces actionRejected as a recoverable error, not a removal', async () => {
    const params = makeParams(makeSession())
    const socket = await mountConnected(params)
    act(() =>
      socket.fireMessage({
        type: 'actionRejected',
        code: 'invalid_action',
        reason: 'Coup invalide',
      }),
    )
    expect(params.setLastError).toHaveBeenCalledWith('Coup invalide')
    expect(params.setLobbyRemovalReason).not.toHaveBeenCalled()
  })

  it('treats a WAITING roomClosed as a removal and stops reconnecting', async () => {
    const params = makeParams(makeSession())
    const socket = await mountConnected(params)
    act(() => socket.fireMessage({ type: 'roomClosed', roomCode: 'ABC', status: 'WAITING' }))
    expect(params.setLobbyRemovalReason).toHaveBeenCalledWith('removed')
    expect(params.intentionalLeaveRef.current).toBe(true)
  })

  it('builds the host runtime and pushes authority when the game starts (host seat)', async () => {
    const params = makeParams(makeSession({ seatIndex: 0, hostSeatIndex: 0 }))
    const socket = await mountConnected(params)
    act(() =>
      socket.fireMessage({ type: 'gameStarted', activeSeatIndices: [0, 1], currentSeatIndex: 0 }),
    )
    expect(params.hostRef.current).not.toBeNull()
    expect(params.ingestView).toHaveBeenCalledTimes(1)
    expect(params.pushAuthority).toHaveBeenCalledTimes(1)
  })

  it('corrects the sender with an authoritative view on a malformed move', async () => {
    const params = makeParams(makeSession({ seatIndex: 0, hostSeatIndex: 0 }))
    const socket = await mountConnected(params)
    act(() =>
      socket.fireMessage({ type: 'gameStarted', activeSeatIndices: [0, 1], currentSeatIndex: 0 }),
    )
    act(() =>
      socket.fireMessage({
        type: 'relayed',
        kind: 'move',
        fromSeat: 1,
        payload: { type: 'NONSENSE' },
      }),
    )
    expect(params.sendRelay).toHaveBeenCalledWith('view', expect.anything(), [1])
  })

  it('does not build a host runtime for a guest seat on game start', async () => {
    const params = makeParams(makeSession({ seatIndex: 1, hostSeatIndex: 0 }))
    const socket = await mountConnected(params)
    act(() =>
      socket.fireMessage({ type: 'gameStarted', activeSeatIndices: [0, 1], currentSeatIndex: 0 }),
    )
    expect(params.hostRef.current).toBeNull()
    expect(params.pushAuthority).not.toHaveBeenCalled()
  })

  it('rebuilds the host runtime from a valid reconnection snapshot', async () => {
    const params = makeParams(makeSession({ seatIndex: 0, hostSeatIndex: 0 }))
    const socket = await mountConnected(params)
    act(() =>
      socket.fireMessage({
        type: 'snapshotRestore',
        payload: { state: gameStateFixture(), activeSeatIndices: [0, 1] },
      }),
    )
    expect(params.hostRef.current).not.toBeNull()
    expect(params.pushAuthority).toHaveBeenCalledTimes(1)
    expect(params.setLobbyRemovalReason).not.toHaveBeenCalled()
  })

  it('fails loudly when a stored snapshot is present but malformed', async () => {
    const params = makeParams(makeSession({ seatIndex: 0, hostSeatIndex: 0 }))
    const socket = await mountConnected(params)
    act(() =>
      socket.fireMessage({ type: 'snapshotRestore', payload: { state: { phase: 'rolling' } } }),
    )
    expect(params.hostRef.current).toBeNull()
    expect(params.setLobbyRemovalReason).toHaveBeenCalledWith('restore-failed')
    expect(params.intentionalLeaveRef.current).toBe(true)
  })

  it('ignores a null snapshot (nothing stored yet) without tearing down', async () => {
    const params = makeParams(makeSession({ seatIndex: 0, hostSeatIndex: 0 }))
    const socket = await mountConnected(params)
    act(() => socket.fireMessage({ type: 'snapshotRestore', payload: null }))
    expect(params.setLobbyRemovalReason).not.toHaveBeenCalled()
    expect(params.intentionalLeaveRef.current).toBe(false)
  })

  it('stops reconnecting once the room is FINISHED', async () => {
    const params = makeParams(makeSession())
    const socket = await mountConnected(params)
    act(() =>
      socket.fireMessage({
        type: 'presence',
        room: {
          connectedSeats: [0, 1],
          currentSeatIndex: null,
          disconnectedSeats: [],
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          hostSeatIndex: 0,
          lobbySeats: [],
          roomCode: 'ABC',
          seatCapacity: 4,
          status: 'FINISHED',
          version: 5,
        },
      }),
    )
    expect(params.intentionalLeaveRef.current).toBe(true)
  })
})
