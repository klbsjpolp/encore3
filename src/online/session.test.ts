import type { RoomSession } from '@klbsjpolp/realtime-core'
import { afterEach, describe, expect, it } from 'vitest'

import {
  clearOnlineSession,
  getStoredPlayerName,
  loadOnlineSession,
  saveOnlineSession,
  storePlayerName,
} from './session'

const createSession = (overrides: Partial<RoomSession> = {}): RoomSession => ({
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  hostSeatIndex: 0,
  roomCode: 'ABC',
  seatCapacity: 4,
  seatIndex: 0,
  seatToken: 'token',
  wsUrl: 'wss://example.test/ws',
  ...overrides,
})

afterEach(() => {
  localStorage.clear()
})

describe('online session persistence', () => {
  it('round-trips a valid session', () => {
    const session = createSession()
    saveOnlineSession(session)
    expect(loadOnlineSession()).toEqual(session)
  })

  it('returns null when nothing is stored', () => {
    expect(loadOnlineSession()).toBeNull()
  })

  it('drops and clears an expired session', () => {
    saveOnlineSession(createSession({ expiresAt: new Date(Date.now() - 1_000).toISOString() }))
    expect(loadOnlineSession()).toBeNull()
    expect(localStorage.getItem('encore_online_session')).toBeNull()
  })

  it('drops a malformed session', () => {
    localStorage.setItem(
      'encore_online_session',
      JSON.stringify({ version: 1, session: { roomCode: 'ABC' } }),
    )
    expect(loadOnlineSession()).toBeNull()
  })

  it('clears a stored session', () => {
    saveOnlineSession(createSession())
    clearOnlineSession()
    expect(loadOnlineSession()).toBeNull()
  })
})

describe('player name preference', () => {
  it('round-trips a stored name and defaults to empty', () => {
    expect(getStoredPlayerName()).toBe('')
    storePlayerName('Alice')
    expect(getStoredPlayerName()).toBe('Alice')
  })
})
