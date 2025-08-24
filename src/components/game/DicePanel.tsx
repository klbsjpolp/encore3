import { DiceResult, DiceColor, GameColor, GameState } from '@/types/game';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Shuffle, HelpCircle } from 'lucide-react';

interface DicePanelProps {
  dice: DiceResult[];
  phase: GameState['phase'];
  onDiceSelect?: (dice: DiceResult) => void;
  onRollDice?: () => void;
  canRoll?: boolean;
  canSelect?: boolean;
  selectedColorDice?: DiceResult | null;
  selectedNumberDice?: DiceResult | null;
}

const colorMap = {
  yellow: 'bg-game-yellow text-black',
  green: 'bg-game-green text-white',
  blue: 'bg-game-blue text-white',
  red: 'bg-game-red text-white',
  orange: 'bg-game-orange text-black',
  purple: 'bg-game-purple text-white',
};

const getDiceColorClass = (value: DiceColor): string => {
  if (value === 'wild') return 'bg-game-wild text-white';
  return colorMap[value];
};

const displayMap = {
  yellow: 'Jaune',
  green: 'Vert',
  blue: 'Bleu',
  red: 'Rouge',
  orange: 'Orange',
  purple: 'Mauve',
};

function getDiceDisplayValue(value: DiceColor | 'wild' | number): string {
  if (value === 'wild') return 'Joker';
  const display = displayMap[value];
  if (display) return display;
  return value.toString();
}

function getDiceShortDisplayValue(value: DiceColor | 'wild' | number): string {
  if (value === 'wild') return '?';
  const display = getDiceDisplayValue(value);
  return display[0];
}

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
        isColorDice ? getDiceColorClass(value as DiceColor) : "bg-gradient-dice text-foreground",
        isSelected && "ring-4 ring-ring shadow-glow scale-110",
        dice.selected && "opacity-50 cursor-not-allowed",
        canSelect ? "hover:scale-105 active:scale-95" : "cursor-not-allowed opacity-30"
      )}
    >
      {value === 'wild' ? (
        <HelpCircle className="w-6 h-6" />
      ) : (
        <span>{getDiceShortDisplayValue(value)}</span>
      )}
    </button>
  );
};

export const DicePanel = ({
  dice,
  phase,
  onDiceSelect,
  onRollDice,
  canRoll = false,
  canSelect = false,
  selectedColorDice,
  selectedNumberDice,
}: DicePanelProps) => {
  const colorDice = dice.filter(d => d.type === 'color');
  const numberDice = dice.filter(d => d.type === 'number');

  const disabled = phase.includes('-ai');
  const finalCanRoll = canRoll && !disabled;
  const finalCanSelect = canSelect && !disabled;

  return (
    <div className={cn("bg-card rounded-xl p-6 shadow-square space-y-6 transition-opacity", disabled && "opacity-50 pointer-events-none")}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Dés</h3>
        <Button
          onClick={onRollDice}
          size="sm"
          variant="game"
          className="gap-2"
          disabled={!finalCanRoll}
        >
          <Shuffle className="w-4 h-4" />
          Lancer les dés
        </Button>
      </div>

      <div className="space-y-4">
        {/* Color Dice */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Dés de couleur</p>
          <div className="flex gap-2 flex-wrap">
            {colorDice.map(die => (
              <DiceDisplay
                key={die.id}
                dice={die}
                onSelect={onDiceSelect}
                canSelect={finalCanSelect}
                isSelected={selectedColorDice?.id === die.id}
              />
            ))}
          </div>
        </div>

        {/* Number Dice */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Dés numériques</p>
          <div className="flex gap-2 flex-wrap">
            {numberDice.map(die => (
              <DiceDisplay
                key={die.id}
                dice={die}
                onSelect={onDiceSelect}
                canSelect={finalCanSelect}
                isSelected={selectedNumberDice?.id === die.id}
              />
            ))}
          </div>
        </div>
      </div>

      {selectedColorDice && selectedNumberDice && (
        <div className="hidden bg-gradient-active text-primary-foreground rounded-lg p-3">
          <p className="text-sm font-medium">Combinaison sélectionnée :</p>
          <p className="text-lg font-bold">
            {getDiceDisplayValue(selectedColorDice.value)} + {getDiceDisplayValue(selectedNumberDice.value)}
          </p>
        </div>
      )}
    </div>
  );
};