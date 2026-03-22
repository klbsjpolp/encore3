import { useCallback, useEffect, useState } from 'react'

import type { BoardId } from '@/data/boardConfigurations'
import { getBoardConfiguration, getDefaultBoardId } from '@/data/boardConfigurations'
import type { DiceResult, GameColor, GameState, Player, Square } from '@/types/game'
import { DEFAULT_GAME_COLOR } from '@/types/game'

import { checkColorCompletion, createInitialBoard } from './encore-game/board'
import { rollDice } from './encore-game/dice'
import { isValidMoveSelection } from './encore-game/moveValidation'
import { determineWinners, MAX_JOKERS } from './encore-game/scoring'
import { useAIPlayer } from './useAIPlayer'

export { findConnectedGroup } from './encore-game/board'
export {
  BOARD_COLUMNS,
  calculateColorsScore,
  calculateColumnScore,
  calculateFinalScore,
  calculateStarPenalty,
  COLUMN_FIRST_PLAYER_POINTS,
  COLUMN_SECOND_PLAYER_POINTS,
  determineWinners,
  FIRST_COLOR_COMPLETION_POINTS,
  getColorCompletionPoints,
  getColumnScoreBreakdown,
  MAX_JOKERS,
  SECOND_COLOR_COMPLETION_POINTS,
  TOTAL_STARS,
} from './encore-game/scoring'

const getWinnerState = (players: Player[]) => {
  const winners = determineWinners(players)

  return {
    winner: winners.length === 1 ? winners[0] : null,
    winners,
  }
}

