import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EncoreGame } from './EncoreGame';
import type { GameState, Player, Square } from '@/types/game';
import type { BoardConfiguration } from '@/data/boardConfigurations';

const mockUseEncoreGame = vi.fn();
const mockFindConnectedGroup = vi.fn();

vi.mock('@/hooks/useEncoreGame', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useEncoreGame')>();

  return {
    ...actual,
    useEncoreGame: () => mockUseEncoreGame(),
    findConnectedGroup: (row: number, col: number, color: Square['color'], board: Square[][]) =>
      mockFindConnectedGroup(row, col, color, board),
  };
});

const boardConfiguration: BoardConfiguration = {
  id: 'classic',
  fillClass: 'bg-slate-900',
  colorLayout: Array.from({ length: 7 }, () => Array.from({ length: 15 }, () => 'orange')),
  starPositions: new Set<string>(),
};

const createBoard = (): Square[][] =>
  Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: 15 }, (_, col) => ({
      color: 'orange',
      hasStar: false,
      crossed: false,
      column: String.fromCharCode(65 + col),
      row,
    }))
  );

const createPlayer = (id: string, name: string): Player => ({
  id,
  name,
  isAI: false,
  board: createBoard(),
  boardConfiguration,
  starsCollected: 0,
  completedColors: [],
  completedColorsFirst: [],
  completedColorsNotFirst: [],
  completedColumnsFirst: [],
  completedColumnsNotFirst: [],
  jokersRemaining: 8,
});

const createGameState = (): GameState => ({
  players: [createPlayer('p1', 'Player 1'), createPlayer('p2', 'Player 2')],
  currentPlayer: 0,
  activePlayer: 0,
  phase: 'active-selection',
  dice: [],
  selectedDice: {
    color: { id: 'color', type: 'color', value: 'orange', selected: true },
    number: { id: 'number', type: 'number', value: 2, selected: true },
  },
  selectedFromJoker: { color: false, number: false },
  gameStarted: true,
  winner: null,
  winners: [],
  pendingGameOver: false,
  claimedFirstColumnBonus: {},
  claimedFirstColorBonus: {},
  claimedSecondColorBonus: {},
});

const getMainBoardSquares = () =>
  screen
    .getAllByRole('button')
    .filter(btn => btn.className.includes('aspect-square') && btn.className.includes('cursor-pointer'));

const getSelectedSquareCount = () =>
  screen
    .getAllByRole('button')
    .filter(btn => btn.className.includes('aspect-square') && btn.className.includes('ring-ring') && btn.className.includes('cursor-pointer')).length;

const setupGame = () => {
  mockUseEncoreGame.mockReturnValue({
    gameState: createGameState(),
    initializeGame: vi.fn(),
    rollNewDice: vi.fn(),
    selectDice: vi.fn(),
    makeMove: vi.fn(),
    skipTurn: vi.fn(),
    isValidMove: vi.fn(() => true),
    completePlayerSwitch: vi.fn(),
  });

  mockFindConnectedGroup.mockImplementation((row: number) => [
    { row, col: 0 },
    { row, col: 1 },
    { row, col: 2 },
  ]);

  render(<EncoreGame />);
  fireEvent.click(screen.getByText('Commencer la partie'));
};

const hoverAndClick = (element: HTMLElement) => {
  fireEvent.mouseEnter(element);
  fireEvent.click(element);
};

const tap = (element: HTMLElement) => {
  fireEvent.click(element);
};

describe('EncoreGame manual selection regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mouse interactions with hover', () => {
    it('unselects the remaining selected cell in one click', () => {
      setupGame();

      const [first, second] = getMainBoardSquares();

      hoverAndClick(first);
      hoverAndClick(second);
      expect(getSelectedSquareCount()).toBe(2);

      hoverAndClick(first);
      expect(getSelectedSquareCount()).toBe(1);

      hoverAndClick(second);
      expect(getSelectedSquareCount()).toBe(0);
    });

    it('allows selecting another cell after unselecting back to zero', () => {
      setupGame();

      const [first, second, third] = getMainBoardSquares();

      hoverAndClick(first);
      hoverAndClick(second);
      expect(getSelectedSquareCount()).toBe(2);

      hoverAndClick(first);
      expect(getSelectedSquareCount()).toBe(1);

      hoverAndClick(second);
      expect(getSelectedSquareCount()).toBe(0);

      hoverAndClick(third);
      expect(getSelectedSquareCount()).toBe(1);
    });
  });

  describe('touch interactions without hover', () => {
    it('unselects the remaining selected cell in one tap', () => {
      setupGame();

      const [first, second] = getMainBoardSquares();

      tap(first);
      tap(second);
      expect(getSelectedSquareCount()).toBe(2);

      tap(first);
      expect(getSelectedSquareCount()).toBe(1);

      tap(second);
      expect(getSelectedSquareCount()).toBe(0);
    });

    it('allows selecting another cell after unselecting back to zero', () => {
      setupGame();

      const [first, second, third] = getMainBoardSquares();

      tap(first);
      tap(second);
      expect(getSelectedSquareCount()).toBe(2);

      tap(first);
      expect(getSelectedSquareCount()).toBe(1);

      tap(second);
      expect(getSelectedSquareCount()).toBe(0);

      tap(third);
      expect(getSelectedSquareCount()).toBe(1);
    });
  });
});
