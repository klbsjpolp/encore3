import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createOnlineRoom, ENCORE_GAME_ID, joinOnlineRoom } from './api'

const jsonResponse = (body: unknown, ok = true): Response =>
  ({ ok, json: async () => body }) as unknown as Response

describe('online api', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_ENCORE_API_URL', 'https://api.test/')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('creates a room with the encore game id and normalized base url', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ roomCode: 'ABC' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await createOnlineRoom('Alice')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/rooms',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toEqual({ gameId: ENCORE_GAME_ID, playerName: 'Alice' })
  })

  it('joins a room by code', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ roomCode: 'XYZ' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await joinOnlineRoom('XYZ', 'Bob')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/rooms/join',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toEqual({ roomCode: 'XYZ', playerName: 'Bob' })
  })

  it('surfaces the server error message on a failed request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, _init?: RequestInit) =>
        jsonResponse({ message: 'Salle pleine' }, false),
      ),
    )

    await expect(createOnlineRoom()).rejects.toThrow('Salle pleine')
  })
})
