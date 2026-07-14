import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getBoardConfiguration } from '@/data/boardConfigurations'
import type { Square } from '@/types/game'

import { GameBoard } from './GameBoard'

const createBoard = (): Square[][] =>
  Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: 15 }, (_, col) => ({
      color: 'blue',
      hasStar: false,
      crossed: false,
      column: String.fromCharCode(65 + col),
      row,
    })),
  )

describe('GameBoard compact selection', () => {
  it('emphasizes selected cells in the starting column on mobile', () => {
    render(
      <GameBoard
        board={createBoard()}
        boardConfiguration={getBoardConfiguration('classic')}
        selectedSquares={[
          { row: 0, col: 7 },
          { row: 0, col: 8 },
        ]}
        compact={true}
        firstBonusClaimed={[]}
        iClaimedFirstBonus={[]}
        iClaimedSecondBonus={[]}
      />,
    )

    const boardSquares = screen.getAllByRole('button')
    const selectedStartingSquare = boardSquares[7]
    const adjacentSelectedSquare = boardSquares[8]

    expect(selectedStartingSquare).toHaveClass('ring-ring')
    expect(selectedStartingSquare).toHaveClass('border-white')
    expect(selectedStartingSquare).toHaveClass('outline-slate-900')
    expect(adjacentSelectedSquare).toHaveClass('ring-ring')
  })
})

describe('GameBoard accessibility', () => {
  it('labels squares with their position, color and state', () => {
    const board = createBoard()
    board[0][0].hasStar = true
    board[1][2].crossed = true

    render(
      <GameBoard
        board={board}
        boardConfiguration={getBoardConfiguration('classic')}
        firstBonusClaimed={[]}
        iClaimedFirstBonus={[]}
        iClaimedSecondBonus={[]}
      />,
    )

    expect(screen.getByRole('button', { name: 'Case A1, bleue, étoile' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Case C2, bleue, cochée' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Case B1, bleue' })).toBeInTheDocument()
  })
})
