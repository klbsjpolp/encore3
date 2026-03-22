import type { GameColor, Player } from '@/types/game'

export const COLUMN_FIRST_PLAYER_POINTS = [5, 3, 3, 3, 2, 2, 2, 1, 2, 2, 2, 3, 3, 3, 5]
export const COLUMN_SECOND_PLAYER_POINTS = [3, 2, 2, 2, 1, 1, 1, 0, 1, 1, 1, 2, 2, 2, 3]
export const FIRST_COLOR_COMPLETION_POINTS = 5
export const SECOND_COLOR_COMPLETION_POINTS = 3
export const BOARD_COLUMNS = Array.from('ABCDEFGHIJKLMNO')

export const TOTAL_STARS = 15
export const MAX_JOKERS = 8

export const getColumnScoreBreakdown = (
  player: Player,
): { column: string; points: number | null; isFirst: boolean }[] => {
  return BOARD_COLUMNS.map((column, index) => {
    const firstPoints = player.completedColumnsFirst.includes(column)
      ? COLUMN_FIRST_PLAYER_POINTS[index]
      : null
    const secondPoints =
      firstPoints == null && player.completedColumnsNotFirst.includes(column)
        ? COLUMN_SECOND_PLAYER_POINTS[index]
        : null
    return {
      column,
      points: firstPoints ?? secondPoints,
      isFirst: firstPoints != null,
    }
  })
}

export const calculateColumnScore = (player: Player): number =>
  getColumnScoreBreakdown(player).reduce((sum, { points }) => sum + (points ?? 0), 0)

export const getColorCompletionPoints = (player: Player, color: GameColor): number => {
  if (player.completedColorsFirst.includes(color)) {
    return FIRST_COLOR_COMPLETION_POINTS
  }
  if (player.completedColorsNotFirst.includes(color)) {
    return SECOND_COLOR_COMPLETION_POINTS
  }
  return 0
}

export const calculateColorsScore = (player: Player): number =>
  player.completedColorsFirst.length * FIRST_COLOR_COMPLETION_POINTS +
  player.completedColorsNotFirst.length * SECOND_COLOR_COMPLETION_POINTS

export const calculateStarPenalty = (player: Player): number => {
  return (TOTAL_STARS - player.starsCollected) * 2
}

export const calculateFinalScore = (
  player: Player,
): {
  columnsScore: number
  jokersScore: number
  colorsScore: number
  starPenalty: number
  totalScore: number
} => {
  const columnsScore = calculateColumnScore(player)
  const jokersScore = player.jokersRemaining
  const colorsScore = calculateColorsScore(player)
  const starPenalty = calculateStarPenalty(player)
  const totalScore = columnsScore + jokersScore + colorsScore - starPenalty

  return { columnsScore, jokersScore, colorsScore, starPenalty, totalScore }
}

export const determineWinners = (players: Player[]): Player[] => {
  if (players.length === 0) {
    return []
  }

  const maxScore = Math.max(...players.map((player) => calculateFinalScore(player).totalScore))
  const topPlayers = players.filter((player) => calculateFinalScore(player).totalScore === maxScore)

  if (topPlayers.length <= 1) {
    return topPlayers
  }

  const maxJokers = Math.max(...topPlayers.map((player) => player.jokersRemaining))
  return topPlayers.filter((player) => player.jokersRemaining === maxJokers)
}
