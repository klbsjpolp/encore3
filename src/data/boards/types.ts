import type { GameColor } from '@/types/game'

export const BoardId = ['classic', 'blue', 'green', 'red', 'orange', 'random'] as const
export type BoardId = (typeof BoardId)[number]

export interface BoardConfiguration {
  id: BoardId
  fillClass: string
  colorLayout: GameColor[][]
  starPositions: Set<string>
}
