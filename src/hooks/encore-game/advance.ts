import type { ColorDiceResult, GameState, NumberDiceResult } from '@/types/game'

import { applyMoveToState } from './applyMove'

const CLEARED_SELECTION = {
  selectedDice: { color: null, number: null },
  selectedFromJoker: { color: false, number: false },
} as const

/**
 * Apply a validated placement and hand the turn off. Returns the state advanced
 * to the `player-switching` phase (dice used by the active player are marked as
 * `selected`), or `null` if the placement is illegal. Shared by local hotseat
 * play (`useEncoreGame`) and the online host runtime so the two never drift;
 * each caller decides when to resolve the switch (a timed animation locally,
 * synchronously on the host).
 */
export const advanceStateWithMove = (
  state: GameState,
  moveSquares: { row: number; col: number }[],
  selectedDice: { color: ColorDiceResult; number: NumberDiceResult },
  selectedFromJoker: { color: boolean; number: boolean },
): GameState | null => {
  const application = applyMoveToState(state, moveSquares, selectedDice, selectedFromJoker)
  if (!application) {
    return null
  }

  // Only mark dice as used (selected) when the active player makes their selection.
  const isActiveSelectionPhase =
    state.phase === 'active-selection' || state.phase === 'active-selection-ai'
  const newDice = isActiveSelectionPhase
    ? state.dice.map((die) => ({
        ...die,
        selected:
          die.selected || die.id === selectedDice.color.id || die.id === selectedDice.number.id,
      }))
    : state.dice

  return {
    ...state,
    ...application,
    dice: newDice,
    phase: 'player-switching',
    lastPhase: state.phase,
    ...CLEARED_SELECTION,
  }
}

/** Hand the turn off without placing anything (a pass). */
export const advanceStateOnSkip = (state: GameState): GameState => ({
  ...state,
  phase: 'player-switching',
  lastPhase: state.phase,
  ...CLEARED_SELECTION,
})
