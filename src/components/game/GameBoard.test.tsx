import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getBoardConfiguration } from '@/data/boardConfigurations';
import { Square } from '@/types/game';
import { GameBoard } from './GameBoard';

const createBoard = (): Square[][] =>
  Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: 15 }, (_, col) => ({
      color: 'blue',
      hasStar: false,
      crossed: false,
      column: String.fromCharCode(65 + col),
      row,
    }))
  );

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
      />
    );

    const boardSquares = screen.getAllByRole('button');
    const selectedStartingSquare = boardSquares[7];
    const adjacentSelectedSquare = boardSquares[8];

    expect(selectedStartingSquare).toHaveClass('ring-ring');
    expect(selectedStartingSquare).toHaveClass('border-white');
    expect(selectedStartingSquare).toHaveClass('outline-slate-900');
    expect(adjacentSelectedSquare).toHaveClass('ring-ring');
  });
});
