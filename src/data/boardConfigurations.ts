import { BLUE_BOARD } from './boards/blueBoard'
import { CLASSIC_BOARD } from './boards/classicBoard'
import { GREEN_BOARD } from './boards/greenBoard'
import { ORANGE_BOARD } from './boards/orangeBoard'
import { RANDOM_BOARD_TEMPLATE } from './boards/randomBoardTemplate'
import { RED_BOARD } from './boards/redBoard'
import type { BoardConfiguration } from './boards/types'
import { BoardId } from './boards/types'

export { BoardId }
export type { BoardConfiguration } from './boards/types'

export const BOARD_CONFIGURATIONS: BoardConfiguration[] = [
  CLASSIC_BOARD,
  BLUE_BOARD,
  GREEN_BOARD,
  RED_BOARD,
  ORANGE_BOARD,
  RANDOM_BOARD_TEMPLATE,
]

export const getBoardConfiguration = (id: BoardId): BoardConfiguration => {
  return BOARD_CONFIGURATIONS.find((config) => config.id === id) ?? CLASSIC_BOARD
}

export const getDefaultBoardId = (): BoardId => CLASSIC_BOARD.id
