import { useCallback, useEffect, useState } from 'react'

import {
  excludeWildNumberDie,
  findDicePairForGroup,
  findForcedSelection,
  hasLargerNumberDieAlternative,
  hasSmallerNumberDieAlternative,
  resolveAutoDiceSelection,
} from '@/hooks/encore-game/dice'
import { findConnectedGroup } from '@/hooks/useEncoreGame'
import { getSelectionLimit, MAX_SELECTABLE_CELLS } from '@/lib/game-rules'
import type { DiceColor, DiceNumber, DiceResult, GameColor, GameState, Square } from '@/types/game'
import { DEFAULT_GAME_COLOR, GAME_COLORS } from '@/types/game'

interface UseEncoreSelectionArgs {
  gameState: GameState
  makeMove: (squares?: { row: number; col: number }[]) => void
  skipTurn: () => void
  selectDice: (dice: DiceResult) => void
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
  selectDice,
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

  // When the turn is effectively decided, pre-select it so the player does not
  // have to hunt for the only move: a single legal placement selects its dice
  // and cells; several placements sharing one dice pair pre-select just the
  // dice. Guarded to run only for a human turn with nothing selected yet, so it
  // resolves once per roll and never fights a manual selection.
  const phase = gameState.phase
  const { color: selectedColor, number: selectedNumber } = gameState.selectedDice
  const currentPlayer = gameState.players[gameState.currentPlayer]
  // Depend on the board directly rather than the whole player object, which
  // gets a fresh reference on every immutable state update: this keeps the
  // O(cells) scan from re-running when nothing relevant changed.
  const currentBoard = currentPlayer?.board
  useEffect(() => {
    if (phase !== 'active-selection' && phase !== 'passive-selection') {
      return
    }
    if (selectedColor || selectedNumber || selectedSquares.length > 0 || !currentBoard) {
      return
    }
    const forced = findForcedSelection(gameState.dice, currentBoard, isValidMove)
    if (!forced) {
      return
    }
    // Deferred a frame to avoid a synchronous state update inside the effect
    // body; the guards above keep it from running again once dice are selected.
    const frameId = requestAnimationFrame(() => {
      selectDice(forced.color)
      selectDice(forced.number)
      if (forced.mode === 'move') {
        setSelectedSquares(forced.squares)
      }
    })
    return () => cancelAnimationFrame(frameId)
  }, [
    phase,
    selectedColor,
    selectedNumber,
    selectedSquares.length,
    currentBoard,
    gameState.dice,
    isValidMove,
    selectDice,
    setSelectedSquares,
  ])

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

      // While a smaller, playable cell count in this group still has a real
      // (non-wild) number die, auto-selection must not reach for the joker: it
      // would lock in the whole group before the player got a chance to pick
      // that smaller, joker-free count instead. Hiding the wild die from these
      // auto lookups leaves it selectable only by the player's own explicit
      // click. Only the two auto-selection branches below ever read this, and
      // both require the clicked cell not to be already selected, so skip the
      // check entirely on a toggle/deselect click.
      const diceForAuto =
        !isSelected &&
        hasSmallerNumberDieAlternative(
          gameState.dice,
          group,
          clickedColor,
          player.board,
          isValidMove,
        )
          ? excludeWildNumberDie(gameState.dice)
          : gameState.dice

      // Clicking a fresh cell whose whole group forms a valid, playable move
      // switches to it: the matching dice and cells are selected regardless of
      // what was selected before. Clicks inside the current selection fall
      // through so toggling a cell off / building a subset still works. A
      // committed number die means the player is placing that many cells, so
      // only switch when the group matches it — otherwise clicks accumulate.
      const committedNumber = gameState.selectedDice.number?.value
      const groupMatchesCommittedNumber =
        !committedNumber || committedNumber === 'wild' || committedNumber === group.length
      if (!isSelected && groupMatchesCommittedNumber) {
        const pair = findDicePairForGroup(
          diceForAuto,
          clickedColor,
          group.length,
          player.jokersRemaining,
        )
        if (pair && isValidMove(group, clickedColor, player.board)) {
          // Apply the exact (non-joker) die first: if it replaces a previously
          // committed wild die of its type, that joker is freed before the
          // other die is selected, so the reducer never transiently sees more
          // jokers than the player owns and rejects one of the two picks.
          const ordered =
            pair.color.value === 'wild' ? [pair.number, pair.color] : [pair.color, pair.number]
          for (const die of ordered) {
            selectDice(die)
          }
          setSelectedSquares(group)
          return
        }
      }

      // With no cells selected, a click can also partially complete the dice:
      // the clicked cell plus the color die when only the color matches (the
      // group is too large or otherwise not directly playable in full).
      if (selectedSquares.length === 0) {
        const autoSelection = resolveAutoDiceSelection({
          dice: diceForAuto,
          selectedColor: gameState.selectedDice.color,
          selectedNumber: gameState.selectedDice.number,
          groupColor: clickedColor,
          groupSize: group.length,
          jokersRemaining: player.jokersRemaining,
          isGroupMoveValid: isValidMove(group, clickedColor, player.board),
        })
        if (autoSelection) {
          for (const die of autoSelection.diceToSelect) {
            selectDice(die)
          }
          setSelectedSquares(autoSelection.selectGroup ? group : [square])
          return
        }
      }

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

      const nextSelection = [...selectedSquares, square]
      setSelectedSquares(nextSelection)

      // Once a manually built subset forms a valid move, select the dice that
      // match it (fills the still-missing color/number slot). Smaller sizes
      // never needed checking on the way here — a real match would already
      // have locked in on an earlier click. But if a bigger real die is still
      // reachable by selecting more cells, auto-filling *any* number die now
      // (exact match or joker) would lock the count early and force the
      // player to manually undo it to keep growing toward that bigger die —
      // so the fill is skipped entirely until no larger real die is left.
      if (isValidMove(nextSelection, clickedColor, player.board)) {
        const numberStillGrowable = hasLargerNumberDieAlternative(
          gameState.dice,
          group,
          nextSelection.length,
          clickedColor,
          player.board,
          isValidMove,
        )
        if (!numberStillGrowable) {
          const fill = resolveAutoDiceSelection({
            dice: gameState.dice,
            selectedColor: gameState.selectedDice.color,
            selectedNumber: gameState.selectedDice.number,
            groupColor: clickedColor,
            groupSize: nextSelection.length,
            jokersRemaining: player.jokersRemaining,
            isGroupMoveValid: true,
          })
          if (fill?.selectGroup) {
            for (const die of fill.diceToSelect) {
              selectDice(die)
            }
          }
        }
      }
    },
    [
      gameState.currentPlayer,
      gameState.dice,
      gameState.phase,
      gameState.players,
      gameState.selectedDice.color,
      gameState.selectedDice.number,
      hoveredSquares,
      isValidMove,
      selectDice,
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
