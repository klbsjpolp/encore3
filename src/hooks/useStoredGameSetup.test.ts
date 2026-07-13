import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useStoredGameSetup } from './useStoredGameSetup'

const STORAGE_KEY = 'encore:game-setup:v1'

describe('useStoredGameSetup', () => {
  it('starts with the default setup when nothing is stored', () => {
    const { result } = renderHook(() => useStoredGameSetup())

    expect(result.current.playerNames).toEqual(['Joueur 1', 'Joueur 2'])
    expect(result.current.aiPlayers).toEqual([false, true])
    expect(result.current.selectedBoards).toEqual(['classic', 'classic'])
  })

  it('persists changes and restores them on the next mount', () => {
    const { result } = renderHook(() => useStoredGameSetup())

    act(() => {
      result.current.setPlayerName(0, 'Alice')
      result.current.setPlayerName(1, 'Bob')
      result.current.toggleAIPlayer(1)
      result.current.setSelectedBoard(0, 'blue')
      result.current.setSelectedBoard(1, 'red')
    })

    expect(result.current.playerNames).toEqual(['Alice', 'Bob'])
    expect(result.current.aiPlayers).toEqual([false, false])
    expect(result.current.selectedBoards).toEqual(['blue', 'red'])

    const { result: restored } = renderHook(() => useStoredGameSetup())
    expect(restored.current.playerNames).toEqual(['Alice', 'Bob'])
    expect(restored.current.aiPlayers).toEqual([false, false])
    expect(restored.current.selectedBoards).toEqual(['blue', 'red'])
  })

  it('toggles the AI flag of the first player independently', () => {
    const { result } = renderHook(() => useStoredGameSetup())

    act(() => {
      result.current.toggleAIPlayer(0)
    })

    expect(result.current.aiPlayers).toEqual([true, true])
  })

  it('falls back to defaults when the stored value is not valid JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')

    const { result } = renderHook(() => useStoredGameSetup())

    expect(result.current.playerNames).toEqual(['Joueur 1', 'Joueur 2'])
  })

  it.each([
    ['not an object', JSON.stringify('setup')],
    ['missing player names', JSON.stringify({ aiPlayers: [false, true] })],
    [
      'wrong player names length',
      JSON.stringify({
        playerNames: ['Solo'],
        aiPlayers: [false, true],
        selectedBoards: ['classic', 'classic'],
      }),
    ],
    [
      'non-string player names',
      JSON.stringify({
        playerNames: [1, 2],
        aiPlayers: [false, true],
        selectedBoards: ['classic', 'classic'],
      }),
    ],
    [
      'non-boolean ai flags',
      JSON.stringify({
        playerNames: ['A', 'B'],
        aiPlayers: ['yes', 'no'],
        selectedBoards: ['classic', 'classic'],
      }),
    ],
    [
      'unknown board id',
      JSON.stringify({
        playerNames: ['A', 'B'],
        aiPlayers: [false, true],
        selectedBoards: ['classic', 'rainbow'],
      }),
    ],
  ])('falls back to defaults for a malformed stored setup (%s)', (_label, stored) => {
    window.localStorage.setItem(STORAGE_KEY, stored)

    const { result } = renderHook(() => useStoredGameSetup())

    expect(result.current.playerNames).toEqual(['Joueur 1', 'Joueur 2'])
    expect(result.current.aiPlayers).toEqual([false, true])
    expect(result.current.selectedBoards).toEqual(['classic', 'classic'])
  })
})
