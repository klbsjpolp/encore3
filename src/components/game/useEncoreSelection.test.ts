import { act, renderHook, waitFor } from '@testing-library/react'
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
          // c-blue gives the blue group a distinct playable pair, so no single
          // move is forced and the click is what drives the selection here.
          dice: [
            { id: 'c-wild', type: 'color', value: 'wild', selected: false },
            { id: 'c-blue', type: 'color', value: 'blue', selected: false },
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
          // c-blue gives the blue group a distinct playable pair, so no single
          // move is forced and the click is what drives the selection here.
          dice: [
            { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            { id: 'c-blue', type: 'color', value: 'blue', selected: false },
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
          // c-blue / n-5 give the blue group a distinct pair, so no single move
          // is forced; the orange group still resolves to the two jokers.
          dice: [
            { id: 'c-wild', type: 'color', value: 'wild', selected: false },
            { id: 'c-blue', type: 'color', value: 'blue', selected: false },
            { id: 'n-wild', type: 'number', value: 'wild', selected: false },
            { id: 'n-5', type: 'number', value: 5, selected: false },
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

    it('completes the group and number die when a matching color die is already selected', () => {
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

      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-2' }))
      expect(result.current.selectedSquares).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ])
    })

    it('completes the group and color die when a matching number die is already selected', () => {
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

      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(result.current.selectedSquares).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ])
    })

    it('re-selects the clicked group even when both dice are already selected', () => {
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

      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-2' }))
      expect(result.current.selectedSquares).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ])
    })

    it('switches to the clicked valid group even when other cells are selected', () => {
      const { result, selectDice } = renderSelection(createAutoSelectState())

      act(() => {
        result.current.setSelectedSquares([{ row: 1, col: 0 }])
      })
      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-2' }))
      expect(result.current.selectedSquares).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ])
    })

    it('applies the exact die before the joker when switching replaces a committed wild', () => {
      // A wild number die is already committed (1 joker spent) and only 1 joker
      // is left. Clicking an orange group that needs a colour joker but has an
      // exact number die must free the old wild number first, so the exact die
      // is selected before the new colour joker.
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          players: [{ ...createPlayer(), jokersRemaining: 1 }],
          selectedDice: {
            color: null,
            number: { id: 'n-committed', type: 'number', value: 'wild', selected: false },
          },
          dice: [
            { id: 'c-wild', type: 'color', value: 'wild', selected: false },
            { id: 'n-2', type: 'number', value: 2, selected: false },
          ],
        }),
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice.mock.calls[0][0]).toEqual(expect.objectContaining({ id: 'n-2' }))
      expect(selectDice.mock.calls[1][0]).toEqual(expect.objectContaining({ id: 'c-wild' }))
      expect(result.current.selectedSquares).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ])
    })

    it('accumulates cells instead of switching while a number die is committed', () => {
      // A "1" number die is available, but the committed "2" die means the
      // player is placing two cells: clicks build the selection, they do not
      // switch to the one-cell group under the pointer.
      const { result } = renderSelection(
        createAutoSelectState({
          selectedDice: {
            color: { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            number: { id: 'n-2', type: 'number', value: 2, selected: false },
          },
          dice: [
            { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            { id: 'n-1', type: 'number', value: 1, selected: false },
            { id: 'n-2', type: 'number', value: 2, selected: false },
          ],
        }),
        { isValidMove: vi.fn((squares: { row: number; col: number }[]) => squares.length <= 2) },
      )

      act(() => {
        result.current.setSelectedSquares([{ row: 0, col: 0 }])
      })
      act(() => {
        result.current.handleSquareClick(1, 0)
      })

      expect(result.current.selectedSquares).toEqual([
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ])
    })

    it('auto-selects the matching dice once a manual subset forms a valid move', () => {
      // No dice chosen yet; the clicked colour has a 6-cell group that cannot
      // be played whole, so the player builds a 3-cell subset by hand. Once the
      // subset is valid and a "3" die is available, that die is auto-selected.
      const sixCells = Array.from({ length: 6 }, (_, col) => ({ row: 0, col }))
      const board: Square[][] = [
        sixCells.map((c) => ({
          color: 'orange' as const,
          hasStar: false,
          crossed: false,
          column: String.fromCharCode(65 + c.col),
          row: 0,
        })),
      ]
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          players: [{ ...createPlayer(), board }],
          selectedDice: { color: null, number: null },
          dice: [
            { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            { id: 'n-3', type: 'number', value: 3, selected: false },
          ],
        }),
        {
          isValidMove: vi.fn(
            (squares: { row: number; col: number }[]) => squares.length >= 1 && squares.length <= 5,
          ),
        },
      )

      // First click: the 6-group is too big to play whole, so only the clicked
      // cell and the colour die are selected.
      act(() => {
        result.current.handleSquareClick(0, 0)
      })
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(result.current.selectedSquares).toEqual([{ row: 0, col: 0 }])

      act(() => {
        result.current.handleSquareClick(0, 1)
      })
      act(() => {
        result.current.handleSquareClick(0, 2)
      })

      expect(result.current.selectedSquares).toHaveLength(3)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-3' }))
    })

    it('does not spend the joker on a group when a smaller real die could still play it', () => {
      // A 5-cell group with dice 1, wild and 3: the wild could cover the whole
      // group, but 1 and 3 are real, joker-free alternatives for smaller counts.
      // Auto-selection must leave the joker alone and let the player build up
      // their own count instead of spending it on their behalf.
      const fiveCells = Array.from({ length: 5 }, (_, col) => ({ row: 0, col }))
      const board: Square[][] = [
        fiveCells.map((c) => ({
          color: 'orange' as const,
          hasStar: false,
          crossed: false,
          column: String.fromCharCode(65 + c.col),
          row: 0,
        })),
      ]
      const gameState = createAutoSelectState({
        players: [{ ...createPlayer(), board }],
        selectedDice: { color: null, number: null },
        dice: [
          { id: 'c-orange', type: 'color', value: 'orange', selected: false },
          { id: 'n-1', type: 'number', value: 1, selected: false },
          { id: 'n-wild', type: 'number', value: 'wild', selected: false },
          { id: 'n-3', type: 'number', value: 3, selected: false },
        ],
      })
      const selectDice = vi.fn((die: DiceResult) => {
        if (die.type === 'color') {
          gameState.selectedDice = { ...gameState.selectedDice, color: die }
        } else {
          gameState.selectedDice = { ...gameState.selectedDice, number: die }
        }
      })
      const isValidMove = vi.fn(
        (squares: { row: number; col: number }[]) => squares.length >= 1 && squares.length <= 5,
      )
      const { result, rerender } = renderHook(
        (gs: GameState) =>
          useEncoreSelection({
            gameState: gs,
            makeMove: vi.fn(),
            skipTurn: vi.fn(),
            selectDice,
            isValidMove,
          }),
        { initialProps: gameState },
      )

      // First click: only the color die and the clicked cell are selected; the
      // "1" and joker number dice both stay open so the player can keep going.
      act(() => {
        result.current.handleSquareClick(0, 0)
      })
      rerender({ ...gameState })
      expect(selectDice).toHaveBeenCalledTimes(1)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(result.current.selectedSquares).toEqual([{ row: 0, col: 0 }])

      // Second click: two cells selected, but neither "1" nor the joker fits,
      // and 3 is still reachable, so no number die is auto-selected yet.
      act(() => {
        result.current.handleSquareClick(0, 1)
      })
      rerender({ ...gameState })
      expect(selectDice).toHaveBeenCalledTimes(1)
      expect(result.current.selectedSquares).toHaveLength(2)

      // Third click: three cells match the real "3" die exactly, so it (and
      // only it) is auto-selected — the joker was never touched.
      act(() => {
        result.current.handleSquareClick(0, 2)
      })
      rerender({ ...gameState })
      expect(result.current.selectedSquares).toHaveLength(3)
      expect(selectDice).toHaveBeenCalledTimes(2)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-3' }))
      expect(selectDice).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'n-wild' }))
    })

    it('does not lock in a smaller real die while a larger real die is still reachable', () => {
      // A 6-cell group (too big to play whole) with dice 1, 2, 3 and a joker.
      // Selecting exactly 2 cells must not auto-select "2": since "3" could
      // still be reached by adding one more cell, locking in "2" now would
      // force the player to manually undo it just to keep growing.
      const sixCells = Array.from({ length: 6 }, (_, col) => ({ row: 0, col }))
      const board: Square[][] = [
        sixCells.map((c) => ({
          color: 'orange' as const,
          hasStar: false,
          crossed: false,
          column: String.fromCharCode(65 + c.col),
          row: 0,
        })),
      ]
      const gameState = createAutoSelectState({
        players: [{ ...createPlayer(), board }],
        selectedDice: { color: null, number: null },
        dice: [
          { id: 'c-orange', type: 'color', value: 'orange', selected: false },
          { id: 'n-1', type: 'number', value: 1, selected: false },
          { id: 'n-2', type: 'number', value: 2, selected: false },
          { id: 'n-3', type: 'number', value: 3, selected: false },
          { id: 'n-wild', type: 'number', value: 'wild', selected: false },
        ],
      })
      const selectDice = vi.fn((die: DiceResult) => {
        if (die.type === 'color') {
          gameState.selectedDice = { ...gameState.selectedDice, color: die }
        } else {
          gameState.selectedDice = { ...gameState.selectedDice, number: die }
        }
      })
      const isValidMove = vi.fn(() => true)
      const { result, rerender } = renderHook(
        (gs: GameState) =>
          useEncoreSelection({
            gameState: gs,
            makeMove: vi.fn(),
            skipTurn: vi.fn(),
            selectDice,
            isValidMove,
          }),
        { initialProps: gameState },
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })
      rerender({ ...gameState })
      act(() => {
        result.current.handleSquareClick(0, 1)
      })
      rerender({ ...gameState })

      expect(result.current.selectedSquares).toHaveLength(2)
      expect(gameState.selectedDice.number).toBeNull()

      // A third click is still possible (not blocked by a premature "2"),
      // and it lands exactly on "3".
      act(() => {
        result.current.handleSquareClick(0, 2)
      })
      rerender({ ...gameState })

      expect(result.current.selectedSquares).toHaveLength(3)
      expect(gameState.selectedDice.number?.value).toBe(3)
    })

    it('still spends the joker on the whole group when no smaller subset is actually legal', () => {
      // A "2" die numerically fits under the 3-cell group, but this board only
      // accepts the full 3-cell placement (a 2-cell subset is never valid
      // here) — so the joker is genuinely forced, and the first click should
      // spend it rather than waiting for a smaller option that doesn't exist.
      const threeCells = Array.from({ length: 3 }, (_, col) => ({ row: 0, col }))
      const board: Square[][] = [
        threeCells.map((c) => ({
          color: 'orange' as const,
          hasStar: false,
          crossed: false,
          column: String.fromCharCode(65 + c.col),
          row: 0,
        })),
      ]
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          players: [{ ...createPlayer(), board }],
          selectedDice: { color: null, number: null },
          dice: [
            { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            { id: 'n-2', type: 'number', value: 2, selected: false },
            { id: 'n-wild', type: 'number', value: 'wild', selected: false },
          ],
        }),
        { isValidMove: vi.fn((squares: { row: number; col: number }[]) => squares.length === 3) },
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })

      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-wild' }))
      expect(result.current.selectedSquares).toHaveLength(3)
    })

    it('completes a manually built subset with the joker when no larger real die is reachable', () => {
      // Only "1" and a joker are on offer for a 5-cell group. After the first
      // click leaves the number die open (1 doesn't match the whole group),
      // building up to 2 cells has no larger real die left to wait for, so the
      // joker should complete the subset instead of leaving it stuck.
      const fiveCells = Array.from({ length: 5 }, (_, col) => ({ row: 0, col }))
      const board: Square[][] = [
        fiveCells.map((c) => ({
          color: 'orange' as const,
          hasStar: false,
          crossed: false,
          column: String.fromCharCode(65 + c.col),
          row: 0,
        })),
      ]
      const gameState = createAutoSelectState({
        players: [{ ...createPlayer(), board }],
        selectedDice: { color: null, number: null },
        dice: [
          { id: 'c-orange', type: 'color', value: 'orange', selected: false },
          { id: 'n-1', type: 'number', value: 1, selected: false },
          { id: 'n-wild', type: 'number', value: 'wild', selected: false },
        ],
      })
      const selectDice = vi.fn((die: DiceResult) => {
        if (die.type === 'color') {
          gameState.selectedDice = { ...gameState.selectedDice, color: die }
        } else {
          gameState.selectedDice = { ...gameState.selectedDice, number: die }
        }
      })
      const isValidMove = vi.fn(
        (squares: { row: number; col: number }[]) => squares.length >= 1 && squares.length <= 5,
      )
      const { result, rerender } = renderHook(
        (gs: GameState) =>
          useEncoreSelection({
            gameState: gs,
            makeMove: vi.fn(),
            skipTurn: vi.fn(),
            selectDice,
            isValidMove,
          }),
        { initialProps: gameState },
      )

      act(() => {
        result.current.handleSquareClick(0, 0)
      })
      rerender({ ...gameState })
      expect(gameState.selectedDice.number).toBeNull()

      act(() => {
        result.current.handleSquareClick(0, 1)
      })
      rerender({ ...gameState })

      expect(result.current.selectedSquares).toHaveLength(2)
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-wild' }))
    })

    it('selects the dice the active player left unused during passive-selection', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          phase: 'passive-selection',
          // c-blue keeps the blue group playable with a distinct pair, so the
          // click (not a forced move) drives the selection.
          dice: [
            { id: 'c-used', type: 'color', value: 'orange', selected: true },
            { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            { id: 'c-blue', type: 'color', value: 'blue', selected: false },
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

  describe('forced-move pre-selection', () => {
    it('pre-selects dice and cells when a single move is possible', async () => {
      // Only the orange die + "2" can be played: the blue group has no die.
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          selectedDice: { color: null, number: null },
          dice: [
            { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            { id: 'n-2', type: 'number', value: 2, selected: false },
          ],
        }),
      )

      await waitFor(() => {
        expect(result.current.selectedSquares).toEqual([
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ])
      })
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-orange' }))
      expect(selectDice).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-2' }))
    })

    it('does not pre-select a forced move that would spend a joker', async () => {
      // Every playable move here needs the colour joker, so nothing is forced —
      // spending a scarce joker stays the player's explicit choice.
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          selectedDice: { color: null, number: null },
          dice: [
            { id: 'c-wild', type: 'color', value: 'wild', selected: false },
            { id: 'n-2', type: 'number', value: 2, selected: false },
          ],
        }),
      )

      // Give the deferred frame a chance to fire before asserting nothing ran.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
      expect(selectDice).not.toHaveBeenCalled()
      expect(result.current.selectedSquares).toEqual([])
    })

    it('does not pre-select anything when the choice is ambiguous', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          selectedDice: { color: null, number: null },
          dice: [
            { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            { id: 'c-blue', type: 'color', value: 'blue', selected: false },
            { id: 'n-2', type: 'number', value: 2, selected: false },
          ],
        }),
      )

      expect(selectDice).not.toHaveBeenCalled()
      expect(result.current.selectedSquares).toEqual([])
    })

    it('stays inert outside the selection phases', () => {
      const { result, selectDice } = renderSelection(
        createAutoSelectState({
          phase: 'rolling',
          selectedDice: { color: null, number: null },
          dice: [
            { id: 'c-orange', type: 'color', value: 'orange', selected: false },
            { id: 'n-2', type: 'number', value: 2, selected: false },
          ],
        }),
      )

      expect(selectDice).not.toHaveBeenCalled()
      expect(result.current.selectedSquares).toEqual([])
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
