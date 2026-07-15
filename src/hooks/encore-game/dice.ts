import type { ColorDiceResult, DiceResult, GameColor, NumberDiceResult } from '@/types/game'
import { DICE_COLOR_FACES, DICE_NUMBER_FACES } from '@/types/game'

const generateDiceId = () => Math.random().toString(36).substr(2, 9)

export const rollDice = (): DiceResult[] => {
  const dice: DiceResult[] = []
  for (let i = 0; i < 3; i++) {
    dice.push({
      id: generateDiceId(),
      type: 'color',
      value: DICE_COLOR_FACES[Math.floor(Math.random() * DICE_COLOR_FACES.length)],
      selected: false,
    })
  }
  for (let i = 0; i < 3; i++) {
    dice.push({
      id: generateDiceId(),
      type: 'number',
      value: DICE_NUMBER_FACES[Math.floor(Math.random() * DICE_NUMBER_FACES.length)],
      selected: false,
    })
  }
  return dice
}

// Strict value comparisons exclude wild faces: auto-selection never spends a joker.
export const findMatchingDicePair = (
  dice: DiceResult[],
  color: GameColor,
  groupSize: number,
): { color: ColorDiceResult; number: NumberDiceResult } | null => {
  const colorDice = dice.find(
    (d): d is ColorDiceResult => d.type === 'color' && !d.selected && d.value === color,
  )
  const numberDice = dice.find(
    (d): d is NumberDiceResult => d.type === 'number' && !d.selected && d.value === groupSize,
  )
  if (!colorDice || !numberDice) {
    return null
  }
  return { color: colorDice, number: numberDice }
}
