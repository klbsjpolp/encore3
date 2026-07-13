import { afterEach, describe, expect, it, vi } from 'vitest'

import { BOARD_CONFIGURATIONS, getBoardConfiguration } from './boardConfigurations'
import { generateRandomBoard } from './randomBoardGenerator'
import { validateBoard } from './validateBoard'

// generateRandomBoard consumes Math.random in this order:
// 1 template pick, 2 mirrorH, 3 mirrorV, 4 rotate180, then 4 shuffle calls.
// Values >= 0.5 disable a transformation; 0.99 in the shuffle keeps colors as-is.
const mockRandomSequence = (values: number[]) => {
  const queue = [...values]
  vi.spyOn(Math, 'random').mockImplementation(() => queue.shift() ?? 0.99)
}

const IDENTITY_SHUFFLE = [0.99, 0.99, 0.99, 0.99]

describe('generateRandomBoard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the template unchanged when no transformation is applied', () => {
    mockRandomSequence([0, 0.9, 0.9, 0.9, ...IDENTITY_SHUFFLE])
    const classic = getBoardConfiguration('classic')

    const board = generateRandomBoard()

    expect(board.colorLayout).toEqual(classic.colorLayout)
    expect(board.starPositions).toEqual(classic.starPositions)
  })

  it('mirrors the template horizontally and remaps star columns', () => {
    mockRandomSequence([0, 0.1, 0.9, 0.9, ...IDENTITY_SHUFFLE])
    const classic = getBoardConfiguration('classic')

    const board = generateRandomBoard()

    expect(board.colorLayout).toEqual(classic.colorLayout.map((row) => [...row].reverse()))
    const expectedStars = new Set(
      [...classic.starPositions].map((pos) => {
        const [row, col] = pos.split(',').map(Number)
        return `${row},${14 - col}`
      }),
    )
    expect(board.starPositions).toEqual(expectedStars)
  })

  it('mirrors the template vertically and remaps star rows', () => {
    mockRandomSequence([0, 0.9, 0.1, 0.9, ...IDENTITY_SHUFFLE])
    const classic = getBoardConfiguration('classic')

    const board = generateRandomBoard()

    expect(board.colorLayout).toEqual([...classic.colorLayout].reverse())
    const expectedStars = new Set(
      [...classic.starPositions].map((pos) => {
        const [row, col] = pos.split(',').map(Number)
        return `${6 - row},${col}`
      }),
    )
    expect(board.starPositions).toEqual(expectedStars)
  })

  it('rotates the template 180 degrees and remaps stars', () => {
    mockRandomSequence([0, 0.9, 0.9, 0.1, ...IDENTITY_SHUFFLE])
    const classic = getBoardConfiguration('classic')

    const board = generateRandomBoard()

    expect(board.colorLayout).toEqual(
      classic.colorLayout.map((row) => [...row].reverse()).reverse(),
    )
    const expectedStars = new Set(
      [...classic.starPositions].map((pos) => {
        const [row, col] = pos.split(',').map(Number)
        return `${6 - row},${14 - col}`
      }),
    )
    expect(board.starPositions).toEqual(expectedStars)
  })

  it('can pick any official board as template', () => {
    mockRandomSequence([
      (BOARD_CONFIGURATIONS.length - 1) / BOARD_CONFIGURATIONS.length + 0.01,
      0.9,
      0.9,
      0.9,
      ...IDENTITY_SHUFFLE,
    ])
    const template = BOARD_CONFIGURATIONS[BOARD_CONFIGURATIONS.length - 1]

    const board = generateRandomBoard()

    expect(board.colorLayout).toEqual(template.colorLayout)
  })

  it('always produces a board satisfying the official constraints', () => {
    for (let i = 0; i < 20; i++) {
      const board = generateRandomBoard()
      const result = validateBoard({ ...board, id: 'random', fillClass: '' })
      // The checkerboard random template may be picked as source; it only
      // deviates on group sizes, so every other constraint must always hold.
      const errors = result.errors.filter((error) => !error.includes('groups of sizes'))
      expect(errors).toEqual([])
    }
  })
})
