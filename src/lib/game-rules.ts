import type { DiceNumber } from '@/types/game'

export const MAX_SELECTABLE_CELLS = 5

export const getSelectionLimit = (numberValue: DiceNumber | undefined): number => {
  if (typeof numberValue === 'number') {
    return numberValue
  }

  return MAX_SELECTABLE_CELLS
}
