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

import { findConnectedGroup } from './board'
import { isValidMoveSelection } from './moveValidation'

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
        const component = findConnectedGroup(r, c, color, board)
        for (const square of component) {
          visited.add(`${square.row},${square.col}`)
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

export const computeBestAIMove = (gameState: GameState): AIMove | null => {
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
          if (candidateMoveSizes.length === 0) {
            continue
          }

          // A valid selection must touch the start column or a crossed square,
          // so try a candidate anchored on each square of the component instead
          // of only the component's scan-order prefix.
          const seenCandidates = new Set<string>()
          for (const startSquare of component) {
            const orderedGroup = findConnectedGroup(
              startSquare.row,
              startSquare.col,
              color,
              currentPlayer.board,
            )

            for (const moveSize of candidateMoveSizes) {
              const candidateSquares = orderedGroup.slice(0, moveSize)
              const candidateKey = candidateSquares
                .map((square) => `${square.row},${square.col}`)
                .sort()
                .join('|')
              if (seenCandidates.has(candidateKey)) {
                continue
              }
              seenCandidates.add(candidateKey)

              if (!isValidMoveSelection(candidateSquares, color, currentPlayer.board)) {
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
  }

  if (possibleMoves.length === 0) {
    return null
  }

  possibleMoves.sort((firstMove, secondMove) => secondMove.score - firstMove.score)

  const { score: _score, ...bestMove } = possibleMoves[0]

  return bestMove
}
