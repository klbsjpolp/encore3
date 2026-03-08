import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
    
    expect(screen.getByText('Lancer les dés')).toBeDisabled();
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
    
    // The Red color die should have 'R' as short display value (from getDiceShortDisplayValue)
    const redDie = screen.getByText('R');
    fireEvent.click(redDie);
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
});
