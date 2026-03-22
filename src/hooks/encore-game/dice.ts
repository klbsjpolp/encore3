import type { DiceResult } from '@/types/game'
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
