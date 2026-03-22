import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { BoardId } from '@/data/boardConfigurations'

import { EncoreGameSetup } from './EncoreGameSetup'

describe('EncoreGameSetup', () => {
  it('renders setup fields and forwards user actions through callbacks', () => {
    const setPlayerName = vi.fn()
    const toggleAIPlayer = vi.fn()
    const setSelectedBoard = vi.fn()
    const onStart = vi.fn()

    const selectedBoards: BoardId[] = ['classic', 'blue']

    render(
      <EncoreGameSetup
        playerNames={['Alice', 'Bob']}
        aiPlayers={[false, true]}
        selectedBoards={selectedBoards}
        setPlayerName={setPlayerName}
        toggleAIPlayer={toggleAIPlayer}
        setSelectedBoard={setSelectedBoard}
        onStart={onStart}
      />,
    )

    const firstPlayerInput = screen.getByDisplayValue('Alice')
    fireEvent.change(firstPlayerInput, { target: { value: 'Alicia' } })
    expect(setPlayerName).toHaveBeenCalledWith(0, 'Alicia')

    const firstPlayerControls = firstPlayerInput.parentElement
    const firstPlayerAIModeButton = firstPlayerControls?.querySelector('button')
    if (!firstPlayerAIModeButton) {
      throw new Error('AI mode toggle button not found for player 1')
    }

    fireEvent.click(firstPlayerAIModeButton)
    expect(toggleAIPlayer).toHaveBeenCalledWith(0)

    fireEvent.click(screen.getByText('Commencer la partie'))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
