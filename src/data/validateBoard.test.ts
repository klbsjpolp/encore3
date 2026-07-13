import { describe, expect, it } from 'vitest'

import type { GameColor } from '@/types/game'

import type { BoardConfiguration } from './boardConfigurations'
import { BOARD_CONFIGURATIONS, getBoardConfiguration } from './boardConfigurations'
import { validateBoard } from './validateBoard'

const cloneBoard = (config: BoardConfiguration): BoardConfiguration => ({
  ...config,
  colorLayout: config.colorLayout.map((row) => [...row]),
  starPositions: new Set(config.starPositions),
})

describe('validateBoard', () => {
  it('accepts every official board configuration', () => {
    for (const config of BOARD_CONFIGURATIONS) {
      if (config.id === 'random') {
        continue
      }
      const result = validateBoard(config)
      expect(result.errors, `board ${config.id}`).toEqual([])
      expect(result.valid, `board ${config.id}`).toBe(true)
    }
  })

  it('only reports group sizes for the checkerboard random template', () => {
    // The random template intentionally uses single-cell groups; every other
    // constraint (dimensions, color counts, stars) must still hold.
    const result = validateBoard(getBoardConfiguration('random'))

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(5)
    for (const error of result.errors) {
      expect(error).toContain('must have groups of sizes [1,2,3,4,5,6]')
    }
  })

  it('rejects a board without exactly 7 rows', () => {
    const board = cloneBoard(getBoardConfiguration('classic'))
    board.colorLayout = [...board.colorLayout, board.colorLayout[6].slice()]

    const result = validateBoard(board)
    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('Board must have 7 rows, found 8')
  })

  it('rejects a row without exactly 15 columns', () => {
    const board = cloneBoard(getBoardConfiguration('classic'))
    board.colorLayout[2] = board.colorLayout[2].slice(0, 14)

    const result = validateBoard(board)
    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('Row 2 must have 15 columns, found 14')
  })

  it('rejects an invalid color', () => {
    const board = cloneBoard(getBoardConfiguration('classic'))
    board.colorLayout[0][0] = 'purple' as GameColor

    const result = validateBoard(board)
    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('Invalid color found: purple')
  })

  it('rejects unbalanced color counts and broken group sizes', () => {
    const board = cloneBoard(getBoardConfiguration('classic'))
    const original = board.colorLayout[0][0]
    const replacement = (['yellow', 'green'] as const).find((color) => color !== original)
    if (!replacement) {
      throw new Error('Expected a replacement color')
    }
    board.colorLayout[0][0] = replacement

    const result = validateBoard(board)
    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain(`Color ${original} must have exactly 21 cells`)
    expect(result.errors.join('\n')).toContain(`Color ${replacement} must have exactly 21 cells`)
    expect(result.errors.join('\n')).toContain('must have groups of sizes [1,2,3,4,5,6]')
  })

  it('rejects a board without exactly 15 stars', () => {
    const board = cloneBoard(getBoardConfiguration('classic'))
    const [firstStar] = board.starPositions
    board.starPositions.delete(firstStar)

    const result = validateBoard(board)
    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('Board must have exactly 15 stars, found 14')
    expect(result.errors.join('\n')).toContain('Each column must have exactly one star')
  })

  it('rejects an out-of-bounds star position', () => {
    const board = cloneBoard(getBoardConfiguration('classic'))
    const [firstStar] = board.starPositions
    board.starPositions.delete(firstStar)
    board.starPositions.add('9,20')

    const result = validateBoard(board)
    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('Invalid star position: 9,20')
  })

  it('rejects two stars in the same column and unbalanced stars per color', () => {
    const board = cloneBoard(getBoardConfiguration('classic'))
    const stars = [...board.starPositions].map((pos) => pos.split(',').map(Number))
    const [firstRow, firstCol] = stars[0]
    const [, secondCol] = stars[1]
    board.starPositions.delete(`${firstRow},${firstCol}`)

    // Add a second star in another starred column, on a different row.
    const newRow = (firstRow + 1) % 7
    board.starPositions.add(`${newRow},${secondCol}`)

    const result = validateBoard(board)
    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('Each column must have exactly one star')
  })

  it('rejects two stars inside the same color group', () => {
    const board = cloneBoard(getBoardConfiguration('classic'))

    // Find a group of at least 2 cells containing a star, then add a second
    // star on an adjacent same-color cell.
    const stars = [...board.starPositions].map((pos) => pos.split(',').map(Number))
    let added = false
    for (const [row, col] of stars) {
      const color = board.colorLayout[row][col]
      const neighbors = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ]
      for (const [r, c] of neighbors) {
        if (
          r >= 0 &&
          r < 7 &&
          c >= 0 &&
          c < 15 &&
          board.colorLayout[r][c] === color &&
          !board.starPositions.has(`${r},${c}`)
        ) {
          board.starPositions.add(`${r},${c}`)
          added = true
          break
        }
      }
      if (added) {
        break
      }
    }
    expect(added).toBe(true)

    const result = validateBoard(board)
    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('must not have more than 1 star in a single group')
  })
})
