import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import type * as UseEncoreGameModule from '@/hooks/useEncoreGame'
import type { DiceNumber, GameState, Player, Square } from '@/types/game'

import { EncoreGame } from './EncoreGame'

const mockUseEncoreGame = vi.fn()
const mockFindConnectedGroup = vi.fn()
const GAME_SETUP_STORAGE_KEY = 'encore:game-setup:v1'
let storageData: Record<string, string> = {}

vi.mock('@/hooks/useEncoreGame', async (importOriginal) => {
  const actual = await importOriginal<typeof UseEncoreGameModule>()

  return {
    ...actual,
    useEncoreGame: () => mockUseEncoreGame(),
    findConnectedGroup: (row: number, col: number, color: Square['color'], board: Square[][]) =>
      mockFindConnectedGroup(row, col, color, board),
  }
})

const boardConfiguration: BoardConfiguration = {
  id: 'classic',
  fillClass: 'bg-slate-900',
  colorLayout: Array.from({ length: 7 }, () => Array.from({ length: 15 }, () => 'orange')),
  starPositions: new Set<string>(),
}

const createBoard = (crossed = false): Square[][] =>
  Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: 15 }, (_, col) => ({
      color: 'orange',
      hasStar: false,
      crossed,
      column: String.fromCharCode(65 + col),
      row,
    })),
  )

const createPlayer = (id: string, name: string, board = createBoard()): Player => ({
  id,
  name,
  isAI: false,
  board,
  boardConfiguration,
  starsCollected: 0,
  completedColors: [],
  completedColorsFirst: [],
  completedColorsNotFirst: [],
  completedColumnsFirst: [],
  completedColumnsNotFirst: [],
  jokersRemaining: 8,
})

const createGameState = (
  numberValue: DiceNumber = 2,
  players: Player[] = [createPlayer('p1', 'Player 1'), createPlayer('p2', 'Player 2')],
): GameState => ({
  players,
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
})

const setupGame = (numberValue: DiceNumber = 2) => {
  mockUseEncoreGame.mockReturnValue({
    gameState: createGameState(numberValue),
    initializeGame: vi.fn(),
    rollNewDice: vi.fn(),
    selectDice: vi.fn(),
    makeMove: vi.fn(),
    skipTurn: vi.fn(),
    isValidMove: vi.fn(() => true),
    completePlayerSwitch: vi.fn(),
  })

  render(<EncoreGame />)
  fireEvent.click(screen.getByText('Commencer la partie'))
}

const getMainBoardSquares = () =>
  screen
    .getAllByRole('button')
    .filter(
      (btn) => btn.className.includes('aspect-square') && btn.className.includes('cursor-pointer'),
    )

const getSelectedSquares = () =>
  screen
    .getAllByRole('button')
    .filter(
      (btn) =>
        btn.className.includes('aspect-square') &&
        btn.className.includes('ring-ring') &&
        btn.className.includes('cursor-pointer'),
    )

