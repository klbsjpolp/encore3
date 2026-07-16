import { MAX_SELECTABLE_CELLS } from '@/lib/game-rules'
import type { ColorDiceResult, DiceResult, GameColor, NumberDiceResult, Square } from '@/types/game'
import { DICE_COLOR_FACES, DICE_NUMBER_FACES } from '@/types/game'

import { findConnectedGroup } from './board'

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

interface CellRef {
  row: number
  col: number
}
type IsValidMove = (squares: CellRef[], color: GameColor, board: Square[][]) => boolean

// True when a real (non-wild), unselected number die could legally play a
// `min < size <= max` selection within this group — i.e. an alternative the
// player hasn't foreclosed yet. `group.slice(0, size)` mirrors how
// findConnectedGroup's BFS order keeps any prefix connected (the same trick
// hasAnyPossibleMove uses), so this checks an actually playable candidate
// rather than just comparing face values.
const hasPlayableNumberDieInRange = (
  dice: DiceResult[],
  group: CellRef[],
  color: GameColor,
  board: Square[][],
  isValidMove: IsValidMove,
  min: number,
  max: number,
): boolean =>
  dice.some(
    (d) =>
      d.type === 'number' &&
      !d.selected &&
      typeof d.value === 'number' &&
      d.value > min &&
      d.value <= max &&
      isValidMove(group.slice(0, d.value), color, board),
  )

// True when the group offers a smaller, real-die-matched, still-open
// alternative to auto-playing the whole group with the joker. While that's
// the case, auto-selection must not reach for the joker on the player's
// behalf: picking a smaller cell count that has a real die is a legitimate,
// still-open choice, so spending the scarce joker to grab the whole group
// has to stay the player's own call.
export const hasSmallerNumberDieAlternative = (
  dice: DiceResult[],
  group: CellRef[],
  color: GameColor,
  board: Square[][],
  isValidMove: IsValidMove,
): boolean =>
  hasPlayableNumberDieInRange(dice, group, color, board, isValidMove, 0, group.length - 1)

// True when the group offers a larger, real-die-matched selection the player
// could still reach by selecting more cells beyond `currentSize`. Smaller
// sizes don't need checking here: if one had a real match, the incremental
// auto-fill would already have locked it in on an earlier click, so by
// construction the only still-open alternative left is a bigger one.
export const hasLargerNumberDieAlternative = (
  dice: DiceResult[],
  group: CellRef[],
  currentSize: number,
  color: GameColor,
  board: Square[][],
  isValidMove: IsValidMove,
): boolean =>
  hasPlayableNumberDieInRange(dice, group, color, board, isValidMove, currentSize, group.length)

// Best affordable dice pair to play a whole group of `size` cells of `color`,
// ignoring any current selection (exact preferred, joker fallback in budget).
// Returns null when the group cannot be fully played.
export const findDicePairForGroup = (
  dice: DiceResult[],
  color: GameColor,
  size: number,
  jokersRemaining: number,
): { color: ColorDiceResult; number: NumberDiceResult } | null => {
  if (size < 1 || size > MAX_SELECTABLE_CELLS) {
    return null
  }
  const colorDice = findAutoColorDice(dice, color, jokersRemaining)
  if (!colorDice) {
    return null
  }
  const jokersAfterColor = jokersRemaining - (colorDice.value === 'wild' ? 1 : 0)
  const numberDice = findAutoNumberDice(dice, size, jokersAfterColor)
  if (!numberDice) {
    return null
  }
  return { color: colorDice, number: numberDice }
}

export interface ForcedSelection {
  // 'move': a single legal placement exists, so both dice and its cells are
  // pre-selected. 'dice': several placements exist but they all use the same
  // dice pair, so only the dice are pre-selected (the player picks the cells).
  mode: 'move' | 'dice'
  color: ColorDiceResult
  number: NumberDiceResult
  squares: { row: number; col: number }[]
}

// Scans the board for whole-group moves that can be played with the currently
// available dice. Returns a selection to apply when the turn is effectively
// decided: exactly one placement, or a single dice pair shared by every
// placement. Only joker-free placements are considered: subset plays are not
// enumerated, so a joker-requiring "only" move might not actually be the only
// move, and a joker is scarce enough that spending one should stay the
// player's explicit choice. A null result simply means nothing is pre-selected.
export const findForcedSelection = (
  dice: DiceResult[],
  board: Square[][],
  isValidMove: (
    squares: { row: number; col: number }[],
    color: GameColor,
    board: Square[][],
  ) => boolean,
): ForcedSelection | null => {
  const placements: {
    color: ColorDiceResult
    number: NumberDiceResult
    squares: { row: number; col: number }[]
  }[] = []
  const seenGroups = new Set<string>()

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const cell = board[row][col]
      if (cell.crossed) {
        continue
      }
      const group = findConnectedGroup(row, col, cell.color, board)
      if (group.length === 0 || group.length > MAX_SELECTABLE_CELLS) {
        continue
      }
      const groupKey = group
        .map((c) => `${c.row},${c.col}`)
        .sort()
        .join(';')
      if (seenGroups.has(groupKey)) {
        continue
      }
      seenGroups.add(groupKey)
      if (!isValidMove(group, cell.color, board)) {
        continue
      }
      // Budget 0 keeps this to exact (non-wild) dice only.
      const pair = findDicePairForGroup(dice, cell.color, group.length, 0)
      if (pair) {
        placements.push({ color: pair.color, number: pair.number, squares: group })
      }
    }
  }

  if (placements.length === 0) {
    return null
  }

  const first = placements[0]
  if (placements.length === 1) {
    return { mode: 'move', color: first.color, number: first.number, squares: first.squares }
  }

  // Several placements: only pre-select the dice if every placement needs the
  // very same dice pair (by face value), leaving the cell choice to the player.
  const pairKey = (p: (typeof placements)[number]) => `${p.color.value}|${p.number.value}`
  const key = pairKey(first)
  if (placements.every((p) => pairKey(p) === key)) {
    return { mode: 'dice', color: first.color, number: first.number, squares: [] }
  }

  return null
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
