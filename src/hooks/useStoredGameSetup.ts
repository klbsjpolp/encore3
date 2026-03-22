import { useCallback, useEffect, useState } from 'react'

import type { BoardId } from '@/data/boardConfigurations'
import { BoardId as BOARD_IDS, getDefaultBoardId } from '@/data/boardConfigurations'

const GAME_SETUP_STORAGE_KEY = 'encore:game-setup:v1'

interface StoredGameSetup {
  playerNames: [string, string]
  aiPlayers: [boolean, boolean]
  selectedBoards: [BoardId, BoardId]
}

const DEFAULT_PLAYER_NAMES: [string, string] = ['Joueur 1', 'Joueur 2']
const DEFAULT_AI_PLAYERS: [boolean, boolean] = [false, true]

const createDefaultGameSetup = (): StoredGameSetup => ({
  playerNames: [...DEFAULT_PLAYER_NAMES],
  aiPlayers: [...DEFAULT_AI_PLAYERS],
  selectedBoards: [getDefaultBoardId(), getDefaultBoardId()],
})

const isBoardId = (value: unknown): value is BoardId =>
  typeof value === 'string' && BOARD_IDS.includes(value as BoardId)

const parseStoredGameSetup = (value: unknown): StoredGameSetup | null => {
  if (typeof value !== 'object' || value == null) {
    return null
  }

  const candidate = value as {
    playerNames?: unknown
    aiPlayers?: unknown
    selectedBoards?: unknown
  }

  if (!Array.isArray(candidate.playerNames) || candidate.playerNames.length !== 2) {
    return null
  }
  if (!candidate.playerNames.every((name) => typeof name === 'string')) {
    return null
  }

  if (!Array.isArray(candidate.aiPlayers) || candidate.aiPlayers.length !== 2) {
    return null
  }
  if (!candidate.aiPlayers.every((player) => typeof player === 'boolean')) {
    return null
  }

  if (!Array.isArray(candidate.selectedBoards) || candidate.selectedBoards.length !== 2) {
    return null
  }
  if (!candidate.selectedBoards.every((boardId) => isBoardId(boardId))) {
    return null
  }

  return {
    playerNames: [candidate.playerNames[0], candidate.playerNames[1]],
    aiPlayers: [candidate.aiPlayers[0], candidate.aiPlayers[1]],
    selectedBoards: [candidate.selectedBoards[0], candidate.selectedBoards[1]],
  }
}

const loadStoredGameSetup = (): StoredGameSetup => {
  if (typeof window === 'undefined') {
    return createDefaultGameSetup()
  }

  try {
    const stored = window.localStorage.getItem(GAME_SETUP_STORAGE_KEY)
    if (!stored) {
      return createDefaultGameSetup()
    }

    const parsed = parseStoredGameSetup(JSON.parse(stored))
    return parsed ?? createDefaultGameSetup()
  } catch {
    return createDefaultGameSetup()
  }
}

const saveStoredGameSetup = (gameSetup: StoredGameSetup): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(GAME_SETUP_STORAGE_KEY, JSON.stringify(gameSetup))
  } catch {
    // Ignore storage write errors (private mode, quota exceeded, etc.).
  }
}

export const useStoredGameSetup = () => {
  const [gameSetup, setGameSetup] = useState<StoredGameSetup>(() => loadStoredGameSetup())

  useEffect(() => {
    saveStoredGameSetup(gameSetup)
  }, [gameSetup])

  const setPlayerName = useCallback((index: number, name: string) => {
    setGameSetup((previousSetup) => {
      if (index === 0) {
        return {
          ...previousSetup,
          playerNames: [name, previousSetup.playerNames[1]],
        }
      }

      return {
        ...previousSetup,
        playerNames: [previousSetup.playerNames[0], name],
      }
    })
  }, [])

  const toggleAIPlayer = useCallback((index: number) => {
    setGameSetup((previousSetup) => {
      if (index === 0) {
        return {
          ...previousSetup,
          aiPlayers: [!previousSetup.aiPlayers[0], previousSetup.aiPlayers[1]],
        }
      }

      return {
        ...previousSetup,
        aiPlayers: [previousSetup.aiPlayers[0], !previousSetup.aiPlayers[1]],
      }
    })
  }, [])

  const setSelectedBoard = useCallback((index: number, boardId: BoardId) => {
    setGameSetup((previousSetup) => {
      if (index === 0) {
        return {
          ...previousSetup,
          selectedBoards: [boardId, previousSetup.selectedBoards[1]],
        }
      }

      return {
        ...previousSetup,
        selectedBoards: [previousSetup.selectedBoards[0], boardId],
      }
    })
  }, [])

  return {
    playerNames: gameSetup.playerNames,
    aiPlayers: gameSetup.aiPlayers,
    selectedBoards: gameSetup.selectedBoards,
    setPlayerName,
    toggleAIPlayer,
    setSelectedBoard,
  }
}
