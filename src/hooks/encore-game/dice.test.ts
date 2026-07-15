import { describe, expect, it } from 'vitest'

import type { ColorDiceResult, DiceResult, NumberDiceResult } from '@/types/game'
import { DICE_COLOR_FACES, DICE_NUMBER_FACES } from '@/types/game'

import { findAutoColorDice, findAutoNumberDice, resolveAutoDiceSelection, rollDice } from './dice'

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
})
