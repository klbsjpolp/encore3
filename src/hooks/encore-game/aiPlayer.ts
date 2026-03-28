import { getSelectionLimit } from '@/lib/game-rules'
import type {
  ColorDiceResult,
  DiceResult,
  GameColor,
  GameState,
  NumberDiceResult,
  Square,
} from '@/types/game'
import { GAME_COLORS } from '@/types/game'

export interface AIMove {
  color: ColorDiceResult
  number: NumberDiceResult
  squares: { row: number; col: number }[]
}

const isColorDice = (dice: DiceResult): dice is ColorDiceResult => dice.type === 'color'
const isNumberDice = (dice: DiceResult): dice is NumberDiceResult => dice.type === 'number'

const findConnectedComponents = (
  board: Square[][],
  color: GameColor,
): { row: number; col: number }[][] => {
  const components: { row: number; col: number }[][] = []
  const visited = new Set<string>()

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (board[r][c].color === color && !board[r][c].crossed && !visited.has(`${r},${c}`)) {
        const component: { row: number; col: number }[] = []
        const queue = [{ row: r, col: c }]
        visited.add(`${r},${c}`)

        let head = 0
        while (head < queue.length) {
          const current = queue[head++]
          component.push(current)

          const neighbors = [
            { row: current.row - 1, col: current.col },
            { row: current.row + 1, col: current.col },
            { row: current.row, col: current.col - 1 },
            { row: current.row, col: current.col + 1 },
          ]

          for (const neighbor of neighbors) {
            const key = `${neighbor.row},${neighbor.col}`
            if (
              neighbor.row >= 0 &&
              neighbor.row < board.length &&
              neighbor.col >= 0 &&
              neighbor.col < board[0].length &&
              !visited.has(key) &&
              board[neighbor.row][neighbor.col].color === color &&
              !board[neighbor.row][neighbor.col].crossed
            ) {
              visited.add(key)
              queue.push(neighbor)
            }
          }
        }

        components.push(component)
      }
    }
  }

  return components
}

const countUncrossedForColor = (board: Square[][], color: GameColor): number => {
  let count = 0

  for (const row of board) {
    for (const square of row) {
      if (square.color === color && !square.crossed) {
        count++
      }
    }
  }

  return count
}

const countUncrossedInColumn = (board: Square[][], col: number): number => {
  let count = 0

  for (const row of board) {
    if (!row[col].crossed) {
      count++
    }
  }

  return count
}

const getCandidateMoveSizes = (number: NumberDiceResult, componentSize: number): number[] => {
  if (typeof number.value === 'number') {
    return componentSize >= number.value ? [number.value] : []
  }

  const maxSelection = Math.min(componentSize, getSelectionLimit(number.value))

  return Array.from({ length: maxSelection }, (_, index) => index + 1)
}

export const computeBestAIMove = (
  gameState: GameState,
  isValidMove: (
    squares: { row: number; col: number }[],
    color: GameColor,
    playerBoard: Square[][],
  ) => boolean,
): AIMove | null => {
  const currentPlayer = gameState.players[gameState.currentPlayer]
  if (!currentPlayer.isAI) {
    return null
  }

  const availableColorDice = gameState.dice.filter(isColorDice).filter((die) => !die.selected)
  const availableNumberDice = gameState.dice.filter(isNumberDice).filter((die) => !die.selected)

  const possibleMoves: (AIMove & { score: number })[] = []

  for (const colorDice of availableColorDice) {
    for (const numberDice of availableNumberDice) {
      const jokersNeededForCombo =
        (colorDice.value === 'wild' ? 1 : 0) + (numberDice.value === 'wild' ? 1 : 0)
      if (jokersNeededForCombo > currentPlayer.jokersRemaining) {
        continue
      }

      const colorsToConsider: GameColor[] =
        colorDice.value === 'wild' ? [...GAME_COLORS] : [colorDice.value as GameColor]

      for (const color of colorsToConsider) {
        const components = findConnectedComponents(currentPlayer.board, color)

        for (const component of components) {
          const candidateMoveSizes = getCandidateMoveSizes(numberDice, component.length)

          for (const moveSize of candidateMoveSizes) {
            const candidateSquares = component.slice(0, moveSize)

            if (!isValidMove(candidateSquares, color, currentPlayer.board)) {
              continue
            }

            let score = moveSize

            if (component.length === moveSize) {
              score += 50
            }

            const uncrossedInColor = countUncrossedForColor(currentPlayer.board, color)
            if (uncrossedInColor > 0 && uncrossedInColor <= moveSize) {
              score += 200
            }

            const columnsInMove = [...new Set(candidateSquares.map((square) => square.col))]
            for (const col of columnsInMove) {
              const uncrossedInCol = countUncrossedInColumn(currentPlayer.board, col)
              const markingInCol = candidateSquares.filter((square) => square.col === col).length
              if (uncrossedInCol > 0 && uncrossedInCol <= markingInCol) {
                score += 100
              }
            }

            if (colorDice.value === 'wild') {
              score -= 5
            }

            possibleMoves.push({
              color: colorDice,
              number: numberDice,
              squares: candidateSquares,
              score,
            })
          }
        }
      }
    }
  }

  if (possibleMoves.length === 0) {
    return null
  }

  possibleMoves.sort((firstMove, secondMove) => secondMove.score - firstMove.score)

  const { score: _score, ...bestMove } = possibleMoves[0]

  return bestMove
}