export const useEncoreGame = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayer: 0,
    activePlayer: 0,
    phase: 'rolling',
    dice: [],
    selectedDice: { color: null, number: null },
    selectedFromJoker: { color: false, number: false },
    gameStarted: false,
    winner: null,
    winners: [],
    pendingGameOver: false,
    claimedFirstColumnBonus: {},
    claimedFirstColorBonus: {},
    claimedSecondColorBonus: {},
  })
  const { makeAIMove } = useAIPlayer()

  const isValidMove = useCallback(
    (
      squares: { row: number; col: number }[],
      color: GameColor,
      playerBoard: Square[][],
    ): boolean => {
      return isValidMoveSelection(squares, color, playerBoard)
    },
    [],
  )

  const initializeGame = useCallback(
    (playerNames: string[], aiPlayers: boolean[] = [], boardIds: BoardId[] = []) => {
      const players: Player[] = playerNames.map((name, index) => {
        const boardId = boardIds[index] || getDefaultBoardId()
        const boardConfiguration = getBoardConfiguration(boardId)
        const board = createInitialBoard(boardConfiguration)
        return {
          id: `player-${index}`,
          name,
          isAI: aiPlayers[index] || false,
          boardId,
          board,
          boardConfiguration,
          starsCollected: 0,
          completedColors: [],
          completedColorsFirst: [],
          completedColorsNotFirst: [],
          completedColumnsFirst: [],
          completedColumnsNotFirst: [],
          jokersRemaining: MAX_JOKERS,
        }
      })
      setGameState({
        players,
        currentPlayer: 0,
        activePlayer: 0,
        phase: players[0].isAI ? 'rolling-ai' : 'rolling',
        dice: [],
        selectedDice: { color: null, number: null },
        selectedFromJoker: { color: false, number: false },
        gameStarted: true,
        winner: null,
        winners: [],
        pendingGameOver: false,
        claimedFirstColumnBonus: {},
        claimedFirstColorBonus: {},
        claimedSecondColorBonus: {},
      })
    },
    [],
  )

  const rollNewDice = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== 'rolling' && prev.phase !== 'rolling-ai') {
        return prev
      }
      const nextPhase = prev.phase === 'rolling-ai' ? 'active-selection-ai' : 'active-selection'
      return {
        ...prev,
        dice: rollDice(),
        phase: nextPhase,
        lastPhase: prev.phase,
        selectedDice: { color: null, number: null },
        selectedFromJoker: { color: false, number: false },
      }
    })
  }, [])

  const selectDice = useCallback((dice: DiceResult) => {
    setGameState((prev) => {
      const inActiveOrPassive =
        prev.phase === 'active-selection' || prev.phase === 'passive-selection'
      const isPassivePhase = prev.phase === 'passive-selection'
      if (prev.phase.includes('-ai') || !inActiveOrPassive) {
        return prev
      }
      // Prevent selecting dice already used by the active player during passive-selection
      if (dice.selected && isPassivePhase) {
        return prev
      }
      const newSelectedDice =
        dice.type === 'color'
          ? { ...prev.selectedDice, color: dice }
          : { ...prev.selectedDice, number: dice }
      const newSelectedFromJoker = { ...prev.selectedFromJoker }
      newSelectedFromJoker[dice.type] = dice.value === 'wild'
      const jokersNeeded =
        (newSelectedFromJoker.color ? 1 : 0) + (newSelectedFromJoker.number ? 1 : 0)
      if (jokersNeeded > prev.players[prev.currentPlayer].jokersRemaining) {
        return prev
      }
      return { ...prev, selectedDice: newSelectedDice, selectedFromJoker: newSelectedFromJoker }
    })
  }, [])

  const makeMove = useCallback(
    (squares?: { row: number; col: number }[]) => {
      setGameState((prev) => {
        const {
          currentPlayer,
          players,
          phase,
          claimedFirstColumnBonus,
          claimedFirstColorBonus,
          claimedSecondColorBonus,
        } = prev
        const isAI = phase.includes('-ai')

        let moveSquares = squares
        let selectedDice = prev.selectedDice
        let selectedFromJoker = prev.selectedFromJoker

        if (isAI) {
          const aiDecision = makeAIMove(prev, isValidMove)
          if (aiDecision) {
            moveSquares = aiDecision.squares
            selectedDice = { color: aiDecision.color, number: aiDecision.number }
            selectedFromJoker = {
              color: aiDecision.color.value === 'wild',
              number: aiDecision.number.value === 'wild',
            }
          } else {
            // AI chooses to skip
            return {
              ...prev,
              phase: 'player-switching',
              lastPhase: phase,
              selectedDice: { color: null, number: null },
              selectedFromJoker: { color: false, number: false },
            }
          }
        }

        if (
          !moveSquares ||
          !selectedDice.color ||
          !selectedDice.number ||
          ![
            'active-selection',
            'passive-selection',
            'active-selection-ai',
            'passive-selection-ai',
          ].includes(phase)
        ) {
          return prev
        }

        const player = players[currentPlayer]
        const colorValue =
          selectedDice.color.value === 'wild'
            ? moveSquares.length > 0
              ? player.board[moveSquares[0].row][moveSquares[0].col].color
              : DEFAULT_GAME_COLOR
            : (selectedDice.color.value as GameColor)
        const numberValue =
          selectedDice.number.value === 'wild'
            ? moveSquares.length
            : (selectedDice.number.value as number)

        if (
          moveSquares.length !== numberValue ||
          !isValidMove(moveSquares, colorValue, player.board)
        ) {
          return prev // Invalid move for human, do nothing
        }

        const jokersUsed = (selectedFromJoker.color ? 1 : 0) + (selectedFromJoker.number ? 1 : 0)
        // Guard: cannot use more jokers than remaining
        if (jokersUsed > player.jokersRemaining) {
          return prev
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
          if (
            colorValue &&
            checkColorCompletion(newBoard, colorValue) &&
            !completedColors.includes(colorValue)
          ) {
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
        const pendingGameOver = prev.pendingGameOver || updatedPlayer.completedColors.length >= 2

        // Only mark dice as used (selected) when the active player makes their selection.
        const isActiveSelectionPhase =
          phase === 'active-selection' || phase === 'active-selection-ai'
        const newDice = isActiveSelectionPhase
          ? prev.dice.map((d) => ({
              ...d,
              selected:
                d.selected || d.id === selectedDice.color?.id || d.id === selectedDice.number?.id,
            }))
          : prev.dice
        return {
          ...prev,
          players: newPlayers,
          claimedFirstColumnBonus: newClaimedFirstColumnBonus,
          claimedFirstColorBonus: newClaimedFirstColorBonus,
          claimedSecondColorBonus: newClaimedSecondColorBonus,
          pendingGameOver,
          dice: newDice,
          phase: 'player-switching',
          lastPhase: phase,
          selectedDice: { color: null, number: null },
          selectedFromJoker: { color: false, number: false },
        }
      })
    },
    [isValidMove, makeAIMove],
  )

  const skipTurn = useCallback(() => {
    setGameState((prev) => {
      const { phase } = prev
      if (phase.includes('active-selection') || phase.includes('passive-selection')) {
        return {
          ...prev,
          phase: 'player-switching',
          lastPhase: phase,
          selectedDice: { color: null, number: null },
          selectedFromJoker: { color: false, number: false },
        }
      }
      return prev
    })
  }, [])

  const completePlayerSwitch = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== 'player-switching') {
        return prev
      }
      const { players, currentPlayer, activePlayer, lastPhase } = prev

      if (lastPhase === 'active-selection' || lastPhase === 'active-selection-ai') {
        const nextPlayerIndex = (activePlayer + 1) % players.length

        if (nextPlayerIndex === activePlayer) {
          if (prev.pendingGameOver) {
            return {
              ...prev,
              phase: 'game-over',
              pendingGameOver: false,
              ...getWinnerState(players),
            }
          }

          const newActivePlayer = activePlayer
          const nextPlayer = players[newActivePlayer]
          const nextPhase = nextPlayer.isAI ? 'rolling-ai' : 'rolling'
          return {
            ...prev,
            phase: nextPhase,
            currentPlayer: newActivePlayer,
            activePlayer: newActivePlayer,
          }
        }

        const nextPlayer = players[nextPlayerIndex]
        const nextPhase = nextPlayer.isAI ? 'passive-selection-ai' : 'passive-selection'
        return { ...prev, phase: nextPhase, currentPlayer: nextPlayerIndex }
      }

      if (lastPhase === 'passive-selection' || lastPhase === 'passive-selection-ai') {
        const nextPlayerIndex = (currentPlayer + 1) % players.length

        if (nextPlayerIndex === activePlayer) {
          if (prev.pendingGameOver) {
            return {
              ...prev,
              phase: 'game-over',
              pendingGameOver: false,
              ...getWinnerState(players),
            }
          }

          const newActivePlayer = (activePlayer + 1) % players.length
          const nextPlayer = players[newActivePlayer]
          const nextPhase = nextPlayer.isAI ? 'rolling-ai' : 'rolling'
          return {
            ...prev,
            phase: nextPhase,
            currentPlayer: newActivePlayer,
            activePlayer: newActivePlayer,
          }
        }

        const nextPlayer = players[nextPlayerIndex]
        const nextPhase = nextPlayer.isAI ? 'passive-selection-ai' : 'passive-selection'
        return { ...prev, phase: nextPhase, currentPlayer: nextPlayerIndex }
      }

      return prev
    })
  }, [])

  useEffect(() => {
    const { phase } = gameState

    if (phase === 'player-switching') {
      const timer = setTimeout(() => completePlayerSwitch(), 200)
      return () => clearTimeout(timer)
    }

    if (!phase.includes('-ai')) {
      return
    }

    let timerId: ReturnType<typeof setTimeout> | undefined
    if (phase === 'rolling-ai') {
      timerId = setTimeout(() => rollNewDice(), 1000)
    } else if (phase === 'active-selection-ai' || phase === 'passive-selection-ai') {
      timerId = setTimeout(() => makeMove(), 1000)
    }

    return () => {
      if (timerId) {
        clearTimeout(timerId)
      }
    }
  }, [gameState.phase, completePlayerSwitch, rollNewDice, makeMove, gameState])

  return {
    gameState,
    initializeGame,
    rollNewDice,
    selectDice,
    makeMove,
    skipTurn,
    isValidMove,
    completePlayerSwitch,
  }
}
