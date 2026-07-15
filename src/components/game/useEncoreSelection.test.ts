import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import type { DiceResult, GameState, Player, Square } from '@/types/game'

import { useEncoreSelection } from './useEncoreSelection'

const boardConfiguration: BoardConfiguration = {
  id: 'classic',
  fillClass: 'bg-slate-900',
  colorLayout: [
    ['orange', 'orange'],
    ['blue', 'blue'],
  ],
  starPositions: new Set<string>(),
}

const createBoard = (): Square[][] => [
  [
    { color: 'orange', hasStar: false, crossed: false, column: 'A', row: 0 },
    { color: 'orange', hasStar: false, crossed: false, column: 'B', row: 0 },
  ],
  [
    { color: 'blue', hasStar: false, crossed: false, column: 'A', row: 1 },
    { color: 'blue', hasStar: false, crossed: false, column: 'B', row: 1 },
  ],
]

const createPlayer = (): Player => ({
  id: 'p1',
  name: 'Player 1',
  isAI: false,
  board: createBoard(),
  boardConfiguration,
  starsCollected: 0,
  completedColors: [],
  completedColorsFirst: [],
  completedColorsNotFirst: [],
  completedColumnsFirst: [],
  completedColumnsNotFirst: [],
  jokersRemaining: 8,
})

const createGameState = (overrides: Partial<GameState> = {}): GameState => ({
  players: [createPlayer()],
  currentPlayer: 0,
  activePlayer: 0,
  phase: 'active-selection',
  dice: [],
  selectedDice: {
    color: { id: 'color-1', type: 'color', value: 'orange', selected: true },
    number: { id: 'number-1', type: 'number', value: 2, selected: true },
  },
  selectedFromJoker: { color: false, number: false },
  gameStarted: true,
  winner: null,
  winners: [],
  pendingGameOver: false,
  claimedFirstColumnBonus: {},
  claimedFirstColorBonus: {},
  claimedSecondColorBonus: {},
  ...overrides,
})

const renderSelection = (
  gameState: GameState,
  { isValidMove = vi.fn(() => true) }: { isValidMove?: (...args: never[]) => boolean } = {},
) => {
  const makeMove = vi.fn()
  const skipTurn = vi.fn()
  const selectDice = vi.fn()
  const { result } = renderHook(() =>
    useEncoreSelection({
      gameState,
      makeMove,
      skipTurn,
      selectDice,
      isValidMove: isValidMove as never,
    }),
  )
  return { result, makeMove, skipTurn, selectDice }
}