describe('EncoreGame selection logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageData = {}
    mockFindConnectedGroup.mockImplementation(() => [])
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storageData[key] ?? null,
        setItem: (key: string, value: string) => {
          storageData[key] = value
        },
        removeItem: (key: string) => {
          storageData = Object.fromEntries(
            Object.entries(storageData).filter(([existingKey]) => existingKey !== key),
          )
        },
      },
    })
  })

  it('restores saved setup values before starting the game', () => {
    const initializeGame = vi.fn()
    window.localStorage.setItem(
      GAME_SETUP_STORAGE_KEY,
      JSON.stringify({
        playerNames: ['Alice', 'Bob'],
        aiPlayers: [true, false],
        selectedBoards: ['blue', 'green'],
      }),
    )

    mockUseEncoreGame.mockReturnValue({
      gameState: createGameState(),
      initializeGame,
      rollNewDice: vi.fn(),
      selectDice: vi.fn(),
      makeMove: vi.fn(),
      skipTurn: vi.fn(),
      isValidMove: vi.fn(() => true),
      completePlayerSwitch: vi.fn(),
    })

    render(<EncoreGame />)

    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Commencer la partie'))

    expect(initializeGame).toHaveBeenCalledWith(['Alice', 'Bob'], [true, false], ['blue', 'green'])
  })

  it('persists setup changes in localStorage', async () => {
    mockUseEncoreGame.mockReturnValue({
      gameState: createGameState(),
      initializeGame: vi.fn(),
      rollNewDice: vi.fn(),
      selectDice: vi.fn(),
      makeMove: vi.fn(),
      skipTurn: vi.fn(),
      isValidMove: vi.fn(() => true),
      completePlayerSwitch: vi.fn(),
    })

    render(<EncoreGame />)

    const firstPlayerNameInput = screen.getByDisplayValue('Joueur 1')
    fireEvent.change(firstPlayerNameInput, {
      target: { value: 'Alice' },
    })

    const firstPlayerControls = firstPlayerNameInput.parentElement
    const firstPlayerAIModeButton = firstPlayerControls?.querySelector('button')
    if (!firstPlayerAIModeButton) {
      throw new Error('AI mode toggle button not found for player 1')
    }
    fireEvent.click(firstPlayerAIModeButton)

    await waitFor(() => {
      const stored = window.localStorage.getItem(GAME_SETUP_STORAGE_KEY)
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored as string) as {
        playerNames: [string, string]
        aiPlayers: [boolean, boolean]
        selectedBoards: [string, string]
      }

      expect(parsed.playerNames).toEqual(['Alice', 'Joueur 2'])
      expect(parsed.aiPlayers).toEqual([true, true])
      expect(parsed.selectedBoards).toHaveLength(2)
    })
  })

  it('selects a hovered group on the first click when it matches the number die', () => {
    mockFindConnectedGroup.mockImplementation((row: number, col: number) => [
      { row, col },
      { row, col: col + 1 },
    ])

    setupGame(2)

    const [square] = getMainBoardSquares()
    fireEvent.mouseEnter(square)
    fireEvent.click(square)

    expect(getSelectedSquares()).toHaveLength(2)
  })

  it('selects the matching group on the first tap without hover', () => {
    mockFindConnectedGroup.mockImplementation((row: number, col: number) => [
      { row, col },
      { row, col: col + 1 },
    ])

    setupGame(2)

    const [square] = getMainBoardSquares()
    fireEvent.click(square)

    expect(getSelectedSquares()).toHaveLength(2)
  })

  it('selects the clicked matching group even when hover points to another group', () => {
    mockFindConnectedGroup.mockImplementation((row: number, col: number) => [
      { row, col },
      { row, col: col + 1 },
    ])

    setupGame(2)

    const [first, , third] = getMainBoardSquares()
    fireEvent.mouseEnter(first)
    fireEvent.click(third)

    expect(getSelectedSquares()).toHaveLength(2)
  })

  it('deselects the same hovered group on the second click', () => {
    mockFindConnectedGroup.mockImplementation((row: number, col: number) => [
      { row, col },
      { row, col: col + 1 },
    ])

    setupGame(2)

    const [square] = getMainBoardSquares()
    fireEvent.mouseEnter(square)
    fireEvent.click(square)
    expect(getSelectedSquares()).toHaveLength(2)

    fireEvent.mouseEnter(square)
    fireEvent.click(square)

    expect(getSelectedSquares()).toHaveLength(0)
  })

  it('falls back to manual cell selection when the connected group is larger than the die value', () => {
    mockFindConnectedGroup.mockImplementation((row: number, col: number) => [
      { row, col },
      { row, col: col + 1 },
      { row, col: col + 2 },
    ])

    setupGame(2)

    const [square] = getMainBoardSquares()
    fireEvent.click(square)

    expect(getSelectedSquares()).toHaveLength(1)
  })

  it('highlights confirm when the current placement is valid', () => {
    mockFindConnectedGroup.mockImplementation((row: number, col: number) => [{ row, col }])

    setupGame(1)

    const [square] = getMainBoardSquares()
    fireEvent.click(square)

    expect(screen.getByRole('button', { name: /confirmer le placement/i }).className).toContain(
      'before:ring-yellow-400',
    )
  })

  it('highlights skip turn when no move is possible', () => {
    mockFindConnectedGroup.mockImplementation(() => [])

    mockUseEncoreGame.mockReturnValue({
      gameState: createGameState(1, [
        createPlayer('p1', 'Player 1', createBoard(true)),
        createPlayer('p2', 'Player 2'),
      ]),
      initializeGame: vi.fn(),
      rollNewDice: vi.fn(),
      selectDice: vi.fn(),
      makeMove: vi.fn(),
      skipTurn: vi.fn(),
      isValidMove: vi.fn(() => false),
      completePlayerSwitch: vi.fn(),
    })

    render(<EncoreGame />)
    fireEvent.click(screen.getByText('Commencer la partie'))

    expect(screen.getByRole('button', { name: /passer le tour/i }).className).toContain(
      'before:ring-yellow-400',
    )
  })

  it('highlights skip turn when no die is selected and no dice combination is playable', () => {
    mockFindConnectedGroup.mockImplementation(() => [])

    const gameState = createGameState(1, [
      createPlayer('p1', 'Player 1', createBoard(true)),
      createPlayer('p2', 'Player 2'),
    ])
    gameState.selectedDice = { color: null, number: null }
    gameState.dice = [
      { id: 'c1', type: 'color', value: 'orange', selected: false },
      { id: 'n1', type: 'number', value: 1, selected: false },
    ]

    mockUseEncoreGame.mockReturnValue({
      gameState,
      initializeGame: vi.fn(),
      rollNewDice: vi.fn(),
      selectDice: vi.fn(),
      makeMove: vi.fn(),
      skipTurn: vi.fn(),
      isValidMove: vi.fn(() => false),
      completePlayerSwitch: vi.fn(),
    })

    render(<EncoreGame />)
    fireEvent.click(screen.getByText('Commencer la partie'))

    expect(screen.getByRole('button', { name: /passer le tour/i }).className).toContain(
      'before:ring-yellow-400',
    )
  })
})
