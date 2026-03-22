import type { BoardConfiguration, BoardId } from '@/data/boardConfigurations.ts'

export const GAME_COLORS = ['yellow', 'green', 'blue', 'red', 'orange'] as const
export type GameColor = (typeof GAME_COLORS)[number]

export const DICE_COLOR_FACES = [...GAME_COLORS, 'wild'] as const
export type DiceColor = (typeof DICE_COLOR_FACES)[number]

export const DICE_NUMBER_VALUES = [1, 2, 3, 4, 5] as const
export type DiceNumberValue = (typeof DICE_NUMBER_VALUES)[number]

export const DICE_NUMBER_FACES = [...DICE_NUMBER_VALUES, 'wild'] as const
export type DiceNumber = (typeof DICE_NUMBER_FACES)[number]

export const DEFAULT_GAME_COLOR: GameColor = GAME_COLORS[0]

export interface Square {
  color: GameColor
  hasStar: boolean
  crossed: boolean
  column: string
  row: number
}

interface BaseDiceResult {
  id: string
  selected: boolean
}

export interface ColorDiceResult extends BaseDiceResult {
  type: 'color'
  value: DiceColor
}

export interface NumberDiceResult extends BaseDiceResult {
  type: 'number'
  value: DiceNumber
}

export type DiceResult = ColorDiceResult | NumberDiceResult

export interface Player {
  id: string
  name: string
  isAI: boolean
  board: Square[][]
  boardConfiguration: BoardConfiguration
  boardId?: BoardId
  starsCollected: number
  completedColors: GameColor[]
  completedColorsFirst: GameColor[]
  completedColorsNotFirst: GameColor[]
  completedColumnsFirst: string[]
  completedColumnsNotFirst: string[]
  jokersRemaining: number
}

export type GamePhase =
  | 'rolling'
  | 'active-selection'
  | 'passive-selection'
  | 'player-switching'
  | 'game-over'

export type AIPhase = 'rolling-ai' | 'active-selection-ai' | 'passive-selection-ai'

export interface GameState {
  players: Player[]
  currentPlayer: number
  activePlayer: number
  phase: GamePhase | AIPhase
  lastPhase?: GamePhase | AIPhase
  dice: DiceResult[]
  selectedDice: { color: ColorDiceResult | null; number: NumberDiceResult | null }
  selectedFromJoker: { color: boolean; number: boolean }
  gameStarted: boolean
  winner: Player | null
  winners: Player[]
  pendingGameOver: boolean
  claimedFirstColumnBonus: Record<string, string> // Maps column char to player ID
  claimedFirstColorBonus: Partial<Record<GameColor, string>> // Maps color to first finisher player ID
  claimedSecondColorBonus: Partial<Record<GameColor, string>> // Maps color to second finisher player ID
}

export interface GameMove {
  playerId: string
  colorDice: ColorDiceResult
  numberDice: NumberDiceResult
  squares: { row: number; col: number }[]
}
