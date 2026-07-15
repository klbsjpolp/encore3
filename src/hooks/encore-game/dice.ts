import { MAX_SELECTABLE_CELLS } from '@/lib/game-rules'
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

// Exact faces are always preferred; a wild face (joker) is only a fallback,
// and only when the player still has enough jokers to pay for it.
export const findAutoColorDice = (
  dice: DiceResult[],
  color: GameColor,
  jokersAvailable: number,
): ColorDiceResult | null => {
  const colorDice = dice.filter((d): d is ColorDiceResult => d.type === 'color' && !d.selected)
  return (
    colorDice.find((d) => d.value === color) ??
    (jokersAvailable >= 1 ? (colorDice.find((d) => d.value === 'wild') ?? null) : null)
  )
}

export const findAutoNumberDice = (
  dice: DiceResult[],
  groupSize: number,
  jokersAvailable: number,
): NumberDiceResult | null => {
  const numberDice = dice.filter((d): d is NumberDiceResult => d.type === 'number' && !d.selected)
  const wildAllowed = jokersAvailable >= 1 && groupSize >= 1 && groupSize <= MAX_SELECTABLE_CELLS
  return (
    numberDice.find((d) => d.value === groupSize) ??
    (wildAllowed ? (numberDice.find((d) => d.value === 'wild') ?? null) : null)
  )
}

interface ResolveAutoDiceSelectionArgs {
  dice: DiceResult[]
  selectedColor: ColorDiceResult | null
  selectedNumber: NumberDiceResult | null
  groupColor: GameColor
  groupSize: number
  jokersRemaining: number
  isGroupMoveValid: boolean
}

export interface AutoDiceSelection {
  diceToSelect: DiceResult[]
  // false: only the clicked cell is selected (color matched, group did not).
  selectGroup: boolean
}

export const resolveAutoDiceSelection = ({
  dice,
  selectedColor,
  selectedNumber,
  groupColor,
  groupSize,
  jokersRemaining,
  isGroupMoveValid,
}: ResolveAutoDiceSelectionArgs): AutoDiceSelection | null => {
  if ((selectedColor && selectedNumber) || groupSize === 0) {
    return null
  }

  const jokersAvailable =
    jokersRemaining -
    (selectedColor?.value === 'wild' ? 1 : 0) -
    (selectedNumber?.value === 'wild' ? 1 : 0)

  const colorDice = selectedColor ? null : findAutoColorDice(dice, groupColor, jokersAvailable)
  const colorMatches = selectedColor
    ? selectedColor.value === 'wild' || selectedColor.value === groupColor
    : colorDice !== null
  if (!colorMatches) {
    return null
  }

  const jokersAfterColor = jokersAvailable - (colorDice?.value === 'wild' ? 1 : 0)
  const numberDice = selectedNumber ? null : findAutoNumberDice(dice, groupSize, jokersAfterColor)
  const numberMatches = selectedNumber
    ? selectedNumber.value === groupSize ||
      (selectedNumber.value === 'wild' && groupSize <= MAX_SELECTABLE_CELLS)
    : numberDice !== null

  if (numberMatches && isGroupMoveValid) {
    const diceToSelect = [colorDice, numberDice].filter((d): d is DiceResult => d !== null)
    return { diceToSelect, selectGroup: true }
  }

  if (colorDice) {
    return { diceToSelect: [colorDice], selectGroup: false }
  }

  return null
}
