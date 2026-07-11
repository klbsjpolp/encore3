import type { ColorDiceResult, GameColor, GameState, NumberDiceResult, Player } from '@/types/game'
import { DEFAULT_GAME_COLOR } from '@/types/game'

import { checkColorCompletion } from './board'
import { isValidMoveSelection } from './moveValidation'

export interface MoveApplication {
  players: Player[]
  claimedFirstColumnBonus: GameState['claimedFirstColumnBonus']
  claimedFirstColorBonus: GameState['claimedFirstColorBonus']
  claimedSecondColorBonus: GameState['claimedSecondColorBonus']
  pendingGameOver: boolean
}

export const resolveMoveColor = (
  colorDice: ColorDiceResult,
  moveSquares: { row: number; col: number }[],
  board: Player['board'],
): GameColor => {
  if (colorDice.value !== 'wild') {
    return colorDice.value
  }

  return moveSquares.length > 0
    ? board[moveSquares[0].row][moveSquares[0].col].color
    : DEFAULT_GAME_COLOR
}

export const applyMoveToState = (
  state: GameState,
  moveSquares: { row: number; col: number }[],
  selectedDice: { color: ColorDiceResult; number: NumberDiceResult },
  selectedFromJoker: { color: boolean; number: boolean },
): MoveApplication | null => {
  const { currentPlayer, players, claimedFirstColumnBonus, claimedFirstColorBonus } = state
  const claimedSecondColorBonus = state.claimedSecondColorBonus
  const player = players[currentPlayer]

  const colorValue = resolveMoveColor(selectedDice.color, moveSquares, player.board)
  const numberValue =
    selectedDice.number.value === 'wild' ? moveSquares.length : selectedDice.number.value

  if (
    moveSquares.length !== numberValue ||
    !isValidMoveSelection(moveSquares, colorValue, player.board)
  ) {
    return null
  }

  const jokersUsed = (selectedFromJoker.color ? 1 : 0) + (selectedFromJoker.number ? 1 : 0)
  if (jokersUsed > player.jokersRemaining) {
    return null
  }

  const newClaimedFirstColumnBonus = { ...claimedFirstColumnBonus }
  const newClaimedFirstColorBonus = { ...claimedFirstColorBonus }
  const newClaimedSecondColorBonus = { ...claimedSecondColorBonus }
  const newPlayers = players.map((p, index) => {
    if (index !== currentPlayer) {
      return p
    }
    const newBoard = p.board.map((row) => row.map((cell) => ({ ...cell })))
    let starsCollected = p.starsCollected
    const newCompletedColumnsFirst = [...p.completedColumnsFirst]
    const newCompletedColumnsNotFirst = [...p.completedColumnsNotFirst]

    moveSquares.forEach(({ row, col }) => {
      if (!newBoard[row][col].crossed) {
        newBoard[row][col].crossed = true
        if (newBoard[row][col].hasStar) {
          starsCollected++
        }
      }
    })

    for (let col = 0; col < newBoard[0].length; col++) {
      const column = String.fromCharCode(65 + col)
      if (
        !newCompletedColumnsFirst.includes(column) &&
        !newCompletedColumnsNotFirst.includes(column)
      ) {
        if (newBoard.every((row) => row[col].crossed)) {
          if (!newClaimedFirstColumnBonus[column]) {
            newClaimedFirstColumnBonus[column] = p.id
            newCompletedColumnsFirst.push(column)
          } else {
            newCompletedColumnsNotFirst.push(column)
          }
        }
      }
    }

    const newCompletedColorsFirst = [...p.completedColorsFirst]
    const newCompletedColorsNotFirst = [...p.completedColorsNotFirst]
    const completedColors = [...p.completedColors]
    if (checkColorCompletion(newBoard, colorValue) && !completedColors.includes(colorValue)) {
      completedColors.push(colorValue)
      if (!newClaimedFirstColorBonus[colorValue]) {
        newClaimedFirstColorBonus[colorValue] = p.id
        newCompletedColorsFirst.push(colorValue)
      } else if (
        !newClaimedSecondColorBonus[colorValue] &&
        newClaimedFirstColorBonus[colorValue] !== p.id
      ) {
        newClaimedSecondColorBonus[colorValue] = p.id
        newCompletedColorsNotFirst.push(colorValue)
      }
    }

    return {
      ...p,
      board: newBoard,
      starsCollected,
      completedColors,
      completedColorsFirst: newCompletedColorsFirst,
      completedColorsNotFirst: newCompletedColorsNotFirst,
      completedColumnsFirst: newCompletedColumnsFirst,
      completedColumnsNotFirst: newCompletedColumnsNotFirst,
      jokersRemaining: p.jokersRemaining - jokersUsed,
    }
  })

  const updatedPlayer = newPlayers[currentPlayer]

  return {
    players: newPlayers,
    claimedFirstColumnBonus: newClaimedFirstColumnBonus,
    claimedFirstColorBonus: newClaimedFirstColorBonus,
    claimedSecondColorBonus: newClaimedSecondColorBonus,
    pendingGameOver: state.pendingGameOver || updatedPlayer.completedColors.length >= 2,
  }
}
