import { MAX_SELECTABLE_CELLS } from '@/lib/game-rules'
import type { GameColor, Square } from '@/types/game'

export const isValidMoveSelection = (
  squares: { row: number; col: number }[],
  color: GameColor,
  playerBoard: Square[][],
): boolean => {
  if (squares.length === 0) {
    return false
  }
  if (squares.length > MAX_SELECTABLE_CELLS) {
    return false
  }
  if (
    !squares.every(
      ({ row, col }) => playerBoard[row][col].color === color && !playerBoard[row][col].crossed,
    )
  ) {
    return false
  }

  if (squares.length > 1) {
    const visited = new Set<string>()
    const toVisit = [squares[0]]
    visited.add(`${squares[0].row},${squares[0].col}`)
    while (toVisit.length > 0) {
      const current = toVisit.pop()
      if (!current) {
        continue
      }
      const neighbors = [
        { r: current.row - 1, c: current.col },
        { r: current.row + 1, c: current.col },
        { r: current.row, c: current.col - 1 },
        { r: current.row, c: current.col + 1 },
      ]
      for (const { r, c } of neighbors) {
        const key = `${r},${c}`
        if (!visited.has(key) && squares.some((s) => s.row === r && s.col === c)) {
          visited.add(key)
          toVisit.push({ row: r, col: c })
        }
      }
    }
    if (visited.size !== squares.length) {
      return false
    }
  }

  if (!squares.some(({ col }) => col === 7)) {
    const hasAdjacency = squares.some(({ row, col }) => {
      const neighbors = [
        { r: row - 1, c: col },
        { r: row + 1, c: col },
        { r: row, c: col - 1 },
        { r: row, c: col + 1 },
      ]
      return neighbors.some(
        ({ r, c }) =>
          r >= 0 &&
          r < playerBoard.length &&
          c >= 0 &&
          c < playerBoard[0].length &&
          playerBoard[r][c].crossed,
      )
    })
    if (!hasAdjacency) {
      return false
    }
  }

  return true
}
