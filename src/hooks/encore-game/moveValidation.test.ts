import { describe, expect, it } from 'vitest'

import type { GameColor, Square } from '@/types/game'

import { isValidMoveSelection } from './moveValidation'

const makeBoard = (rows = 7, cols = 15, color: GameColor = 'orange'): Square[][] =>
  Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      color,
      hasStar: false,
      crossed: false,
      column: String.fromCharCode(65 + col),
      row,
    })),
  )

describe('encore-game/moveValidation', () => {
  it('rejects empty selections and oversized selections', () => {
    const board = makeBoard()

    expect(isValidMoveSelection([], 'orange', board)).toBe(false)
    expect(
      isValidMoveSelection(
        [
          { row: 0, col: 7 },
          { row: 0, col: 8 },
          { row: 0, col: 9 },
          { row: 0, col: 10 },
          { row: 0, col: 11 },
          { row: 0, col: 12 },
        ],
        'orange',
        board,
      ),
    ).toBe(false)
  })

  it('accepts connected selections touching the starting column', () => {
    const board = makeBoard()

    expect(
      isValidMoveSelection(
        [
          { row: 2, col: 7 },
          { row: 2, col: 8 },
        ],
        'orange',
        board,
      ),
    ).toBe(true)
  })

  it('rejects disconnected selections', () => {
    const board = makeBoard()

    expect(
      isValidMoveSelection(
        [
          { row: 2, col: 7 },
          { row: 2, col: 9 },
        ],
        'orange',
        board,
      ),
    ).toBe(false)
  })

  it('requires adjacency to an already crossed cell when not touching starting column', () => {
    const board = makeBoard()

    expect(
      isValidMoveSelection(
        [
          { row: 4, col: 4 },
          { row: 4, col: 5 },
        ],
        'orange',
        board,
      ),
    ).toBe(false)

    board[4][3].crossed = true

    expect(
      isValidMoveSelection(
        [
          { row: 4, col: 4 },
          { row: 4, col: 5 },
        ],
        'orange',
        board,
      ),
    ).toBe(true)
  })
})
