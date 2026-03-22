import { describe, expect, it } from 'vitest'

import { DICE_COLOR_FACES, DICE_NUMBER_FACES } from '@/types/game'

import { rollDice } from './dice'

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
})
