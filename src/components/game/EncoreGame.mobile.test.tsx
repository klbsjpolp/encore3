import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import type * as UseEncoreGameModule from '@/hooks/useEncoreGame'
import type { GameState, Player, Square } from '@/types/game'

import { EncoreGame } from './EncoreGame'

const mockUseEncoreGame = vi.fn()
const mockFindConnectedGroup = vi.fn()

vi.mock('@/hooks/useEncoreGame', async (importOriginal) => {
  const actual = await importOriginal<typeof UseEncoreGameModule>()

  return {
    ...actual,
    useEncoreGame: () => mockUseEncoreGame(),
    findConnectedGroup: (row: number, col: number, color: Square['color'], board: Square[][]) =>
      mockFindConnectedGroup(row, col, color, board),
  }
})

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => true,
}))

const boardConfiguration: BoardConfiguration = {
  id: 'classic',
  fillClass: 'bg-slate-900',
  colorLayout: Array.from({ length: 7 }, () => Array.from({ length: 15 }, () => 'orange')),
  starPositions: new Set<string>(),
}

const createBoard = (): Square[][] =>
  Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: 15 }, (_, col) => ({
      color: 'orange',
      hasStar: false,
      crossed: false,
      column: String.fromCharCode(65 + col),
      row,
    })),
  )

const createPlayer = (id: string, name: string): Player => ({
  id,
  name,
  isAI: false,
  board: createBoard(),
  boardConfiguration,
  starsCollected: 1,
  completedColors: [],
  completedColorsFirst: [],
  completedColorsNotFirst: [],
  completedColumnsFirst: ['A'],
  completedColumnsNotFirst: ['B'],
  jokersRemaining: 6,
})

const createGameState = (): GameState => ({
  players: [createPlayer('p1', 'Player 1'), createPlayer('p2', 'Player 2')],
  currentPlayer: 0,
  activePlayer: 0,
  phase: 'active-selection',
  dice: [
    { id: 'c1', type: 'color', value: 'orange', selected: false },
    { id: 'c2', type: 'color', value: 'red', selected: false },
    { id: 'c3', type: 'color', value: 'wild', selected: false },
    { id: 'n1', type: 'number', value: 1, selected: false },
    { id: 'n2', type: 'number', value: 2, selected: false },
    { id: 'n3', type: 'number', value: 'wild', selected: false },
  ],
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
})

let testContainer: HTMLElement

const setupGame = async (overrides?: Partial<ReturnType<typeof mockUseEncoreGame>>) => {
  window.resizeTo(390, 844)

  mockUseEncoreGame.mockReturnValue({
    gameState: createGameState(),
    initializeGame: vi.fn(),
    rollNewDice: vi.fn(),
    selectDice: vi.fn(),
    makeMove: vi.fn(),
    skipTurn: vi.fn(),
    isValidMove: vi.fn(() => true),
    completePlayerSwitch: vi.fn(),
    ...overrides,
  })

  mockFindConnectedGroup.mockImplementation((row: number, col: number) => [{ row, col }])

  const { container } = render(<EncoreGame />)
  testContainer = container
  fireEvent.click(screen.getByText('Commencer la partie'))

  await screen.findByTestId('compact-dice-row')
}

const getMainBoardSquares = () =>
  Array.from(testContainer.querySelectorAll<HTMLElement>('button.aspect-square.cursor-pointer'))

describe('EncoreGame mobile layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders compact mobile controls with panel toggles and sticky actions', async () => {
    await setupGame()

    expect(screen.getByRole('button', { name: 'Autre joueur' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scores' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^effacer$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /passer/i })).toBeInTheDocument()
  })

  it('switches between opponent board and compact score summaries on mobile', async () => {
    await setupGame()

    expect(screen.getByText(/Autre : Player 2/)).toBeInTheDocument()
    expect(screen.queryByText(/Colonnes \(total:/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Scores' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Scores' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getAllByText(/Colonnes \(total:/)).toHaveLength(2)
    })
  })

  it('keeps touch selection workflow visible from the sticky action bar', async () => {
    await setupGame()

    const [first, second] = getMainBoardSquares()
    const confirmButton = screen.getByRole('button', { name: /confirmer/i })

    fireEvent.click(first)
    await waitFor(() => {
      expect(confirmButton).toHaveTextContent('Confirmer (1)')
    })

    fireEvent.click(second)
    await waitFor(() => {
      expect(confirmButton).toHaveTextContent('Confirmer (2)')
    })

    fireEvent.click(second)
    await waitFor(() => {
      expect(confirmButton).toHaveTextContent('Confirmer (1)')
    })
  }, 10000)

  it('does not rely on desktop animation to show switching state on mobile', async () => {
    await setupGame({
      gameState: {
        ...createGameState(),
        phase: 'player-switching',
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Changement...')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Autre joueur' })).toBeInTheDocument()
  })
})
