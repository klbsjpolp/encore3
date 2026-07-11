import type { BoardConfiguration } from '@/data/boardConfigurations'
import type { GameColor, GamePhase, GameState, Player, Square } from '@/types/game'
import { GAME_COLORS } from '@/types/game'

export const GAME_STATE_STORAGE_KEY = 'encore:game-state:v1'

const RESTORABLE_PHASES: GameState['phase'][] = [
  'rolling',
  'active-selection',
  'passive-selection',
  'player-switching',
  'rolling-ai',
  'active-selection-ai',
  'passive-selection-ai',
]

type StoredBoardConfiguration = Omit<BoardConfiguration, 'starPositions'> & {
  starPositions: string[]
}

type StoredPlayer = Omit<Player, 'boardConfiguration'> & {
  boardConfiguration: StoredBoardConfiguration
}

type StoredGameState = Omit<GameState, 'players'> & { players: StoredPlayer[] }

export const shouldPersistGameState = (state: GameState): boolean =>
  state.gameStarted && state.phase !== 'game-over'

export const serializeGameState = (state: GameState): string => {
  const stored: StoredGameState = {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      boardConfiguration: {
        ...player.boardConfiguration,
        starPositions: [...player.boardConfiguration.starPositions],
      },
    })),
  }

  return JSON.stringify(stored)
}

const isGameColor = (value: unknown): value is GameColor =>
  typeof value === 'string' && GAME_COLORS.includes(value as GameColor)

const isSquare = (value: unknown): value is Square => {
  if (typeof value !== 'object' || value == null) {
    return false
  }
  const square = value as Partial<Square>
  return isGameColor(square.color) && typeof square.crossed === 'boolean'
}

const isBoard = (value: unknown): value is Square[][] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((row) => Array.isArray(row) && row.length > 0 && row.every(isSquare))

const parseStoredPlayer = (value: unknown): Player | null => {
  if (typeof value !== 'object' || value == null) {
    return null
  }
  const player = value as Partial<StoredPlayer>
  if (typeof player.id !== 'string' || typeof player.name !== 'string') {
    return null
  }
  if (typeof player.isAI !== 'boolean' || typeof player.jokersRemaining !== 'number') {
    return null
  }
  if (!isBoard(player.board)) {
    return null
  }
  const configuration = player.boardConfiguration
  if (
    typeof configuration !== 'object' ||
    configuration == null ||
    !Array.isArray(configuration.starPositions)
  ) {
    return null
  }

  return {
    ...(player as StoredPlayer),
    boardConfiguration: {
      ...configuration,
      starPositions: new Set(
        configuration.starPositions.filter((position) => typeof position === 'string'),
      ),
    },
  }
}

export const parseStoredGameState = (raw: string): GameState | null => {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed == null) {
    return null
  }
  const state = parsed as Partial<StoredGameState>

  if (state.gameStarted !== true) {
    return null
  }
  if (
    typeof state.phase !== 'string' ||
    !RESTORABLE_PHASES.includes(state.phase as GamePhase) ||
    !Array.isArray(state.dice)
  ) {
    return null
  }
  if (!Array.isArray(state.players) || state.players.length === 0) {
    return null
  }

  const players: Player[] = []
  for (const storedPlayer of state.players) {
    const player = parseStoredPlayer(storedPlayer)
    if (!player) {
      return null
    }
    players.push(player)
  }

  if (
    typeof state.currentPlayer !== 'number' ||
    typeof state.activePlayer !== 'number' ||
    state.currentPlayer < 0 ||
    state.currentPlayer >= players.length ||
    state.activePlayer < 0 ||
    state.activePlayer >= players.length
  ) {
    return null
  }

  return { ...(state as StoredGameState), players }
}

export const loadStoredGameState = (): GameState | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.localStorage.getItem(GAME_STATE_STORAGE_KEY)
    return stored ? parseStoredGameState(stored) : null
  } catch {
    return null
  }
}

export const saveStoredGameState = (state: GameState): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(GAME_STATE_STORAGE_KEY, serializeGameState(state))
  } catch {
    // Ignore storage write errors (private mode, quota exceeded, etc.).
  }
}

export const clearStoredGameState = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(GAME_STATE_STORAGE_KEY)
  } catch {
    // Ignore storage errors.
  }
}
