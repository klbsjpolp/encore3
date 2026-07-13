import { describe, expect, it } from 'vitest'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import type { GameColor, GameState, Player, Square } from '@/types/game'

import { getGameStateMessage, getGameStatusLabel } from './encoreGameStatus'

const makeBoard = (colors: GameColor[][]): Square[][] =>
  colors.map((row, rowIndex) =>
    row.map((color, colIndex) => ({
      color,
      hasStar: false,
      crossed: false,
      column: String.fromCharCode(65 + colIndex),
      row: rowIndex,
    })),
  )

const mockBoardConfig = (colors: GameColor[][]): BoardConfiguration => ({
  id: 'classic',
  fillClass: 'mock',
  colorLayout: colors,
  starPositions: new Set<string>(),
})

const makePlayer = (id: string, name: string): Player => {
  const colors: GameColor[][] = [['red']]

  return {
    id,
    name,
    isAI: false,
    board: makeBoard(colors),
    boardConfiguration: mockBoardConfig(colors),
    starsCollected: 0,
    completedColors: [],
    completedColorsFirst: [],
    completedColorsNotFirst: [],
    completedColumnsFirst: [],
    completedColumnsNotFirst: [],
    jokersRemaining: 0,
  }
}

const createState = (overrides: Partial<GameState> = {}): GameState => ({
  players: [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob')],
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
  ...overrides,
})

describe('getGameStateMessage', () => {
  it('describes each human phase', () => {
    expect(getGameStateMessage(createState({ phase: 'player-switching' }))).toBe(
      'Changement de joueur...',
    )
    expect(getGameStateMessage(createState({ phase: 'rolling' }))).toBe('Lancer les dés')
    expect(getGameStateMessage(createState({ phase: 'active-selection' }))).toBe(
      'Tour du joueur actif',
    )
    expect(getGameStateMessage(createState({ phase: 'passive-selection' }))).toBe(
      'Tour des joueurs passifs',
    )
  })

  it('announces a single winner at game over', () => {
    const winner = makePlayer('p1', 'Alice')
    const message = getGameStateMessage(
      createState({ phase: 'game-over', winner, winners: [winner] }),
    )

    expect(message).toBe('🎉 Alice gagne ! 🎉')
  })

  it('announces a tie with every winner name', () => {
    const winners = [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob')]
    const message = getGameStateMessage(createState({ phase: 'game-over', winners }))

    expect(message).toBe('🤝 Égalité : Alice, Bob')
  })

  it('returns null for AI phases', () => {
    expect(getGameStateMessage(createState({ phase: 'rolling-ai' }))).toBeNull()
    expect(getGameStateMessage(createState({ phase: 'active-selection-ai' }))).toBeNull()
    expect(getGameStateMessage(createState({ phase: 'passive-selection-ai' }))).toBeNull()
  })
})

describe('getGameStatusLabel', () => {
  it('labels each human phase', () => {
    expect(getGameStatusLabel(createState({ phase: 'player-switching' }))).toBe('Changement...')
    expect(getGameStatusLabel(createState({ phase: 'rolling' }))).toBe('Lancer dés')
    expect(getGameStatusLabel(createState({ phase: 'active-selection' }))).toBe('Joueur actif')
    expect(getGameStatusLabel(createState({ phase: 'passive-selection' }))).toBe('Joueurs passifs')
  })

  it('labels game over with the winner or a tie', () => {
    const winner = makePlayer('p1', 'Alice')
    expect(getGameStatusLabel(createState({ phase: 'game-over', winner, winners: [winner] }))).toBe(
      'Alice gagne !',
    )

    const winners = [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob')]
    expect(getGameStatusLabel(createState({ phase: 'game-over', winners }))).toBe('Égalité')
  })

  it('falls back to a generic label for AI phases', () => {
    expect(getGameStatusLabel(createState({ phase: 'rolling-ai' }))).toBe('En cours')
    expect(getGameStatusLabel(createState({ phase: 'active-selection-ai' }))).toBe('En cours')
  })
})
