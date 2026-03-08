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

const createGameState = (numberValue: 1 | 2 | 3 | 4 | 5 | 'wild' = 2): GameState => ({
  players: [createPlayer('p1', 'Player 1'), createPlayer('p2', 'Player 2')],
  currentPlayer: 0,
  activePlayer: 0,
  phase: 'active-selection',
  dice: [],
  selectedDice: {
    color: { id: 'color', type: 'color', value: 'orange', selected: true },
    number: { id: 'number', type: 'number', value: numberValue, selected: true },
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

const setupGame = (numberValue: 1 | 2 | 3 | 4 | 5 | 'wild' = 2) => {
  mockUseEncoreGame.mockReturnValue({
    gameState: createGameState(numberValue),
    initializeGame: vi.fn(),
    rollNewDice: vi.fn(),
    selectDice: vi.fn(),
    makeMove: vi.fn(),
    skipTurn: vi.fn(),
    isValidMove: vi.fn(() => true),
    completePlayerSwitch: vi.fn(),
  });

  render(<EncoreGame />);
  fireEvent.click(screen.getByText('Commencer la partie'));
};

const getMainBoardSquares = () =>
  screen
    .getAllByRole('button')
    .filter(btn => btn.className.includes('aspect-square') && btn.className.includes('cursor-pointer'));

const getSelectedSquares = () =>
  screen
    .getAllByRole('button')
    .filter(btn => btn.className.includes('aspect-square') && btn.className.includes('ring-ring') && btn.className.includes('cursor-pointer'));

describe('EncoreGame selection logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects a hovered group on the first click when it matches the number die', () => {
    mockFindConnectedGroup.mockImplementation((row: number, col: number) => [
      { row, col },
      { row, col: col + 1 },
    ]);

    setupGame(2);

    const [square] = getMainBoardSquares();
    fireEvent.mouseEnter(square);
    fireEvent.click(square);

    expect(getSelectedSquares()).toHaveLength(2);
  });

  it('deselects the same hovered group on the second click', () => {
    mockFindConnectedGroup.mockImplementation((row: number, col: number) => [
      { row, col },
      { row, col: col + 1 },
    ]);

    setupGame(2);

    const [square] = getMainBoardSquares();
    fireEvent.mouseEnter(square);
    fireEvent.click(square);
    expect(getSelectedSquares()).toHaveLength(2);

    fireEvent.mouseEnter(square);
    fireEvent.click(square);

    expect(getSelectedSquares()).toHaveLength(0);
  });

  it('falls back to manual cell selection when the connected group is larger than the die value', () => {
    mockFindConnectedGroup.mockImplementation((row: number, col: number) => [
      { row, col },
      { row, col: col + 1 },
      { row, col: col + 2 },
    ]);

    setupGame(2);

    const [square] = getMainBoardSquares();
    fireEvent.click(square);

    expect(getSelectedSquares()).toHaveLength(1);
  });
});
