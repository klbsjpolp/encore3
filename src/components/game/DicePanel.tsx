import { DiceResult, DiceColor, DiceNumber } from '@/types/game';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Shuffle, HelpCircle } from 'lucide-react';

interface DicePanelProps {
  dice: DiceResult[];
  onDiceSelect?: (dice: DiceResult) => void;
  onRollDice?: () => void;
  canRoll?: boolean;
  canSelect?: boolean;
  selectedColorDice?: DiceResult | null;
  selectedNumberDice?: DiceResult | null;
}

const getDiceColorClass = (value: DiceColor): string => {
  if (value === 'wild') return 'bg-game-wild text-white';
  const colorMap = {
    yellow: 'bg-game-yellow text-black',
    green: 'bg-game-green text-white',
    blue: 'bg-game-blue text-white',
    red: 'bg-game-red text-white',
    orange: 'bg-game-orange text-black',
    purple: 'bg-game-purple text-white',
  };
  return colorMap[value];
};

const DiceDisplay = ({ 
  dice, 
  onSelect, 
  canSelect, 
  isSelected 
}: { 
  dice: DiceResult; 
  onSelect?: (dice: DiceResult) => void; 
  canSelect?: boolean;
  isSelected?: boolean;
}) => {
  const isColorDice = dice.type === 'color';
  const value = dice.value;

  return (
    <button
      onClick={() => canSelect && onSelect?.(dice)}
      disabled={!canSelect || dice.selected}
      className={cn(
        "w-16 h-16 rounded-xl shadow-dice transition-all duration-300",
        "flex items-center justify-center font-bold text-lg",
        "hover:scale-105 active:scale-95",
        isColorDice ? getDiceColorClass(value as DiceColor) : "bg-gradient-dice text-foreground",
        isSelected && "ring-4 ring-ring shadow-glow scale-110",
        dice.selected && "opacity-50 cursor-not-allowed",
        !canSelect && "cursor-not-allowed opacity-75"
      )}
    >
      {value === 'wild' ? (
        <HelpCircle className="w-6 h-6" />
      ) : (
        <span>{value}</span>
      )}
    </button>
  );
};

export const DicePanel = ({
  dice,
  onDiceSelect,
  onRollDice,
  canRoll = false,
  canSelect = false,
  selectedColorDice,
  selectedNumberDice
}: DicePanelProps) => {
  const colorDice = dice.filter(d => d.type === 'color');
  const numberDice = dice.filter(d => d.type === 'number');

  return (
    <div className="bg-card rounded-xl p-6 shadow-square space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Dice</h3>
        {canRoll && (
          <Button 
            onClick={onRollDice}
            size="sm"
            variant="game"
            className="gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Roll Dice
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Color Dice */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Color Dice</p>
          <div className="flex gap-2">
            {colorDice.map(die => (
              <DiceDisplay
                key={die.id}
                dice={die}
                onSelect={onDiceSelect}
                canSelect={canSelect}
                isSelected={selectedColorDice?.id === die.id}
              />
            ))}
          </div>
        </div>

        {/* Number Dice */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Number Dice</p>
          <div className="flex gap-2">
            {numberDice.map(die => (
              <DiceDisplay
                key={die.id}
                dice={die}
                onSelect={onDiceSelect}
                canSelect={canSelect}
                isSelected={selectedNumberDice?.id === die.id}
              />
            ))}
          </div>
        </div>
      </div>

      {selectedColorDice && selectedNumberDice && (
        <div className="bg-gradient-active text-primary-foreground rounded-lg p-3">
          <p className="text-sm font-medium">Selected Combination:</p>
          <p className="text-lg font-bold">
            {selectedColorDice.value} + {selectedNumberDice.value}
          </p>
        </div>
      )}
    </div>
  );
};