import { describe, it, expect } from 'vitest';
import {
  calculateColumnScore,
  calculateFinalScore,
  findConnectedGroup,
  TOTAL_STARS,
} from './useEncoreGame';
import type { Player, Square, GameColor } from '@/types/game';
import type { BoardConfiguration } from '@/data/boardConfigurations';

// Helpers
const makeBoard = (colors: GameColor[][], crossed: boolean[][] = []): Square[][] => {
  const rows = colors.length;
  const cols = colors[0]?.length ?? 0;
  const crossMap = crossed.length ? crossed : Array.from({ length: rows }, () => Array(cols).fill(false));
  const board: Square[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Square[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        color: colors[r][c],
        hasStar: false,
        crossed: crossMap[r][c] ?? false,
        column: String.fromCharCode(65 + c),
        row: r,
      });
    }
    board.push(row);
  }
  return board;
};

const mockBoardConfig = (colors: GameColor[][]): BoardConfiguration => ({
  id: 'classic',
  fillClass: 'mock',
  colorLayout: colors,
  starPositions: new Set<string>(),
});

const makePlayer = (overrides: Partial<Player> = {}): Player => {
  const colors: GameColor[][] = [
    ['red', 'red', 'blue'],
    ['green', 'yellow', 'orange'],
  ];
  const player: Player = {
    id: 'p1',
    name: 'Tester',
    isAI: false,
    board: makeBoard(colors),
    boardConfiguration: mockBoardConfig(colors),
    starsCollected: 0,
    completedColors: [],
    completedColorsFirst: [],
    completedColorsNotFirst: [],
    completedColumnsFirst: [],
    completedColumnsNotFirst: [],
    jokersRemaining: 0,
  };
  return { ...player, ...overrides };
};

describe('calculateColumnScore', () => {
  it('returns 0 when no columns completed', () => {
    const player = makePlayer();
    expect(calculateColumnScore(player)).toBe(0);
  });

  it('sums first and not-first column points correctly', () => {
    // A (index 0) and O (index 14) first, B (index 1) and I (index 8) not-first
    const player = makePlayer({
      completedColumnsFirst: ['A', 'O'],
      completedColumnsNotFirst: ['B', 'I'],
    });
    // From constants: [5,3,3,3,2,2,2,1,2,2,2,3,3,3,5] and [3,2,2,2,1,1,1,0,1,1,1,2,2,2,3]
    const expected = 5 + 5 /* A + O first */ + 2 + 1 /* B + I not-first */;
    expect(calculateColumnScore(player)).toBe(expected);
  });

  it('prefers first-player points when a column is in both lists', () => {
    const player = makePlayer({
      completedColumnsFirst: ['C'],
      completedColumnsNotFirst: ['C'],
    });
    // C index 2: first=3, not-first=2 -> should take 3
    expect(calculateColumnScore(player)).toBe(3);
  });
});

describe('calculateFinalScore', () => {
  it('computes all components and total correctly', () => {
    const player = makePlayer({
      jokersRemaining: 3,
      starsCollected: 10,
      completedColorsFirst: ['red', 'blue'], // 2 * 5 = 10
      completedColorsNotFirst: ['green'],    // 1 * 3 = 3
      completedColumnsFirst: ['A'],          // 5
      completedColumnsNotFirst: ['B', 'I'],  // 2 + 1 = 3
    });
    const columnsScore = 5 + 2 + 1; // 8
    const jokersScore = 3;
    const colorsScore = 10 + 3; // 13
    const starPenalty = TOTAL_STARS - 10; // 15 - 10 = 5
    const totalScore = columnsScore + jokersScore + colorsScore - starPenalty; // 8 + 3 + 13 - 5 = 19

    expect(calculateFinalScore(player)).toEqual({
      columnsScore,
      jokersScore,
      colorsScore,
      starPenalty,
      totalScore,
    });
  });
});

describe('findConnectedGroup', () => {
  it('returns empty when starting outside bounds or on mismatched color or crossed cell', () => {
    const colors: GameColor[][] = [
      ['red', 'red', 'blue'],
      ['red', 'blue', 'blue'],
      ['green', 'green', 'blue'],
    ];
    const crossed: boolean[][] = [
      [false, true, false],
      [false, false, false],
      [false, false, false],
    ];
    const board = makeBoard(colors, crossed);

    // Outside bounds
    expect(findConnectedGroup(-1, 0, 'red', board)).toEqual([]);
    expect(findConnectedGroup(0, 3, 'red', board)).toEqual([]);

    // Mismatched color
    expect(findConnectedGroup(0, 2, 'red', board)).toEqual([]);

    // Crossed cell
    expect(findConnectedGroup(0, 1, 'red', board)).toEqual([]);
  });

  it('finds orthogonally connected uncrossed cells of the same color', () => {
    // Red component: (0,0) connected with (1,0); (0,1) is crossed so not included; diagonal not connected
    const colors: GameColor[][] = [
      ['red', 'red', 'blue'],
      ['red', 'blue', 'blue'],
      ['green', 'green', 'blue'],
    ];
    const crossed: boolean[][] = [
      [false, true, false],
      [false, false, false],
      [false, false, false],
    ];
    const board = makeBoard(colors, crossed);

    const group = findConnectedGroup(0, 0, 'red', board).sort((a, b) => a.row - b.row || a.col - b.col);
    expect(group).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);

    const blueGroup = findConnectedGroup(1, 2, 'blue', board).sort((a, b) => a.row - b.row || a.col - b.col);
    expect(blueGroup).toEqual([
      { row: 0, col: 2 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 2 },
    ].sort((a, b) => a.row - b.row || a.col - b.col));
  });
});
