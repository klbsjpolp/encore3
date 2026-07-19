import { getBoardConfiguration, getDefaultBoardId } from '@/data/boardConfigurations'
import { advanceStateOnSkip, advanceStateWithMove } from '@/hooks/encore-game/advance'
import { createInitialBoard } from '@/hooks/encore-game/board'
import { rollDice } from '@/hooks/encore-game/dice'
import { resolvePlayerSwitch } from '@/hooks/encore-game/playerSwitch'
import { MAX_JOKERS } from '@/hooks/encore-game/scoring'
import type { ColorDiceResult, GameState, NumberDiceResult, Player } from '@/types/game'

import type { EncoreAction } from './actionSchema'
import type { EncoreGameView } from './views'

export interface ApplyActionResult {
  ok: boolean
  error?: string
}

export interface EncoreHostOptions {
  activeSeatIndices: number[]
  playerNames?: (string | undefined)[]
}

const isSelectionPhase = (phase: GameState['phase']): boolean =>
  phase === 'active-selection' || phase === 'passive-selection'

const createInitialState = ({
  activeSeatIndices,
  playerNames = [],
}: EncoreHostOptions): GameState => {
  // Online games use the default board for every seat; the per-player board
  // selection in local hotseat setup is not surfaced in the online lobby.
  const players: Player[] = activeSeatIndices.map((_seat, index) => {
    const boardId = getDefaultBoardId()
    const boardConfiguration = getBoardConfiguration(boardId)
    return {
      id: `player-${index}`,
      name: playerNames[index] ?? `Joueur ${index + 1}`,
      isAI: false,
      boardId,
      board: createInitialBoard(boardConfiguration),
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

  return {
    players,
    currentPlayer: 0,
    activePlayer: 0,
    phase: 'rolling',
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
  }
}

/**
 * Host-authoritative Encore runtime. Owns the full game state and the mapping
 * between abstract seat indices and the game's player-array order. The web host
 * client drives it: feed it relayed actions, read back the shared game view.
 */
export class EncoreHost {
  private state: GameState
  private readonly activeSeatIndices: number[]

  private constructor(state: GameState, activeSeatIndices: number[]) {
    this.state = state
    this.activeSeatIndices = [...activeSeatIndices]
  }

  static create(options: EncoreHostOptions): EncoreHost {
    return new EncoreHost(createInitialState(options), options.activeSeatIndices)
  }

  /** Rebuild a host runtime from a previously serialized full-state snapshot. */
  static fromSnapshot(snapshot: GameState, activeSeatIndices: number[]): EncoreHost {
    return new EncoreHost(snapshot, activeSeatIndices)
  }

  /** Opaque full-state blob to push to the server for host reconnection. */
  serializeSnapshot(): GameState {
    return this.state
  }

  getState(): GameState {
    return this.state
  }

  getView(): EncoreGameView {
    return { gameState: this.state, activeSeatIndices: [...this.activeSeatIndices] }
  }

  seatToPlayerIndex(seatIndex: number): number {
    return this.activeSeatIndices.indexOf(seatIndex)
  }

  playerIndexToSeat(playerIndex: number): number {
    return this.activeSeatIndices[playerIndex]
  }

  get gameIsOver(): boolean {
    return this.state.phase === 'game-over'
  }

  /** Abstract seat whose turn it currently is, or null once the game is over. */
  currentSeatIndex(): number | null {
    return this.gameIsOver ? null : this.activeSeatIndices[this.state.currentPlayer]
  }

  /** Winning seat index, or null while the game is ongoing or on a tie. */
  winnerSeatIndex(): number | null {
    const { winner } = this.state
    if (!winner) {
      return null
    }
    const playerIndex = this.state.players.findIndex((player) => player.id === winner.id)
    return playerIndex < 0 ? null : this.activeSeatIndices[playerIndex]
  }

  /**
   * Validate and apply an action sent by `seatIndex`. Enforces turn ownership
   * and Encore legality (via the shared pure reducers). Mutates internal state
   * on success.
   */
  applyAction(seatIndex: number, action: EncoreAction): ApplyActionResult {
    const playerIndex = this.seatToPlayerIndex(seatIndex)

    if (playerIndex < 0) {
      return { ok: false, error: 'Ce siège ne participe pas à la partie' }
    }

    if (this.state.currentPlayer !== playerIndex) {
      return { ok: false, error: "Ce n'est pas votre tour" }
    }

    switch (action.type) {
      case 'ROLL':
        return this.applyRoll()
      case 'MOVE':
        return this.applyMove(action)
      case 'SKIP':
        return this.applySkip()
    }
  }

  private applyRoll(): ApplyActionResult {
    if (this.state.phase !== 'rolling') {
      return { ok: false, error: 'Les dés ont déjà été lancés' }
    }

    this.state = {
      ...this.state,
      dice: rollDice(),
      phase: 'active-selection',
      lastPhase: 'rolling',
      selectedDice: { color: null, number: null },
      selectedFromJoker: { color: false, number: false },
    }
    return { ok: true }
  }

  private applyMove(action: Extract<EncoreAction, { type: 'MOVE' }>): ApplyActionResult {
    const { phase } = this.state
    if (!isSelectionPhase(phase)) {
      return { ok: false, error: 'Aucune sélection en cours' }
    }

    const colorDie = this.state.dice.find(
      (die): die is ColorDiceResult => die.id === action.colorDiceId && die.type === 'color',
    )
    const numberDie = this.state.dice.find(
      (die): die is NumberDiceResult => die.id === action.numberDiceId && die.type === 'number',
    )

    if (!colorDie || !numberDie) {
      return { ok: false, error: 'Dé introuvable' }
    }

    // Passive players may only use dice the active player did not consume.
    if (phase === 'passive-selection' && (colorDie.selected || numberDie.selected)) {
      return { ok: false, error: 'Ce dé a déjà été utilisé' }
    }

    // Squares come from the network here, not from trusted local UI clicks, so
    // reject out-of-range coordinates before they reach the board indexing in
    // applyMoveToState (which would otherwise throw on an undefined row).
    const board = this.state.players[this.state.currentPlayer].board
    const squaresInBounds = action.squares.every(
      ({ row, col }) =>
        row >= 0 && row < board.length && col >= 0 && col < (board[row]?.length ?? 0),
    )
    if (!squaresInBounds) {
      return { ok: false, error: 'Case hors du plateau' }
    }

    const selectedFromJoker = {
      color: colorDie.value === 'wild',
      number: numberDie.value === 'wild',
    }

    // Shared with local hotseat play so the two never drift; the host resolves
    // the handoff synchronously (no turn-switch animation) instead of via a
    // timed player-switching phase.
    const advanced = advanceStateWithMove(
      this.state,
      action.squares,
      { color: colorDie, number: numberDie },
      selectedFromJoker,
    )

    if (!advanced) {
      return { ok: false, error: 'Coup invalide' }
    }

    this.state = resolvePlayerSwitch(advanced)
    return { ok: true }
  }

  private applySkip(): ApplyActionResult {
    const { phase } = this.state
    if (!isSelectionPhase(phase)) {
      return { ok: false, error: 'Aucune sélection en cours' }
    }

    this.state = resolvePlayerSwitch(advanceStateOnSkip(this.state))
    return { ok: true }
  }
}
