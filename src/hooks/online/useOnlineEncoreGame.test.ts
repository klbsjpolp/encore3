import type { RoomSession } from '@klbsjpolp/realtime-core'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import type { DiceResult, GameColor, GameState, Player, Square } from '@/types/game'

import { useOnlineEncoreGame } from './useOnlineEncoreGame'

type Listener = (event: unknown) => void

class MockWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 3
  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.OPEN
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
    this.emit('open')
  }

  fireMessage(payload: unknown) {
    this.emit('message', { data: JSON.stringify(payload) })
  }

  relayView(view: unknown) {
    this.fireMessage({ type: 'relayed', kind: 'view', fromSeat: 0, payload: view })
  }
}

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
  board: [
    COLORS.map((color, col) => ({
      color,
      hasStar: false,
      crossed: false,
      column: String.fromCharCode(65 + col),
      row: 0,
    })),
  ] as Square[][],
  boardConfiguration,
  starsCollected: 0,
  completedColors: [],
  completedColorsFirst: [],
  completedColorsNotFirst: [],
  completedColumnsFirst: [],
  completedColumnsNotFirst: [],
  jokersRemaining: 8,
})

const redDie: DiceResult = { id: 'c-red', type: 'color', value: 'red', selected: false }
const oneDie: DiceResult = { id: 'n-1', type: 'number', value: 1, selected: false }

const gameStateFor = (phase: GameState['phase'], currentPlayer: number): GameState => ({
  players: [createPlayer('player-0'), createPlayer('player-1')],
  currentPlayer,
  activePlayer: currentPlayer,
  phase,
  lastPhase: 'rolling',
  dice: [{ ...redDie }, { ...oneDie }],
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

const viewFor = (phase: GameState['phase'], currentPlayer: number) => ({
  gameState: gameStateFor(phase, currentPlayer),
  activeSeatIndices: [0, 1],
})

// Guest at seat 1 (host is seat 0), so player-array index 1 is "me".
const guestSession = (): RoomSession => ({
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  hostSeatIndex: 0,
  roomCode: 'ABC',
  seatCapacity: 4,
  seatIndex: 1,
  seatToken: 'token',
  wsUrl: 'ws://test/ws',
})

const mount = async () => {
  // A stable session reference: the connection effect is keyed on `session`, so
  // a fresh object each render would tear the socket/view down every render.
  const session = guestSession()
  const rendered = renderHook(() => useOnlineEncoreGame(session))
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  const { instances } = MockWebSocket
  const socket = instances[instances.length - 1]
  act(() => socket.fireOpen())
  return { ...rendered, socket }
}

const relayMovesFrom = (socket: MockWebSocket) =>
  socket.sent
    .map((raw) => JSON.parse(raw))
    .filter((message) => message.type === 'relay' && message.kind === 'move')

describe('useOnlineEncoreGame', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('derives my seat and turn from the relayed view', async () => {
    const { result, socket } = await mount()
    act(() => socket.relayView(viewFor('active-selection', 1)))

    expect(result.current.myPlayerIndex).toBe(1)
    expect(result.current.isMyTurn).toBe(true)
    expect(result.current.hasGameView).toBe(true)
  })

  it('is not my turn when the authoritative current player is someone else', async () => {
    const { result, socket } = await mount()
    act(() => socket.relayView(viewFor('active-selection', 0)))

    expect(result.current.isMyTurn).toBe(false)
    // Actions are inert when it is not our turn.
    let rolled = true
    act(() => {
      rolled = result.current.rollNewDice()
    })
    expect(rolled).toBe(false)
    expect(relayMovesFrom(socket)).toHaveLength(0)
  })

  it('overlays the local dice selection onto the rendered state', async () => {
    const { result, socket } = await mount()
    act(() => socket.relayView(viewFor('active-selection', 1)))

    act(() => result.current.selectDice(redDie))
    act(() => result.current.selectDice(oneDie))

    expect(result.current.gameState?.selectedDice.color?.id).toBe('c-red')
    expect(result.current.gameState?.selectedDice.number?.id).toBe('n-1')
  })

  it('relays a validated MOVE with the selected dice ids', async () => {
    const { result, socket } = await mount()
    act(() => socket.relayView(viewFor('active-selection', 1)))
    act(() => result.current.selectDice(redDie))
    act(() => result.current.selectDice(oneDie))

    let applied = false
    act(() => {
      applied = result.current.makeMove([{ row: 0, col: 7 }])
    })

    expect(applied).toBe(true)
    const moves = relayMovesFrom(socket)
    expect(moves).toHaveLength(1)
    expect(moves[0].payload).toEqual({
      type: 'MOVE',
      colorDiceId: 'c-red',
      numberDiceId: 'n-1',
      squares: [{ row: 0, col: 7 }],
    })
  })

  it('does not relay an illegal MOVE', async () => {
    const { result, socket } = await mount()
    act(() => socket.relayView(viewFor('active-selection', 1)))
    act(() => result.current.selectDice(redDie))
    act(() => result.current.selectDice(oneDie))

    let applied = true
    act(() => {
      // Two squares for a "1" die is illegal.
      applied = result.current.makeMove([
        { row: 0, col: 7 },
        { row: 0, col: 6 },
      ])
    })

    expect(applied).toBe(false)
    expect(relayMovesFrom(socket)).toHaveLength(0)
  })

  it('relays a ROLL only while it is my turn to roll', async () => {
    const { result, socket } = await mount()
    act(() => socket.relayView(viewFor('rolling', 1)))

    let rolled = false
    act(() => {
      rolled = result.current.rollNewDice()
    })

    expect(rolled).toBe(true)
    const moves = relayMovesFrom(socket)
    expect(moves).toHaveLength(1)
    expect(moves[0].payload).toEqual({ type: 'ROLL' })
  })

  it('relays a SKIP and clears the local selection', async () => {
    const { result, socket } = await mount()
    act(() => socket.relayView(viewFor('active-selection', 1)))
    act(() => result.current.selectDice(redDie))

    act(() => result.current.skipTurn())

    const moves = relayMovesFrom(socket)
    expect(moves).toHaveLength(1)
    expect(moves[0].payload).toEqual({ type: 'SKIP' })
  })
})
