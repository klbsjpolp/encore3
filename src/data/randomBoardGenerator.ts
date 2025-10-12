import { GameColor } from '@/types/game';
import { BoardConfiguration, BOARD_CONFIGURATIONS } from './boardConfigurations';

/**
 * Generates a random board by transforming one of the official boards.
 * This guarantees all constraints are met while providing variety through:
 * - Random rotation (0°, 90°, 180°, 270°)
 * - Random mirroring (horizontal and/or vertical)
 * - Random color mapping
 */
export function generateRandomBoard(): BoardConfiguration {
  // Pick a random official board as template
  const template = BOARD_CONFIGURATIONS[Math.floor(Math.random() * BOARD_CONFIGURATIONS.length)];

  // Create a transformed copy
  let board = template.colorLayout.map(row => [...row]);
  let stars = Array.from(template.starPositions);

  // Apply random transformations (only mirroring, rotation changes dimensions)
  const mirrorH = Math.random() < 0.5;
  const mirrorV = Math.random() < 0.5;

  // Mirror horizontally
  if (mirrorH) {
    const result = mirrorHorizontal(board, stars);
    board = result.board;
    stars = result.stars;
  }

  // Mirror vertically
  if (mirrorV) {
    const result = mirrorVertical(board, stars);
    board = result.board;
    stars = result.stars;
  }

  // Rotate 180 degrees (maintains aspect ratio)
  if (Math.random() < 0.5) {
    const result = rotate180(board, stars);
    board = result.board;
    stars = result.stars;
  }

  // Randomly remap colors
  board = remapColors(board);

  return {
    id: 'random',
    fillClass: 'bg-gradient-to-br from-purple-600 to-indigo-600',
    colorLayout: board,
    starPositions: new Set(stars)
  };
}

/**
 * Rotate board 180 degrees (maintains aspect ratio)
 */
function rotate180(
  board: GameColor[][],
  stars: string[]
): { board: GameColor[][], stars: string[] } {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = board.map(row => [...row].reverse()).reverse();

  const newStars = stars.map(pos => {
    const [r, c] = pos.split(',').map(Number);
    return `${rows - 1 - r},${cols - 1 - c}`;
  });

  return { board: newBoard, stars: newStars };
}

/**
 * Mirror board horizontally
 */
function mirrorHorizontal(
  board: GameColor[][],
  stars: string[]
): { board: GameColor[][], stars: string[] } {
  const newBoard = board.map(row => [...row].reverse());

  const cols = board[0].length;
  const newStars = stars.map(pos => {
    const [r, c] = pos.split(',').map(Number);
    return `${r},${cols - 1 - c}`;
  });

  return { board: newBoard, stars: newStars };
}

/**
 * Mirror board vertically
 */
function mirrorVertical(
  board: GameColor[][],
  stars: string[]
): { board: GameColor[][], stars: string[] } {
  const newBoard = [...board].reverse();

  const rows = board.length;
  const newStars = stars.map(pos => {
    const [r, c] = pos.split(',').map(Number);
    return `${rows - 1 - r},${c}`;
  });

  return { board: newBoard, stars: newStars };
}

/**
 * Randomly remap colors
 */
function remapColors(board: GameColor[][]): GameColor[][] {
  const colors: GameColor[] = ['yellow', 'green', 'blue', 'red', 'orange'];
  const shuffled = [...colors];
  shuffleArray(shuffled);

  const colorMap: Record<GameColor, GameColor> = {
    yellow: shuffled[0],
    green: shuffled[1],
    blue: shuffled[2],
    red: shuffled[3],
    orange: shuffled[4]
  };

  return board.map(row => row.map(cell => colorMap[cell]));
}

function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
