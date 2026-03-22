import type { BoardConfiguration } from '@/data/boardConfigurations'
import { generateRandomBoard } from '@/data/randomBoardGenerator.ts'
import type { GameColor, Square } from '@/types/game'

export const createInitialBoard = (boardConfiguration: BoardConfiguration): Square[][] => {
  const { colorLayout, starPositions } =
    boardConfiguration.id === 'random' ? generateRandomBoard() : boardConfiguration
  const board: Square[][] = []
  for (let row = 0; row < colorLayout.length; row++) {
    const boardRow: Square[] = []
    for (let col = 0; col < colorLayout[0].length; col++) {
      boardRow.push({
        color: colorLayout[row][col],
        hasStar: starPositions.has(`${row},${col}`),
        crossed: false,
        column: String.fromCharCode(65 + col),
        row,
      })
    }
    board.push(boardRow)
  }
  return board
}

export const checkColorCompletion = (board: Square[][], color: GameColor): boolean => {
  return board.every((row) => row.every((square) => square.color !== color || square.crossed))
}

export const findConnectedGroup = (
  startRow: number,
  startCol: number,
  color: GameColor,
  board: Square[][],
): { row: number; col: number }[] => {
  if (
    startRow < 0 ||
    startRow >= board.length ||
    startCol < 0 ||
    startCol >= board[0].length ||
    board[startRow][startCol].color !== color ||
    board[startRow][startCol].crossed
  ) {
    return []
  }

  const group: { row: number; col: number }[] = []
  const queue = [{ row: startRow, col: startCol }]
  const visited = new Set<string>([`${startRow},${startCol}`])

  while (queue.length > 0) {
    const next = queue.shift()
    if (!next) {
      continue
    }
    const { row, col } = next
    group.push({ row, col })

    const neighbors = [
      { r: row - 1, c: col },
      { r: row + 1, c: col },
      { r: row, c: col - 1 },
      { r: row, c: col + 1 },
    ]

    for (const n of neighbors) {
      const key = `${n.r},${n.c}`
      if (
        n.r >= 0 &&
        n.r < board.length &&
        n.c >= 0 &&
        n.c < board[0].length &&
        !visited.has(key) &&
        board[n.r][n.c].color === color &&
        !board[n.r][n.c].crossed
      ) {
        visited.add(key)
        queue.push({ row: n.r, col: n.c })
      }
    }
  }

  return group
}
