import { describe, expect, it, vi } from 'vitest'

import type { ColorDiceResult, DiceResult, GameColor, NumberDiceResult, Square } from '@/types/game'
import { DICE_COLOR_FACES, DICE_NUMBER_FACES } from '@/types/game'

import { findConnectedGroup } from './board'
import {
  findAutoColorDice,
  findAutoNumberDice,
  findDicePairForGroup,
  findForcedSelection,
  hasLargerNumberDieAlternative,
  hasSmallerNumberDieAlternative,
  resolveAutoDiceSelection,
  rollDice,
} from './dice'
import { isValidMoveSelection } from './moveValidation'

// Builds a board from a grid of colours; a `null` cell is crossed. Column H
// (index 7) is the free column, so single groups placed there are valid
// without needing an adjacent crossed cell.
const buildBoard = (grid: (GameColor | null)[][]): Square[][] =>
  grid.map((cols, row) =>
    cols.map((color, col) => ({
      color: color ?? 'yellow',
      hasStar: false,
      crossed: color === null,
      column: String.fromCharCode(65 + col),
      row,
    })),
  )

describe('encore-game/dice', () => {
  it('rolls 3 color dice and 3 number dice with valid values', () => {
    const dice = rollDice()

    expect(dice).toHaveLength(6)

    const colorDice = dice.filter((die) => die.type === 'color')
    const numberDice = dice.filter((die) => die.type === 'number')

    expect(colorDice).toHaveLength(3)
    expect(numberDice).toHaveLength(3)
    expect(dice.every((die) => die.selected === false)).toBe(true)

    expect(colorDice.every((die) => DICE_COLOR_FACES.includes(die.value))).toBe(true)
    expect(numberDice.every((die) => DICE_NUMBER_FACES.includes(die.value))).toBe(true)

    const uniqueIds = new Set(dice.map((die) => die.id))
    expect(uniqueIds.size).toBe(dice.length)
  })

  const createDice = (): DiceResult[] => [
    { id: 'c-orange', type: 'color', value: 'orange', selected: false },
    { id: 'c-wild', type: 'color', value: 'wild', selected: false },
    { id: 'n-2', type: 'number', value: 2, selected: false },
    { id: 'n-wild', type: 'number', value: 'wild', selected: false },
  ]

  describe('findAutoColorDice', () => {
    it('prefers the exact color die over a joker', () => {
      expect(findAutoColorDice(createDice(), 'orange', 8)?.id).toBe('c-orange')
    })

    it('falls back to a joker only when one is available', () => {
      expect(findAutoColorDice(createDice(), 'blue', 1)?.id).toBe('c-wild')
      expect(findAutoColorDice(createDice(), 'blue', 0)).toBeNull()
    })

    it('ignores dice already used by the active player', () => {
      const dice = createDice().map((die) => ({ ...die, selected: true }))

      expect(findAutoColorDice(dice, 'orange', 8)).toBeNull()
    })
  })

  describe('findAutoNumberDice', () => {
    it('prefers the exact number die over a joker', () => {
      expect(findAutoNumberDice(createDice(), 2, 8)?.id).toBe('n-2')
    })

    it('falls back to a joker only when one is available', () => {
      expect(findAutoNumberDice(createDice(), 3, 1)?.id).toBe('n-wild')
      expect(findAutoNumberDice(createDice(), 3, 0)).toBeNull()
    })

    it('never uses a joker for an oversized group', () => {
      expect(findAutoNumberDice(createDice(), 6, 8)).toBeNull()
    })
  })

  // A straight 5-cell orange row with a crossed neighbour under the last
  // cell (0,4): that cell is the group's only "anchor" (the only single cell
  // that alone satisfies isValidMoveSelection).
  const lineBoard = buildBoard([
    ['orange', 'orange', 'orange', 'orange', 'orange', 'blue', 'blue', 'blue'],
    ['blue', 'blue', 'blue', 'blue', null, 'blue', 'blue', 'blue'],
  ])
  const lineGroup = findConnectedGroup(0, 0, 'orange', lineBoard)

  // A plus-shaped group — left/centre/up/down/right arms — where the only
  // crossed neighbour sits beside the right arm, so only the right arm is an
  // anchor. Clicking the left arm makes findConnectedGroup's BFS order
  // [left, centre, up, down, right]: a naive size-3 prefix from that root
  // (left, centre, up) never reaches the anchor and is invalid, even though
  // {left, centre, right} legally plays 3 cells.
  const plusBoard = buildBoard([
    ['blue', 'orange', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
    ['orange', 'orange', 'orange', null, 'blue', 'blue', 'blue', 'blue'],
    ['blue', 'orange', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
  ])
  const plusGroupFromLeftArm = findConnectedGroup(1, 0, 'orange', plusBoard)

  describe('hasSmallerNumberDieAlternative', () => {
    const dice: DiceResult[] = [
      { id: 'n-1', type: 'number', value: 1, selected: false },
      { id: 'n-wild', type: 'number', value: 'wild', selected: false },
      { id: 'n-3', type: 'number', value: 3, selected: false },
    ]

    it('is true when a real die could legally play a smaller count', () => {
      expect(
        hasSmallerNumberDieAlternative(dice, lineGroup, 'orange', lineBoard, isValidMoveSelection),
      ).toBe(true)
    })

    it('is false when no real die is smaller than the group', () => {
      const oneCell = lineGroup.slice(0, 1)
      expect(
        hasSmallerNumberDieAlternative(dice, oneCell, 'orange', lineBoard, isValidMoveSelection),
      ).toBe(false)
    })

    it('ignores already selected dice', () => {
      const selected = dice.map((d) => ({ ...d, selected: true }))
      expect(
        hasSmallerNumberDieAlternative(
          selected,
          lineGroup,
          'orange',
          lineBoard,
          isValidMoveSelection,
        ),
      ).toBe(false)
    })

    it('ignores a smaller die whose subset is not actually a legal move', () => {
      // No single cell is treated as legal on its own, so no smaller subset
      // (of any size) can be an alternative — not even the full group.
      const threeCells = lineGroup.slice(0, 3)
      const isValidMove = vi.fn((squares: { row: number; col: number }[]) => squares.length === 3)
      const twoDice: DiceResult[] = [
        { id: 'n-2', type: 'number', value: 2, selected: false },
        { id: 'n-wild', type: 'number', value: 'wild', selected: false },
      ]
      expect(
        hasSmallerNumberDieAlternative(twoDice, threeCells, 'orange', lineBoard, isValidMove),
      ).toBe(false)
    })

    it('finds a legal subset through another branch when the clicked cell is not the anchor', () => {
      // Clicking the left arm orders the group [left, centre, up, down,
      // right]; a naive slice(0, 3) would be {left, centre, up}, which never
      // touches the crossed cell beside the right arm and is invalid. The
      // real playable 3-cell subset is {left, centre, right}.
      const dice3: DiceResult[] = [
        { id: 'n-3', type: 'number', value: 3, selected: false },
        { id: 'n-wild', type: 'number', value: 'wild', selected: false },
      ]
      expect(
        hasSmallerNumberDieAlternative(
          dice3,
          plusGroupFromLeftArm,
          'orange',
          plusBoard,
          isValidMoveSelection,
        ),
      ).toBe(true)
    })
  })

  describe('hasLargerNumberDieAlternative', () => {
    const dice: DiceResult[] = [
      { id: 'n-1', type: 'number', value: 1, selected: false },
      { id: 'n-wild', type: 'number', value: 'wild', selected: false },
      { id: 'n-3', type: 'number', value: 3, selected: false },
    ]

    it('is true when a real die is still reachable by growing the selection', () => {
      expect(
        hasLargerNumberDieAlternative(
          dice,
          lineGroup,
          2,
          'orange',
          lineBoard,
          isValidMoveSelection,
        ),
      ).toBe(true)
    })

    it('is false when no real die is reachable beyond the current size', () => {
      const oneAndWild: DiceResult[] = [
        { id: 'n-1', type: 'number', value: 1, selected: false },
        { id: 'n-wild', type: 'number', value: 'wild', selected: false },
      ]
      expect(
        hasLargerNumberDieAlternative(
          oneAndWild,
          lineGroup,
          2,
          'orange',
          lineBoard,
          isValidMoveSelection,
        ),
      ).toBe(false)
    })

    it('finds a legal subset through another branch when the clicked cell is not the anchor', () => {
      const dice3: DiceResult[] = [
        { id: 'n-3', type: 'number', value: 3, selected: false },
        { id: 'n-wild', type: 'number', value: 'wild', selected: false },
      ]
      expect(
        hasLargerNumberDieAlternative(
          dice3,
          plusGroupFromLeftArm,
          1,
          'orange',
          plusBoard,
          isValidMoveSelection,
        ),
      ).toBe(true)
    })

    it('ignores a larger die whose size is not actually legal to reach', () => {
      const isValidMove = vi.fn((squares: { row: number; col: number }[]) => squares.length !== 3)
      expect(
        hasLargerNumberDieAlternative(dice, lineGroup, 2, 'orange', lineBoard, isValidMove),
      ).toBe(false)
    })
  })

  describe('resolveAutoDiceSelection', () => {
    const resolve = (overrides: Partial<Parameters<typeof resolveAutoDiceSelection>[0]> = {}) =>
      resolveAutoDiceSelection({
        dice: createDice(),
        selectedColor: null,
        selectedNumber: null,
        groupColor: 'orange',
        groupSize: 2,
        jokersRemaining: 8,
        isGroupMoveValid: true,
        ...overrides,
      })

    const colorDie = (value: ColorDiceResult['value'], selected = false): ColorDiceResult => ({
      id: `sel-${value}`,
      type: 'color',
      value,
      selected,
    })

    const numberDie = (value: NumberDiceResult['value'], selected = false): NumberDiceResult => ({
      id: `sel-${value}`,
      type: 'number',
      value,
      selected,
    })

    it('selects the exact color and number dice for a matching group', () => {
      expect(resolve()).toEqual({
        diceToSelect: [
          expect.objectContaining({ id: 'c-orange' }),
          expect.objectContaining({ id: 'n-2' }),
        ],
        selectGroup: true,
      })
    })

    it('uses a color joker when no color die matches and a joker is available', () => {
      expect(resolve({ groupColor: 'blue' })).toEqual({
        diceToSelect: [
          expect.objectContaining({ id: 'c-wild' }),
          expect.objectContaining({ id: 'n-2' }),
        ],
        selectGroup: true,
      })
    })

    it('uses a number joker when no number die matches and a joker is available', () => {
      expect(resolve({ groupSize: 3 })).toEqual({
        diceToSelect: [
          expect.objectContaining({ id: 'c-orange' }),
          expect.objectContaining({ id: 'n-wild' }),
        ],
        selectGroup: true,
      })
    })

    it('uses two jokers when neither die matches and two jokers are available', () => {
      expect(resolve({ groupColor: 'blue', groupSize: 3, jokersRemaining: 2 })).toEqual({
        diceToSelect: [
          expect.objectContaining({ id: 'c-wild' }),
          expect.objectContaining({ id: 'n-wild' }),
        ],
        selectGroup: true,
      })
    })

    it('shares the joker budget between both dice', () => {
      expect(resolve({ groupColor: 'blue', groupSize: 3, jokersRemaining: 1 })).toEqual({
        diceToSelect: [expect.objectContaining({ id: 'c-wild' })],
        selectGroup: false,
      })
      expect(resolve({ groupColor: 'blue', groupSize: 3, jokersRemaining: 0 })).toBeNull()
    })

    it('selects only the clicked cell and the color die when the group size has no match', () => {
      const dice = createDice().filter((d) => d.id !== 'n-wild')

      expect(resolve({ dice, groupSize: 3 })).toEqual({
        diceToSelect: [expect.objectContaining({ id: 'c-orange' })],
        selectGroup: false,
      })
    })

    it('completes the number die when a matching color die is already selected', () => {
      expect(resolve({ selectedColor: colorDie('orange') })).toEqual({
        diceToSelect: [expect.objectContaining({ id: 'n-2' })],
        selectGroup: true,
      })
    })

    it('completes the color die when a matching number die is already selected', () => {
      expect(resolve({ selectedNumber: numberDie(2) })).toEqual({
        diceToSelect: [expect.objectContaining({ id: 'c-orange' })],
        selectGroup: true,
      })
    })

    it('counts an already selected joker against the budget', () => {
      const dice = createDice().filter((d) => d.id !== 'n-2')

      expect(
        resolve({ dice, selectedColor: colorDie('wild'), groupSize: 3, jokersRemaining: 1 }),
      ).toBeNull()
      expect(
        resolve({ dice, selectedColor: colorDie('wild'), groupSize: 3, jokersRemaining: 2 }),
      ).toEqual({
        diceToSelect: [expect.objectContaining({ id: 'n-wild' })],
        selectGroup: true,
      })
    })

    it('does nothing when the selected color die does not match the group', () => {
      expect(resolve({ selectedColor: colorDie('blue') })).toBeNull()
    })

    it('does nothing when both dice are already selected', () => {
      expect(
        resolve({ selectedColor: colorDie('orange'), selectedNumber: numberDie(2) }),
      ).toBeNull()
    })

    it('does nothing for a crossed cell (empty group)', () => {
      expect(resolve({ groupSize: 0 })).toBeNull()
    })

    it('keeps the cell and color die when the group move is invalid', () => {
      expect(resolve({ isGroupMoveValid: false })).toEqual({
        diceToSelect: [expect.objectContaining({ id: 'c-orange' })],
        selectGroup: false,
      })
    })
  })

  describe('findForcedSelection', () => {
    // A single orange cell in the free column (H) is the only playable group.
    const singleGroupBoard = () => {
      const grid: (GameColor | null)[][] = [Array.from({ length: 8 }, () => null)]
      grid[0][7] = 'orange'
      return buildBoard(grid)
    }

    it('pre-selects both dice and cells when only one move is possible', () => {
      const dice: DiceResult[] = [
        { id: 'c-orange', type: 'color', value: 'orange', selected: false },
        { id: 'n-1', type: 'number', value: 1, selected: false },
      ]

      const forced = findForcedSelection(dice, singleGroupBoard(), isValidMoveSelection)

      expect(forced).toEqual({
        mode: 'move',
        color: expect.objectContaining({ id: 'c-orange' }),
        number: expect.objectContaining({ id: 'n-1' }),
        squares: [{ row: 0, col: 7 }],
      })
    })

    it('pre-selects only the dice when one pair plays several placements', () => {
      // Two single orange cells in the free column, kept apart by the crossed
      // row between them: the same orange+1 pair plays either, so the placement
      // is ambiguous but the dice are forced.
      const grid: (GameColor | null)[][] = [
        Array.from({ length: 8 }, () => null),
        Array.from({ length: 8 }, () => null),
        Array.from({ length: 8 }, () => null),
      ]
      grid[0][7] = 'orange'
      grid[2][7] = 'orange'
      const dice: DiceResult[] = [
        { id: 'c-orange', type: 'color', value: 'orange', selected: false },
        { id: 'n-1', type: 'number', value: 1, selected: false },
      ]

      const forced = findForcedSelection(dice, buildBoard(grid), isValidMoveSelection)

      expect(forced).toEqual({
        mode: 'dice',
        color: expect.objectContaining({ id: 'c-orange' }),
        number: expect.objectContaining({ id: 'n-1' }),
        squares: [],
      })
    })

    it('returns null when placements need different dice pairs', () => {
      // An orange single and a blue single: distinct pairs, genuine choice.
      const grid: (GameColor | null)[][] = [
        Array.from({ length: 8 }, () => null),
        Array.from({ length: 8 }, () => null),
      ]
      grid[0][7] = 'orange'
      grid[1][7] = 'blue'
      const dice: DiceResult[] = [
        { id: 'c-orange', type: 'color', value: 'orange', selected: false },
        { id: 'c-blue', type: 'color', value: 'blue', selected: false },
        { id: 'n-1', type: 'number', value: 1, selected: false },
      ]

      expect(findForcedSelection(dice, buildBoard(grid), isValidMoveSelection)).toBeNull()
    })

    it('returns null when no move is playable with the available dice', () => {
      const dice: DiceResult[] = [
        { id: 'c-blue', type: 'color', value: 'blue', selected: false },
        { id: 'n-1', type: 'number', value: 1, selected: false },
      ]

      // Only an orange group exists; there is no blue die to play it.
      expect(findForcedSelection(dice, singleGroupBoard(), isValidMoveSelection)).toBeNull()
    })

    it('ignores dice already used by the active player', () => {
      const dice: DiceResult[] = [
        { id: 'c-orange', type: 'color', value: 'orange', selected: true },
        { id: 'n-1', type: 'number', value: 1, selected: true },
      ]

      expect(findForcedSelection(dice, singleGroupBoard(), isValidMoveSelection)).toBeNull()
    })

    it('never forces a move that would spend a joker', () => {
      // The single orange group can only be played with a colour joker; a joker
      // is scarce, so this is left to the player instead of being pre-selected.
      const dice: DiceResult[] = [
        { id: 'c-wild', type: 'color', value: 'wild', selected: false },
        { id: 'n-1', type: 'number', value: 1, selected: false },
      ]

      expect(findForcedSelection(dice, singleGroupBoard(), isValidMoveSelection)).toBeNull()
    })
  })

  describe('findDicePairForGroup', () => {
    const dice: DiceResult[] = [
      { id: 'c-orange', type: 'color', value: 'orange', selected: false },
      { id: 'c-wild', type: 'color', value: 'wild', selected: false },
      { id: 'n-3', type: 'number', value: 3, selected: false },
      { id: 'n-wild', type: 'number', value: 'wild', selected: false },
    ]

    it('returns the exact affordable pair for a playable group', () => {
      expect(findDicePairForGroup(dice, 'orange', 3, 8)).toEqual({
        color: expect.objectContaining({ id: 'c-orange' }),
        number: expect.objectContaining({ id: 'n-3' }),
      })
    })

    it('returns null for an oversized group', () => {
      expect(findDicePairForGroup(dice, 'orange', 6, 8)).toBeNull()
    })

    it('shares the joker budget across both dice', () => {
      expect(findDicePairForGroup(dice, 'blue', 4, 1)).toBeNull()
      expect(findDicePairForGroup(dice, 'blue', 4, 2)).toEqual({
        color: expect.objectContaining({ id: 'c-wild' }),
        number: expect.objectContaining({ id: 'n-wild' }),
      })
    })
  })
})
