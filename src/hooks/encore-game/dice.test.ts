import { describe, expect, it } from 'vitest'

import type { DiceResult } from '@/types/game'
import { DICE_COLOR_FACES, DICE_NUMBER_FACES } from '@/types/game'

import { findMatchingDicePair, rollDice } from './dice'

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

  describe('findMatchingDicePair', () => {
    const createDice = (): DiceResult[] => [
      { id: 'c-orange', type: 'color', value: 'orange', selected: false },
      { id: 'c-wild', type: 'color', value: 'wild', selected: false },
      { id: 'n-2', type: 'number', value: 2, selected: false },
      { id: 'n-wild', type: 'number', value: 'wild', selected: false },
    ]

    it('finds the color and number dice matching a group', () => {
      const pair = findMatchingDicePair(createDice(), 'orange', 2)

      expect(pair?.color.id).toBe('c-orange')
      expect(pair?.number.id).toBe('n-2')
    })

    it('never falls back to wild dice (jokers)', () => {
      expect(findMatchingDicePair(createDice(), 'blue', 2)).toBeNull()
      expect(findMatchingDicePair(createDice(), 'orange', 3)).toBeNull()
    })

    it('ignores dice already used by the active player', () => {
      const dice = createDice().map((die) => (die.id === 'n-2' ? { ...die, selected: true } : die))

      expect(findMatchingDicePair(dice, 'orange', 2)).toBeNull()
    })
  })
})
