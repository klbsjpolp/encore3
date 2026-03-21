import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DicePanel } from './DicePanel';
import { ColorDiceResult, DiceResult } from '@/types/game';

const mockDice: DiceResult[] = [
  { id: 'c1', type: 'color', value: 'red', selected: false },
  { id: 'c2', type: 'color', value: 'blue', selected: false },
  { id: 'c3', type: 'color', value: 'green', selected: false },
  { id: 'n1', type: 'number', value: 1, selected: false },
  { id: 'n2', type: 'number', value: 2, selected: false },
  { id: 'n3', type: 'number', value: 3, selected: false },
];

const mockSelectedColorDie: ColorDiceResult = { id: 'c1', type: 'color', value: 'red', selected: false };

afterEach(() => {
  vi.useRealTimers();
});

describe('DicePanel Component', () => {
  it('renders the dice panel with roll button', () => {
    render(
      <DicePanel
        dice={mockDice}
        phase="rolling"
        canRoll={true}
      />
    );

    expect(screen.getByText('Dés')).toBeInTheDocument();
    expect(screen.getByText('Lancer les dés')).toBeInTheDocument();
    expect(screen.getByText('Lancer les dés')).not.toBeDisabled();
  });

  it('calls onRollDice when roll button is clicked', () => {
    const onRollDice = vi.fn();
    render(
      <DicePanel
        dice={mockDice}
        phase="rolling"
        canRoll={true}
        onRollDice={onRollDice}
      />
    );

    const rollButton = screen.getByText('Lancer les dés');
    fireEvent.click(rollButton);
    expect(onRollDice).toHaveBeenCalled();
  });

  it('disables roll button when canRoll is false', () => {
    render(
      <DicePanel
        dice={mockDice}
        phase="active-selection"
        canRoll={false}
      />
    );

    expect(screen.getByRole('button', { name: /lancer/i })).toBeDisabled();
  });

  it('calls onDiceSelect when a die is clicked', () => {
    const onDiceSelect = vi.fn();
    render(
      <DicePanel
        dice={mockDice}
        phase="active-selection"
        canSelect={true}
        onDiceSelect={onDiceSelect}
      />
    );

    fireEvent.click(screen.getByText('R'));
    expect(onDiceSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', value: 'red' }));
  });

  it('disables selection when canSelect is false', () => {
    const onDiceSelect = vi.fn();
    render(
      <DicePanel
        dice={mockDice}
        phase="rolling"
        canSelect={false}
        onDiceSelect={onDiceSelect}
      />
    );

    const redDie = screen.getByText('R').closest('button');
    expect(redDie).toBeDisabled();
    if (redDie) fireEvent.click(redDie);
    expect(onDiceSelect).not.toHaveBeenCalled();
  });

  it('shows selected state for dice', () => {
    render(
      <DicePanel
        dice={mockDice}
        phase="active-selection"
        canSelect={true}
        selectedColorDice={mockSelectedColorDie}
      />
    );

    const redDie = screen.getByText('R').closest('button');
    expect(redDie).toHaveClass('ring-4');
  });

  it('renders compact dice in a single ordered row', () => {
    render(
      <DicePanel
        dice={mockDice}
        phase="active-selection"
        canSelect={true}
        compact={true}
      />
    );

    const compactRow = screen.getByTestId('compact-dice-row');
    expect(compactRow.children).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Dé couleur Rouge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dé nombre 1' })).toBeInTheDocument();
  });

  it('keeps selection highlighting in compact mode', () => {
    render(
      <DicePanel
        dice={mockDice}
        phase="active-selection"
        canSelect={true}
        compact={true}
        selectedColorDice={mockSelectedColorDie}
      />
    );

    expect(screen.getByRole('button', { name: 'Dé couleur Rouge' })).toHaveClass('ring-2');
  });

  it('animates dice on the first roll transition', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <DicePanel
        dice={[]}
        phase="rolling"
        canRoll={true}
      />
    );

    rerender(
      <DicePanel
        dice={mockDice}
        phase="active-selection"
        canSelect={true}
      />
    );

    act(() => {
      vi.advanceTimersByTime(0);
    });

    const redDie = screen.getByRole('button', { name: 'Dé couleur Rouge' });
    expect(Array.from(redDie.classList).some(c => c.startsWith('animate-'))).toBe(true);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    
    expect(Array.from(redDie.classList).some(c => c.startsWith('animate-'))).toBe(false);
  });
});
