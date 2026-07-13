import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import type { GameColor, Player, Square } from '@/types/game'

import { ScorePanel } from './ScorePanel'

const makeBoard = (colors: GameColor[][]): Square[][] =>
  colors.map((row, rowIndex) =>
    row.map((color, colIndex) => ({
      color,
      hasStar: false,
      crossed: false,
      column: String.fromCharCode(65 + colIndex),
      row: rowIndex,
    })),
  )

const mockBoardConfig = (colors: GameColor[][]): BoardConfiguration => ({
  id: 'classic',
  fillClass: 'mock',
  colorLayout: colors,
  starPositions: new Set<string>(),
})

const makePlayer = (overrides: Partial<Player> = {}): Player => {
  const colors: GameColor[][] = [['red']]

  return {
    id: 'p1',
    name: 'Alice',
    isAI: false,
    board: makeBoard(colors),
    boardConfiguration: mockBoardConfig(colors),
    starsCollected: 0,
    completedColors: [],
    completedColorsFirst: [],
    completedColorsNotFirst: [],
    completedColumnsFirst: [],
    completedColumnsNotFirst: [],
    jokersRemaining: 8,
    ...overrides,
  }
}

describe('ScorePanel', () => {
  it('shows the current player badge and column breakdown during the game', () => {
    const player = makePlayer({
      completedColumnsFirst: ['A'],
      completedColumnsNotFirst: ['B'],
    })

    render(<ScorePanel player={player} isCurrentPlayer />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Actuel')).not.toHaveClass('invisible')
    // A first (5 points), B second (2 points), other columns not completed.
    expect(screen.getByText('A: 5')).toBeInTheDocument()
    expect(screen.getByText('B: 2')).toBeInTheDocument()
    expect(screen.getByText('C: -')).toBeInTheDocument()
    expect(screen.getByText(/Colonnes \(total: 7 points\)/)).toBeInTheDocument()
    // No final score while the game is running.
    expect(screen.queryByText('Total :')).not.toBeInTheDocument()
  })

  it('shows completed color points based on finishing order', () => {
    const player = makePlayer({
      completedColors: ['red', 'blue'],
      completedColorsFirst: ['red'],
      completedColorsNotFirst: ['blue'],
    })

    render(<ScorePanel player={player} />)

    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
  })

  it('shows the final score breakdown and the winner trophy at game over', () => {
    const winner = makePlayer({
      id: 'p1',
      name: 'Alice',
      starsCollected: 15,
      jokersRemaining: 4,
      completedColumnsFirst: ['A'],
    })
    const loser = makePlayer({ id: 'p2', name: 'Bob', starsCollected: 0, jokersRemaining: 0 })

    const { container } = render(
      <ScorePanel player={winner} gameComplete allPlayers={[winner, loser]} />,
    )

    expect(screen.getByText('Total :')).toBeInTheDocument()
    // columns 5 + colors 0 - penalty 0 + jokers 4 = 9
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(container.querySelector('.lucide-trophy')).not.toBeNull()
    // The current-player badge is hidden once the game is over.
    expect(screen.getByText('Actuel')).toHaveClass('invisible')
  })

  it('does not show a trophy for a losing player', () => {
    const winner = makePlayer({ id: 'p1', starsCollected: 15 })
    const loser = makePlayer({ id: 'p2', name: 'Bob', starsCollected: 0 })

    const { container } = render(
      <ScorePanel player={loser} gameComplete allPlayers={[winner, loser]} />,
    )

    expect(container.querySelector('.lucide-trophy')).toBeNull()
  })

  it('shows empty states in the compact variant', () => {
    render(<ScorePanel player={makePlayer()} compact />)

    expect(screen.getByText('Aucune colonne complétée')).toBeInTheDocument()
    expect(screen.getByText('Aucune couleur complétée')).toBeInTheDocument()
    expect(screen.getByText('8/8')).toBeInTheDocument()
  })

  it('shows completions, the badge and the total in the compact variant', () => {
    const player = makePlayer({
      starsCollected: 10,
      jokersRemaining: 2,
      completedColumnsFirst: ['A'],
      completedColors: ['red'],
      completedColorsFirst: ['red'],
    })

    render(<ScorePanel player={player} isCurrentPlayer compact />)

    expect(screen.getByText('Actuel')).toBeInTheDocument()
    expect(screen.getByText('A: 5')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('10/15')).toBeInTheDocument()
    expect(screen.getByText('2/8')).toBeInTheDocument()
    expect(screen.queryByText('Total :')).not.toBeInTheDocument()
  })

  it('shows the winner trophy and the total in the compact variant at game over', () => {
    const winner = makePlayer({ starsCollected: 15, jokersRemaining: 3 })

    const { container } = render(
      <ScorePanel player={winner} gameComplete allPlayers={[winner]} compact />,
    )

    expect(container.querySelector('.lucide-trophy')).not.toBeNull()
    expect(screen.getByText('Total :')).toBeInTheDocument()
    // columns 0 + colors 0 - penalty 0 + jokers 3 = 3
    expect(screen.getByText('=')).toBeInTheDocument()
  })
})
