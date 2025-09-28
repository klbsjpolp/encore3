
import { GameState, DiceResult, GameColor, DiceNumber, Square } from '@/types/game';

// Finds all connected groups of uncrossed squares for a given color
const findConnectedComponents = (board: Square[][], color: GameColor): { row: number, col: number }[][] => {
    const components: { row: number, col: number }[][] = [];
    const visited = new Set<string>();

    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[0].length; c++) {
            if (board[r][c].color === color && !board[r][c].crossed && !visited.has(`${r},${c}`)) {
                const component: { row: number, col: number }[] = [];
                const queue = [{ row: r, col: c }];
                visited.add(`${r},${c}`);

                let head = 0;
                while (head < queue.length) {
                    const current = queue[head++];
                    component.push(current);

                    const neighbors = [
                        { row: current.row - 1, col: current.col },
                        { row: current.row + 1, col: current.col },
                        { row: current.row, col: current.col - 1 },
                        { row: current.row, col: current.col + 1 },
                    ];

                    for (const neighbor of neighbors) {
                        const key = `${neighbor.row},${neighbor.col}`;
                        if (
                            neighbor.row >= 0 && neighbor.row < board.length &&
                            neighbor.col >= 0 && neighbor.col < board[0].length &&
                            !visited.has(key) &&
                            board[neighbor.row][neighbor.col].color === color &&
                            !board[neighbor.row][neighbor.col].crossed
                        ) {
                            visited.add(key);
                            queue.push(neighbor);
                        }
                    }
                }
                components.push(component);
            }
        }
    }
    return components;
};

// Helper to count uncrossed squares for a color
const countUncrossedForColor = (board: Square[][], color: GameColor): number => {
    let count = 0;
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[0].length; c++) {
            if (board[r][c].color === color && !board[r][c].crossed) {
                count++;
            }
        }
    }
    return count;
};

// Helper to count uncrossed squares in a column
const countUncrossedInColumn = (board: Square[][], col: number): number => {
    let count = 0;
    for (let r = 0; r < board.length; r++) {
        if (!board[r][col].crossed) {
            count++;
        }
    }
    return count;
};

export const useAIPlayer = () => {
  const makeAIMove = (
    gameState: GameState,
    isValidMove: (squares: { row: number; col: number }[], color: GameColor, playerBoard: Square[][]) => boolean
  ): { color: DiceResult, number: DiceResult, squares: {row: number, col: number}[] } | null => {
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (!currentPlayer.isAI) {
      return null;
    }

    const availableColorDice = gameState.dice.filter(d => d.type === 'color' && !d.selected);
    const availableNumberDice = gameState.dice.filter(d => d.type === 'number' && !d.selected);

    const possibleMoves: {
        color: DiceResult;
        number: DiceResult;
        squares: { row: number; col: number }[];
        score: number;
    }[] = [];

    for (const colorDice of availableColorDice) {
      for (const numberDice of availableNumberDice) {
        if (numberDice.value === 'wild') continue; // AI doesn't use wild number dice for now.

        const number = numberDice.value as number;
        const colorsToConsider: GameColor[] = colorDice.value === 'wild' 
            ? ['red', 'yellow', 'green', 'blue'] 
            : [colorDice.value as GameColor];

        for (const color of colorsToConsider) {
          const components = findConnectedComponents(currentPlayer.board, color);

          for (const component of components) {
            if (component.length >= number) {
              const candidateSquares = component.slice(0, number);

              if (isValidMove(candidateSquares, color, currentPlayer.board)) {
                let score = 0;

                // 1. Mark as many cells as possible
                score += number;

                // 2. Complete a group of cells
                if (component.length === number) {
                  score += 50;
                }

                // 3. Finish a color
                const uncrossedInColor = countUncrossedForColor(currentPlayer.board, color);
                if (uncrossedInColor > 0 && uncrossedInColor <= number) {
                  score += 200;
                }

                // 4. Finish a column
                const columnsInMove = [...new Set(candidateSquares.map(s => s.col))];
                for (const col of columnsInMove) {
                    const uncrossedInCol = countUncrossedInColumn(currentPlayer.board, col);
                    const markingInCol = candidateSquares.filter(s => s.col === col).length;
                    if (uncrossedInCol > 0 && uncrossedInCol <= markingInCol) {
                        score += 100;
                    }
                }
                
                // Penalty for using a joker for a small gain
                if (colorDice.value === 'wild') {
                    score -= 5;
                }

                possibleMoves.push({
                  color: colorDice,
                  number: numberDice,
                  squares: candidateSquares,
                  score: score,
                });
              }
            }
          }
        }
      }
    }

    if (possibleMoves.length === 0) {
      return null; // No move found, pass
    }

    // Sort moves by score descending
    possibleMoves.sort((a, b) => b.score - a.score);

    const bestMove = possibleMoves[0];

    // The move object to return should not have the score
    const { score, ...moveResult } = bestMove;

    return moveResult;
  };

  return { makeAIMove };
};
