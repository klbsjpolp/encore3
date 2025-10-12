import { BoardConfiguration } from './boardConfigurations';
import { GameColor } from '@/types/game';

/**
 * Validates that a board configuration follows all strict constraints
 */
export function validateBoard(board: BoardConfiguration): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check dimensions
  if (board.colorLayout.length !== 7) {
    errors.push(`Board must have 7 rows, found ${board.colorLayout.length}`);
  }

  for (let i = 0; i < board.colorLayout.length; i++) {
    if (board.colorLayout[i].length !== 15) {
      errors.push(`Row ${i} must have 15 columns, found ${board.colorLayout[i].length}`);
    }
  }

  // Count colors
  const colorCounts: Record<GameColor, number> = {
    yellow: 0,
    green: 0,
    blue: 0,
    red: 0,
    orange: 0
  };

  for (const row of board.colorLayout) {
    for (const cell of row) {
      if (cell in colorCounts) {
        colorCounts[cell]++;
      } else {
        errors.push(`Invalid color found: ${cell}`);
      }
    }
  }

  // Check each color has exactly 21 cells
  for (const [color, count] of Object.entries(colorCounts)) {
    if (count !== 21) {
      errors.push(`Color ${color} must have exactly 21 cells, found ${count}`);
    }
  }

  // Check group sizes for each color
  for (const color of Object.keys(colorCounts) as GameColor[]) {
    const groups = findColorGroups(board.colorLayout, color);
    const sizes = groups.sort((a, b) => a - b);
    const expectedSizes = [1, 2, 3, 4, 5, 6];

    if (JSON.stringify(sizes) !== JSON.stringify(expectedSizes)) {
      errors.push(`Color ${color} must have groups of sizes [1,2,3,4,5,6], found [${sizes.join(',')}]`);
    }
  }

  // Check stars
  if (board.starPositions.size !== 15) {
    errors.push(`Board must have exactly 15 stars, found ${board.starPositions.size}`);
  }

  // Check one star per column
  const starColumns = new Set<number>();
  const starsByColor: Record<GameColor, number> = {
    yellow: 0,
    green: 0,
    blue: 0,
    red: 0,
    orange: 0
  };

  for (const pos of board.starPositions) {
    const [row, col] = pos.split(',').map(Number);

    if (row < 0 || row >= 7 || col < 0 || col >= 15) {
      errors.push(`Invalid star position: ${pos}`);
      continue;
    }

    starColumns.add(col);
    const color = board.colorLayout[row][col];
    if (color in starsByColor) {
      starsByColor[color]++;
    }
  }

  if (starColumns.size !== 15) {
    errors.push(`Each column must have exactly one star, found stars in ${starColumns.size} columns`);
  }

  // Check 3 stars per color
  for (const [color, count] of Object.entries(starsByColor)) {
    if (count !== 3) {
      errors.push(`Color ${color} must have exactly 3 stars, found ${count}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Finds all groups of a specific color using flood fill
 */
function findColorGroups(board: GameColor[][], targetColor: GameColor): number[] {
  const visited = Array(7).fill(null).map(() => Array(15).fill(false));
  const groups: number[] = [];

  function floodFill(row: number, col: number): number {
    if (row < 0 || row >= 7 || col < 0 || col >= 15) return 0;
    if (visited[row][col] || board[row][col] !== targetColor) return 0;

    visited[row][col] = true;
    let count = 1;

    count += floodFill(row - 1, col);
    count += floodFill(row + 1, col);
    count += floodFill(row, col - 1);
    count += floodFill(row, col + 1);

    return count;
  }

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 15; col++) {
      if (!visited[row][col] && board[row][col] === targetColor) {
        const size = floodFill(row, col);
        if (size > 0) {
          groups.push(size);
        }
      }
    }
  }

  return groups;
}
