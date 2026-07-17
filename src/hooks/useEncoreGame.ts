import { useCallback, useEffect, useRef, useState } from 'react'

import type { BoardId } from '@/data/boardConfigurations'
import { getBoardConfiguration, getDefaultBoardId } from '@/data/boardConfigurations'
import type { DiceResult, GameState, Player } from '@/types/game'

import { computeBestAIMove } from './encore-game/aiPlayer'
import { applyMoveToState } from './encore-game/applyMove'
import { createInitialBoard } from './encore-game/board'
import { rollDice } from './encore-game/dice'
import {
  clearStoredGameState,
  loadStoredGameState,
  saveStoredGameState,
  shouldPersistGameState,
} from './encore-game/gameStatePersistence'
import { isValidMoveSelection } from './encore-game/moveValidation'
import { PLAYER_SWITCH_DELAY_MS, resolvePlayerSwitch } from './encore-game/playerSwitch'
import { MAX_JOKERS } from './encore-game/scoring'

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

const isRollingPhase = (phase: GameState['phase']): boolean =>
  phase === 'rolling' || phase === 'rolling-ai'

const isSelectionPhase = (phase: GameState['phase']): boolean =>
  phase === 'active-selection' ||
  phase === 'passive-selection' ||
  phase === 'active-selection-ai' ||
  phase === 'passive-selection-ai'

// Whether a human placement would actually be applied, checked against the
// authoritative validator (applyMoveToState) rather than re-deriving the
// rules — so the caller can tie feedback to real success instead of assuming
// the call did something.
const humanMoveApplies = (state: GameState, squares?: { row: number; col: number }[]): boolean => {
  const { selectedDice, selectedFromJoker, phase } = state
  if (!squares || !selectedDice.color || !selectedDice.number || !isSelectionPhase(phase)) {
    return false
  }
  return (
    applyMoveToState(
      state,
      squares,
      { color: selectedDice.color, number: selectedDice.number },
      selectedFromJoker,
    ) != null
  )
}

const createInitialGameState = (): GameState => ({
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

export const useEncoreGame = () => {
  const [gameState, setGameState] = useState<GameState>(
    () => loadStoredGameState() ?? createInitialGameState(),
  )
  // Committed-state snapshot, so the action callbacks (stable, empty-deps) can
  // report whether they actually applied without re-subscribing on every state
  // change. Synced in an effect (not during render); the callbacks only read it
  // from user event handlers, which run well after the commit.
  const gameStateRef = useRef(gameState)
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    if (shouldPersistGameState(gameState)) {
      saveStoredGameState(gameState)
    } else {
      clearStoredGameState()
    }
  }, [gameState])

  const abandonGame = useCallback(() => {
    setGameState(createInitialGameState())
  }, [])

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

  // Returns whether the dice were actually rolled, so callers can gate
  // feedback on real success rather than assuming the call did something.
  const rollNewDice = useCallback((): boolean => {
    if (!isRollingPhase(gameStateRef.current.phase)) {
      return false
    }
    setGameState((prev) => {
      if (!isRollingPhase(prev.phase)) {
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
    return true
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

  // Returns whether a human placement was actually applied, so callers can
  // gate feedback on real success. AI moves are dispatched directly (never
  // through the feedback wrappers), so their return value is not relied upon
  // and is reported as false.
  const makeMove = useCallback((squares?: { row: number; col: number }[]): boolean => {
    const snapshot = gameStateRef.current
    const applied = !snapshot.phase.includes('-ai') && humanMoveApplies(snapshot, squares)
    setGameState((prev) => {
      const { phase } = prev
      const isAI = phase.includes('-ai')

      let moveSquares = squares
      let selectedDice = prev.selectedDice
      let selectedFromJoker = prev.selectedFromJoker

      if (isAI) {
        const aiDecision = computeBestAIMove(prev)
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

      const application = applyMoveToState(
        prev,
        moveSquares,
        { color: selectedDice.color, number: selectedDice.number },
        selectedFromJoker,
      )
      if (!application) {
        return prev // Invalid move for human, do nothing
      }

      // Only mark dice as used (selected) when the active player makes their selection.
      const isActiveSelectionPhase = phase === 'active-selection' || phase === 'active-selection-ai'
      const newDice = isActiveSelectionPhase
        ? prev.dice.map((d) => ({
            ...d,
            selected:
              d.selected || d.id === selectedDice.color?.id || d.id === selectedDice.number?.id,
          }))
        : prev.dice
      return {
        ...prev,
        ...application,
        dice: newDice,
        phase: 'player-switching',
        lastPhase: phase,
        selectedDice: { color: null, number: null },
        selectedFromJoker: { color: false, number: false },
      }
    })
    return applied
  }, [])

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
    setGameState((prev) => resolvePlayerSwitch(prev))
  }, [])
  const phase = gameState.phase

  useEffect(() => {
    if (phase !== 'player-switching') {
      return
    }

    const timer = setTimeout(() => {
      completePlayerSwitch()
    }, PLAYER_SWITCH_DELAY_MS)

    return () => clearTimeout(timer)
  }, [phase, completePlayerSwitch])

  useEffect(() => {
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
  }, [phase, rollNewDice, makeMove])

  return {
    gameState,
    initializeGame,
    abandonGame,
    rollNewDice,
    selectDice,
    makeMove,
    skipTurn,
    isValidMove: isValidMoveSelection,
    completePlayerSwitch,
  }
}