describe('useEncoreSelection', () => {
  it('selects a valid connected group and confirms the move', () => {
    const makeMove = vi.fn()
    const skipTurn = vi.fn()
    const isValidMove = vi.fn(() => true)

    const { result } = renderHook(() =>
      useEncoreSelection({
        gameState: createGameState(),
        makeMove,
        skipTurn,
        selectDice: vi.fn(),
        isValidMove,
      }),
    )

    act(() => {
      result.current.handleSquareClick(0, 0)
    })

    expect(result.current.selectedSquares).toHaveLength(2)
    expect(result.current.canMakeMove()).toBe(true)

    act(() => {
      result.current.handleConfirmMove()
    })

    expect(makeMove).toHaveBeenCalledTimes(1)
    expect(makeMove).toHaveBeenCalledWith(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    )
    expect(result.current.selectedSquares).toEqual([])
    expect(skipTurn).not.toHaveBeenCalled()
  })

  it('clears selection when skipping turn', () => {
    const makeMove = vi.fn()
    const skipTurn = vi.fn()
    const isValidMove = vi.fn(() => true)

    const { result } = renderHook(() =>
      useEncoreSelection({
        gameState: createGameState(),
        makeMove,
        skipTurn,
        selectDice: vi.fn(),
        isValidMove,
      }),
    )

    act(() => {
      result.current.handleSquareClick(0, 0)
    })
    expect(result.current.selectedSquares).toHaveLength(2)

    act(() => {
      result.current.onSkipTurn()
    })

    expect(skipTurn).toHaveBeenCalledTimes(1)
    expect(result.current.selectedSquares).toEqual([])
  })

  it('ignores clicks and hovers outside the selection phases', () => {
    const { result } = renderSelection(createGameState({ phase: 'rolling' }))

    act(() => {
      result.current.handleSquareClick(0, 0)
      result.current.handleSquareHover(0, 0)
    })

    expect(result.current.selectedSquares).toEqual([])
    expect(result.current.hoveredSquares).toEqual([])
  })

  it('deduplicates and caps direct selections at the maximum size', () => {
    const { result } = renderSelection(createGameState())

    act(() => {
      result.current.setSelectedSquares([
        { row: 0, col: 0 },
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
        { row: 0, col: 4 },
        { row: 0, col: 5 },
      ])
    })

    expect(result.current.selectedSquares).toHaveLength(5)
    expect(result.current.selectedSquares[0]).toEqual({ row: 0, col: 0 })
  })

  it('toggles a fully selected group off on a second click', () => {
    const { result } = renderSelection(createGameState())

    act(() => {
      result.current.handleSquareClick(0, 0)
    })
    expect(result.current.selectedSquares).toHaveLength(2)

    act(() => {
      result.current.handleSquareClick(0, 0)
    })
    expect(result.current.selectedSquares).toEqual([])
  })

  it('selects the whole group with a wild number die', () => {
    const { result } = renderSelection(
      createGameState({
        selectedDice: {
          color: { id: 'color-1', type: 'color', value: 'orange', selected: true },
          number: { id: 'number-1', type: 'number', value: 'wild', selected: true },
        },
      }),
    )

    act(() => {
      result.current.handleSquareClick(0, 0)
    })

    expect(result.current.selectedSquares).toHaveLength(2)
  })

  it('falls back to single-square selection when the color does not match', () => {
    const { result } = renderSelection(
      createGameState({
        selectedDice: {
          color: { id: 'color-1', type: 'color', value: 'blue', selected: true },
          number: { id: 'number-1', type: 'number', value: 2, selected: true },
        },
      }),
    )

    // Orange squares cannot form a selectable group for a blue die.
    act(() => {
      result.current.handleSquareClick(0, 0)
    })
    expect(result.current.selectedSquares).toEqual([{ row: 0, col: 0 }])

    // Clicking the selected square again removes it from the selection.
    act(() => {
      result.current.handleSquareClick(0, 0)
    })
    expect(result.current.selectedSquares).toEqual([])
  })

  it('stops adding single squares once the number die value is reached', () => {
    const isValidMove = vi.fn(() => false)
    const { result } = renderSelection(createGameState(), { isValidMove })

    act(() => {
      result.current.handleSquareClick(0, 0)
    })
    act(() => {
      result.current.handleSquareClick(0, 1)
    })
    expect(result.current.selectedSquares).toHaveLength(2)

    act(() => {
      result.current.handleSquareClick(1, 0)
    })
    expect(result.current.selectedSquares).toHaveLength(2)
  })

  it('highlights a hovered group matching the dice and clears it on leave', () => {
    const { result } = renderSelection(createGameState())

    act(() => {
      result.current.handleSquareHover(0, 0)
    })
    expect(result.current.hoveredSquares).toHaveLength(2)

    act(() => {
      result.current.handleSquareLeave()
    })
    expect(result.current.hoveredSquares).toEqual([])
  })

  it('does not highlight squares of another color', () => {
    const { result } = renderSelection(createGameState())

    act(() => {
      result.current.handleSquareHover(0, 0)
    })
    expect(result.current.hoveredSquares).toHaveLength(2)

    // Blue squares do not match the selected orange die.
    act(() => {
      result.current.handleSquareHover(1, 0)
    })
    expect(result.current.hoveredSquares).toEqual([])
  })

  it('ignores hovering while the dice selection is incomplete', () => {
    const { result } = renderSelection(
      createGameState({ selectedDice: { color: null, number: null } }),
    )

    act(() => {
      result.current.handleSquareHover(0, 0)
    })

    expect(result.current.hoveredSquares).toEqual([])
  })

  it('highlights the whole group with a wild number die only when the move is valid', () => {
    const wildNumberState = createGameState({
      selectedDice: {
        color: { id: 'color-1', type: 'color', value: 'orange', selected: true },
        number: { id: 'number-1', type: 'number', value: 'wild', selected: true },
      },
    })

    const { result: validResult } = renderSelection(wildNumberState)
    act(() => {
      validResult.current.handleSquareHover(0, 0)
    })
    expect(validResult.current.hoveredSquares).toHaveLength(2)

    const { result: invalidResult } = renderSelection(wildNumberState, {
      isValidMove: vi.fn(() => false),
    })
    act(() => {
      invalidResult.current.handleSquareHover(0, 0)
    })
    expect(invalidResult.current.hoveredSquares).toEqual([])
  })

  it('clears the highlight when the matching group is invalid', () => {
    const { result } = renderSelection(createGameState(), { isValidMove: vi.fn(() => false) })

    act(() => {
      result.current.handleSquareHover(0, 0)
    })

    expect(result.current.hoveredSquares).toEqual([])
  })

  it('highlights the current selection extended by the hovered square', () => {
    const { result } = renderSelection(
      createGameState({
        selectedDice: {
          color: { id: 'color-1', type: 'color', value: 'orange', selected: true },
          number: { id: 'number-1', type: 'number', value: 1, selected: true },
        },
      }),
    )

    act(() => {
      result.current.setSelectedSquares([{ row: 0, col: 0 }])
    })
    act(() => {
      result.current.handleSquareHover(0, 1)
    })

    expect(result.current.hoveredSquares).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ])

    // Hovering a square already selected keeps the selection as-is.
    act(() => {
      result.current.handleSquareHover(0, 0)
    })
    expect(result.current.hoveredSquares).toEqual([{ row: 0, col: 0 }])
  })

  it('highlights a single square of an oversized group when nothing is selected', () => {
    const { result } = renderSelection(
      createGameState({
        selectedDice: {
          color: { id: 'color-1', type: 'color', value: 'orange', selected: true },
          number: { id: 'number-1', type: 'number', value: 1, selected: true },
        },
      }),
    )

    act(() => {
      result.current.handleSquareHover(0, 0)
    })

    expect(result.current.hoveredSquares).toEqual([{ row: 0, col: 0 }])
  })

  it('clears the highlight when the group is smaller than the number die', () => {
    const { result } = renderSelection(
      createGameState({
        selectedDice: {
          color: { id: 'color-1', type: 'color', value: 'orange', selected: true },
          number: { id: 'number-1', type: 'number', value: 4, selected: true },
        },
      }),
    )

    act(() => {
      result.current.handleSquareHover(0, 0)
    })

    expect(result.current.hoveredSquares).toEqual([])
  })

  it('clears the selection on demand', () => {
    const { result } = renderSelection(createGameState())

    act(() => {
      result.current.handleSquareClick(0, 0)
    })
    expect(result.current.selectedSquares).toHaveLength(2)

    act(() => {
      result.current.clearSelection()
    })
    expect(result.current.selectedSquares).toEqual([])
  })

  it('accepts a wild color and wild number selection when the move is valid', () => {
    const { result } = renderSelection(
      createGameState({
        selectedDice: {
          color: { id: 'color-1', type: 'color', value: 'wild', selected: true },
          number: { id: 'number-1', type: 'number', value: 'wild', selected: true },
        },
      }),
    )

    act(() => {
      result.current.handleSquareClick(0, 0)
    })

    expect(result.current.canMakeMove()).toBe(true)
  })

  describe('automatic dice selection on group click', () => {
    const createDice = (): DiceResult[] => [
      { id: 'c-orange', type: 'color', value: 'orange', selected: false },
      { id: 'c-wild', type: 'color', value: 'wild', selected: false },
      { id: 'n-2', type: 'number', value: 2, selected: false },
      { id: 'n-wild', type: 'number', value: 'wild', selected: false },
    ]

    const createAutoSelectState = (overrides: Partial<GameState> = {}): GameState =>
      createGameState({
        dice: createDice(),
        selectedDice: { color: null, number: null },
        ...overrides,
      })

    it('selects the group and the matching dice when nothing is selected', () => {
      const { result, selectDice } = renderSelection(createAutoSelectState())

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).toHaveBeenCalledTimes(2)
      expect(selectDice).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c-orange', value: 'orange' }),
      )
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-2', value: 2 }))
      expect(result.current.selectedSquares).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ])
    })

    it('falls back to a color joker when no color die matches', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          dice: [
            { id: 'c-wild', type: 'color', value: 'wild', selected: false },
            { id: 'n-2', type: 'number', value: 2, selected: false },
          ],
        }),
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).toHaveBeenCalledTimes(2)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-wild' }))
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-2' }))
      expect(result.current.selectedSquares).toHaveLength(2)
    })

    it('falls back to a number joker when no number die matches', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          dice: [
            { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            { id: 'n-wild', type: 'number', value: 'wild', selected: false },
          ],
        }),
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).toHaveBeenCalledTimes(2)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-wild' }))
      expect(result.current.selectedSquares).toHaveLength(2)
    })

    it('uses two jokers when only wild dice remain and two jokers are available', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          players: [{ ...createPlayer(), jokersRemaining: 2 }],
          dice: [
            { id: 'c-wild', type: 'color', value: 'wild', selected: false },
            { id: 'n-wild', type: 'number', value: 'wild', selected: false },
          ],
        }),
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).toHaveBeenCalledTimes(2)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-wild' }))
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-wild' }))
      expect(result.current.selectedSquares).toHaveLength(2)
    })

    it('spends at most the jokers the player has left', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          players: [{ ...createPlayer(), jokersRemaining: 1 }],
          dice: [
            { id: 'c-wild', type: 'color', value: 'wild', selected: false },
            { id: 'n-wild', type: 'number', value: 'wild', selected: false },
          ],
        }),
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      // Only the color joker fits the budget: the cell is selected with it.
      expect(selectDice).toHaveBeenCalledTimes(1)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-wild' }))
      expect(result.current.selectedSquares).toEqual([{ row: 0, col: 0 }])
    })

    it('selects the cell and the color die when only the color matches', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          dice: [
            { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            { id: 'n-5', type: 'number', value: 5, selected: false },
          ],
        }),
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).toHaveBeenCalledTimes(1)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(result.current.selectedSquares).toEqual([{ row: 0, col: 0 }])
    })

    it('completes the number die when a matching color die is already selected', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          selectedDice: {
            color: { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            number: null,
          },
        }),
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).toHaveBeenCalledTimes(1)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-2' }))
      expect(result.current.selectedSquares).toHaveLength(2)
    })

    it('completes the color die when a matching number die is already selected', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          selectedDice: {
            color: null,
            number: { id: 'n-2', type: 'number', value: 2, selected: false },
          },
        }),
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).toHaveBeenCalledTimes(1)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(result.current.selectedSquares).toHaveLength(2)
    })

    it('does nothing automatically when both dice are already selected', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          selectedDice: {
            color: { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            number: { id: 'n-2', type: 'number', value: 2, selected: false },
          },
        }),
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).not.toHaveBeenCalled()
      expect(result.current.selectedSquares).toHaveLength(2)
    })

    it('does nothing automatically when cells are already selected', () => {
      const { result, selectDice } = renderSelection(createAutoSelectState())

      act(() => {
        result.current.setSelectedSquares([{ row: 1, col: 0 }])
      })
      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).not.toHaveBeenCalled()
    })

    it('selects the dice the active player left unused during passive-selection', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          phase: 'passive-selection',
          dice: [
            { id: 'c-used', type: 'color', value: 'orange', selected: true },
            { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            { id: 'n-used', type: 'number', value: 2, selected: true },
            { id: 'n-2', type: 'number', value: 2, selected: false },
          ],
        }),
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).toHaveBeenCalledTimes(2)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-2' }))
      expect(result.current.selectedSquares).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ])
    })

    it('ignores dice already used by the active player', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          phase: 'passive-selection',
          dice: createDice().map((die) => ({ ...die, selected: true })),
        }),
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).not.toHaveBeenCalled()
    })

    it('keeps the cell and the color die when the group move is invalid', () => {
      const { result, selectDice } = renderSelection(createAutoSelectState(), {
        isValidMove: vi.fn(() => false),
      })

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).toHaveBeenCalledTimes(1)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(result.current.selectedSquares).toEqual([{ row: 0, col: 0 }])
    })
  })

  describe('hasAnyPossibleMove', () => {
    it('requires both dice to be selected', () => {
      const { result } = renderSelection(createGameState())

      expect(result.current.hasAnyPossibleMove(createBoard(), undefined, 2)).toBe(false)
      expect(result.current.hasAnyPossibleMove(createBoard(), 'orange', undefined)).toBe(false)
    })

    it('finds a move for a matching color and number', () => {
      const { result } = renderSelection(createGameState())

      expect(result.current.hasAnyPossibleMove(createBoard(), 'orange', 2)).toBe(true)
    })

    it('finds no move when no square matches the color', () => {
      const { result } = renderSelection(createGameState())

      expect(result.current.hasAnyPossibleMove(createBoard(), 'green', 2)).toBe(false)
    })

    it('tries every group size with wild dice', () => {
      const { result } = renderSelection(createGameState())

      expect(result.current.hasAnyPossibleMove(createBoard(), 'wild', 'wild')).toBe(true)
    })

    it('finds no move when every candidate is invalid', () => {
      const { result } = renderSelection(createGameState(), { isValidMove: vi.fn(() => false) })

      expect(result.current.hasAnyPossibleMove(createBoard(), 'wild', 'wild')).toBe(false)
    })
  })
})
