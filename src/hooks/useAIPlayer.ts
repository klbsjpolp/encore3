
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

    // Very simple AI: find the first valid move
    for (const colorDice of availableColorDice) {
      if (colorDice.value === 'wild') continue; // Simple AI doesn't use wildcards for now

      for (const numberDice of availableNumberDice) {
        if (numberDice.value === 'wild') continue;

        const color = colorDice.value as GameColor;
        const number = numberDice.value as number;

        const components = findConnectedComponents(currentPlayer.board, color);

        for (const component of components) {
            if (component.length >= number) {
                // This is a simple heuristic: just take the first 'number' squares of a component.
                // A better AI would check all combinations, but this is a good start.
                const candidateSquares = component.slice(0, number);

                if (isValidMove(candidateSquares, color, currentPlayer.board)) {
                    return {
                        color: colorDice,
                        number: numberDice,
                        squares: candidateSquares,
                    };
                }
            }
        }
      }
    }

    return null; // No move found
  };

  return { makeAIMove };
};
