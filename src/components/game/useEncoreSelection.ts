import { useCallback, useState } from 'react'

import { findConnectedGroup } from '@/hooks/useEncoreGame'
import { getSelectionLimit, MAX_SELECTABLE_CELLS } from '@/lib/game-rules'
import type { DiceColor, DiceNumber, GameColor, GameState, Square } from '@/types/game'
import { DEFAULT_GAME_COLOR, GAME_COLORS } from '@/types/game'

interface UseEncoreSelectionArgs {
  gameState: GameState
  makeMove: (squares?: { row: number; col: number }[]) => void
  skipTurn: () => void
  isValidMove: (
    squares: { row: number; col: number }[],
    color: GameColor,
    playerBoard: Square[][],
  ) => boolean
}

export const useEncoreSelection = ({
  gameState,
  makeMove,
  skipTurn,
  isValidMove,
}: UseEncoreSelectionArgs) => {
  const [selectedSquares, _setSelectedSquares] = useState<{ row: number; col: number }[]>([])
  const [hoveredSquares, setHoveredSquares] = useState<{ row: number; col: number }[]>([])

  const setSelectedSquares = useCallback((squares: { row: number; col: number }[]) => {
    const deduped: { row: number; col: number }[] = []
    for (const square of squares) {
      if (!deduped.some((existing) => existing.row === square.row && existing.col === square.col)) {
        deduped.push(square)
        if (deduped.length >= MAX_SELECTABLE_CELLS) {
          break
        }
      }
    }
    _setSelectedSquares(deduped)
  }, [])

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (gameState.phase !== 'active-selection' && gameState.phase !== 'passive-selection') {
        return
      }

      const player = gameState.players[gameState.currentPlayer]
      const clickedColor = player.board[row][col].color
      const group = findConnectedGroup(row, col, clickedColor, player.board)
      const square = { row, col }
      const isSelected = selectedSquares.some((s) => s.row === row && s.col === col)
      const isSubsetSelection = isSelected && group.length > selectedSquares.length

      if (isSubsetSelection) {
        setSelectedSquares(selectedSquares.filter((s) => !(s.row === row && s.col === col)))
        return
      }

      const selectedColor = gameState.selectedDice.color?.value
      const numberValue = gameState.selectedDice.number?.value
      const colorMatches =
        !selectedColor || selectedColor === 'wild' || selectedColor === clickedColor
      const clickSelectableGroup = (() => {
        if (!numberValue || !colorMatches) {
          return null
        }

        if (numberValue === 'wild') {
          if (
            group.length <= MAX_SELECTABLE_CELLS &&
            isValidMove(group, clickedColor, player.board)
          ) {
            return group
          }

          return null
        }

        if (group.length === numberValue && isValidMove(group, clickedColor, player.board)) {
          return group
        }

        return null
      })()

      const isClickOnValidHoveredGroup =
        hoveredSquares.length > 0 &&
        hoveredSquares.some((s) => s.row === row && s.col === col) &&
        numberValue &&
        hoveredSquares.length <= MAX_SELECTABLE_CELLS &&
        (numberValue === 'wild' || hoveredSquares.length === numberValue) &&
        colorMatches

      const groupToSelect = isClickOnValidHoveredGroup ? hoveredSquares : clickSelectableGroup

      if (groupToSelect) {
        const isGroupAlreadySelected =
          selectedSquares.length === groupToSelect.length &&
          groupToSelect.every((candidate) =>
            selectedSquares.some((ss) => ss.row === candidate.row && ss.col === candidate.col),
          )

        setSelectedSquares(isGroupAlreadySelected ? [] : [...groupToSelect])
        return
      }

      if (isSelected) {
        setSelectedSquares(selectedSquares.filter((s) => !(s.row === row && s.col === col)))
        return
      }

      const maxNumber = getSelectionLimit(numberValue)
      if (selectedSquares.length >= maxNumber) {
        return
      }

      setSelectedSquares([...selectedSquares, square])
    },
    [
      gameState.currentPlayer,
      gameState.phase,
      gameState.players,
      gameState.selectedDice.color,
      gameState.selectedDice.number,
      hoveredSquares,
      isValidMove,
      selectedSquares,
      setSelectedSquares,
    ],
  )

  const handleSquareHover = useCallback(
    (row: number, col: number) => {
      if (gameState.phase !== 'active-selection' && gameState.phase !== 'passive-selection') {
        return
      }
      if (!gameState.selectedDice.color || !gameState.selectedDice.number) {
        return
      }

      const player = gameState.players[gameState.currentPlayer]
      const color = player.board[row][col].color
      const selectedColor = gameState.selectedDice.color.value

      if (selectedColor !== 'wild' && selectedColor !== color) {
        setHoveredSquares([])
        return
      }

      const group = findConnectedGroup(row, col, color, player.board)
      const numberValue = gameState.selectedDice.number.value

      if (numberValue === 'wild') {
        if (group.length <= MAX_SELECTABLE_CELLS && isValidMove(group, color, player.board)) {
          setHoveredSquares(group)
        } else {
          setHoveredSquares([])
        }
        return
      }

      if (group.length === numberValue) {
        if (isValidMove(group, color, player.board)) {
          setHoveredSquares(group)
        } else {
          setHoveredSquares([])
        }
        return
      }

      const selectedFromGroup = selectedSquares.filter((s) =>
        group.some((c) => s.row === c.row && s.col === c.col),
      )
      if (selectedFromGroup.length > 0) {
        const isAlreadyInSelection = selectedFromGroup.some((s) => s.row === row && s.col === col)
        setHoveredSquares(
          isAlreadyInSelection ? selectedFromGroup : [...selectedFromGroup, { row, col }],
        )
      } else if (group.length > numberValue) {
        if (isValidMove([{ row, col }], color, player.board)) {
          setHoveredSquares([{ row, col }])
        } else {
          setHoveredSquares([])
        }
      } else {
        setHoveredSquares([])
      }
    },
    [
      gameState.currentPlayer,
      gameState.phase,
      gameState.players,
      gameState.selectedDice.color,
      gameState.selectedDice.number,
      isValidMove,
      selectedSquares,
    ],
  )

  const handleSquareLeave = useCallback(() => {
    setHoveredSquares([])
  }, [])

  const handleConfirmMove = useCallback(() => {
    makeMove(selectedSquares)
    setSelectedSquares([])
  }, [makeMove, selectedSquares, setSelectedSquares])

  const canMakeMove = useCallback(() => {
    if (!gameState.selectedDice.color || !gameState.selectedDice.number) {
      return false
    }
    if (selectedSquares.length === 0) {
      return false
    }

    const player = gameState.players[gameState.currentPlayer]
    const colorValue =
      gameState.selectedDice.color.value === 'wild'
        ? selectedSquares.length > 0
          ? player.board[selectedSquares[0].row][selectedSquares[0].col].color
          : DEFAULT_GAME_COLOR
        : gameState.selectedDice.color.value
    const numberValue =
      gameState.selectedDice.number.value === 'wild'
        ? selectedSquares.length
        : gameState.selectedDice.number.value

    return (
      selectedSquares.length === numberValue &&
      isValidMove(selectedSquares, colorValue as GameColor, player.board)
    )
  }, [
    gameState.currentPlayer,
    gameState.players,
    gameState.selectedDice.color,
    gameState.selectedDice.number,
    isValidMove,
    selectedSquares,
  ])

  const clearSelection = useCallback(() => {
    setSelectedSquares([])
  }, [setSelectedSquares])

  const onSkipTurn = useCallback(() => {
    setSelectedSquares([])
    skipTurn()
  }, [setSelectedSquares, skipTurn])

  const hasAnyPossibleMove = useCallback(
    (
      board: Square[][],
      selectedColor: DiceColor | undefined,
      selectedNumber: DiceNumber | undefined,
    ) => {
      if (!selectedColor || !selectedNumber) {
        return false
      }

      const colorsToCheck: GameColor[] =
        selectedColor === 'wild' ? [...GAME_COLORS] : [selectedColor]

      for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
          const square = board[row][col]
          if (square.crossed) {
            continue
          }

          for (const color of colorsToCheck) {
            if (square.color !== color) {
              continue
            }

            const group = findConnectedGroup(row, col, color, board)
            if (group.length === 0) {
              continue
            }

            if (selectedNumber === 'wild') {
              for (let size = 1; size <= Math.min(group.length, MAX_SELECTABLE_CELLS); size++) {
                const candidate = group.slice(0, size)
                if (isValidMove(candidate, color, board)) {
                  return true
                }
              }
              continue
            }

            if (group.length >= selectedNumber) {
              const candidate = group.slice(0, selectedNumber)
              if (isValidMove(candidate, color, board)) {
                return true
              }
            }
          }
        }
      }

      return false
    },
    [isValidMove],
  )

  return {
    selectedSquares,
    hoveredSquares,
    setSelectedSquares,
    clearSelection,
    handleSquareClick,
    handleSquareHover,
    handleSquareLeave,
    handleConfirmMove,
    onSkipTurn,
    canMakeMove,
    hasAnyPossibleMove,
  }
}
