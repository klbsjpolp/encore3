import { describe, expect, it } from 'vitest'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import type { GameColor, Player, Square } from '@/types/game'

import {
  calculateColorsScore,
  calculateColumnScore,
  calculateFinalScore,
  calculateStarPenalty,
  determineWinners,
  FIRST_COLOR_COMPLETION_POINTS,
  getColorCompletionPoints,
  SECOND_COLOR_COMPLETION_POINTS,
  TOTAL_STARS,
} from './scoring'

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

const makePlayer = (overrides: Partial<Player> = {}): Player => {
  const colors: GameColor[][] = [
    ['red', 'red', 'blue'],
    ['green', 'yellow', 'orange'],
  ]

  return {
    id: 'p1',
    name: 'Tester',
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
    ...overrides,
  }
}

describe('encore-game/scoring', () => {
  it('calculates column score from first and second completion tables', () => {
    const player = makePlayer({
      completedColumnsFirst: ['A', 'O'],
      completedColumnsNotFirst: ['B', 'I'],
    })

    expect(calculateColumnScore(player)).toBe(13)
  })

  it('calculates final score and its parts consistently', () => {
    const player = makePlayer({
      jokersRemaining: 3,
      starsCollected: 10,
      completedColorsFirst: ['red', 'blue'],
      completedColorsNotFirst: ['green'],
      completedColumnsFirst: ['A'],
      completedColumnsNotFirst: ['B', 'I'],
    })

    expect(calculateFinalScore(player)).toEqual({
      columnsScore: 8,
      jokersScore: 3,
      colorsScore: 13,
      starPenalty: (TOTAL_STARS - 10) * 2,
      totalScore: 14,
    })
  })

  it('applies a 2-point penalty for each missing star', () => {
    const player = makePlayer({ starsCollected: 13 })

    expect(calculateStarPenalty(player)).toBe(4)
  })

  it('awards color completion points based on finishing order', () => {
    const player = makePlayer({
      completedColorsFirst: ['red'],
      completedColorsNotFirst: ['blue'],
    })

    expect(getColorCompletionPoints(player, 'red')).toBe(FIRST_COLOR_COMPLETION_POINTS)
    expect(getColorCompletionPoints(player, 'blue')).toBe(SECOND_COLOR_COMPLETION_POINTS)
    expect(getColorCompletionPoints(player, 'green')).toBe(0)
  })

  it('sums color completion points for the colors score', () => {
    const player = makePlayer({
      completedColorsFirst: ['red', 'blue'],
      completedColorsNotFirst: ['green'],
    })

    expect(calculateColorsScore(player)).toBe(
      2 * FIRST_COLOR_COMPLETION_POINTS + SECOND_COLOR_COMPLETION_POINTS,
    )
  })

  it('returns no winner for an empty player list', () => {
    expect(determineWinners([])).toEqual([])
  })

  it('breaks ties by remaining jokers', () => {
    const playerA = makePlayer({
      id: 'p1',
      jokersRemaining: 2,
      starsCollected: 15,
      completedColumnsFirst: ['A'],
    })
    const playerB = makePlayer({
      id: 'p2',
      jokersRemaining: 4,
      starsCollected: 15,
      completedColumnsFirst: ['C'],
    })

    expect(determineWinners([playerA, playerB]).map((player) => player.id)).toEqual(['p2'])
  })
})
