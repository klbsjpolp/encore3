import { describe, expect, it } from 'vitest'

import { getBoardConfiguration } from '@/data/boardConfigurations'
import type { GameColor, Square } from '@/types/game'

import { checkColorCompletion, createInitialBoard, findConnectedGroup } from './board'

const makeBoard = (colors: GameColor[][], crossed: boolean[][] = []): Square[][] => {
  const rows = colors.length
  const cols = colors[0]?.length ?? 0
  const crossMap = crossed.length
    ? crossed
    : Array.from({ length: rows }, () => Array(cols).fill(false))

  return colors.map((row, rowIndex) =>
    row.map((color, colIndex) => ({
      color,
      hasStar: false,
      crossed: crossMap[rowIndex][colIndex] ?? false,
      column: String.fromCharCode(65 + colIndex),
      row: rowIndex,
    })),
  )
}

describe('encore-game/board', () => {
  it('creates a full board from static configurations', () => {
    const configuration = getBoardConfiguration('classic')
    if (!configuration) {
      throw new Error('Missing classic board configuration')
    }

    const board = createInitialBoard(configuration)

    expect(board).toHaveLength(7)
    expect(board[0]).toHaveLength(15)
    expect(board.flat().filter((cell) => cell.hasStar)).toHaveLength(15)
    expect(board.flat().every((cell) => !cell.crossed)).toBe(true)
  })

  it('validates color completion only when all cells of a color are crossed', () => {
    const board = makeBoard(
      [
        ['red', 'red', 'blue'],
        ['green', 'blue', 'red'],
      ],
      [
        [true, true, false],
        [false, false, false],
      ],
    )

    expect(checkColorCompletion(board, 'red')).toBe(false)

    board[1][2].crossed = true

    expect(checkColorCompletion(board, 'red')).toBe(true)
  })

  it('finds only orthogonally connected uncrossed cells of the same color', () => {
    const board = makeBoard(
      [
        ['red', 'red', 'blue'],
        ['red', 'blue', 'blue'],
        ['green', 'green', 'blue'],
      ],
      [
        [false, true, false],
        [false, false, false],
        [false, false, false],
      ],
    )

    const group = findConnectedGroup(0, 0, 'red', board).sort(
      (a, b) => a.row - b.row || a.col - b.col,
    )

    expect(group).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ])
  })
})
