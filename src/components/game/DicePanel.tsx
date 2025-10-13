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
  flashRoll?: boolean;
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
  isSelected,
  hideUsedMarks = false,
}: { 
  dice: DiceResult; 
  onSelect?: (dice: DiceResult) => void; 
  canSelect?: boolean;
  isSelected?: boolean;
  hideUsedMarks?: boolean;
}) => {
  const isColorDice = dice.type === 'color';
  const value = dice.value;

  const isUsed = dice.selected && !hideUsedMarks;
  const ariaState = isUsed
    ? 'used'
    : canSelect
      ? 'available'
      : 'unavailable';

  return (
    <button
      onClick={() => canSelect && onSelect?.(dice)}
      disabled={!canSelect || isUsed}
      aria-label={`dice-${ariaState}-${isColorDice ? 'color' : 'number'}-${value}`}
      title={isUsed ? 'Dé déjà utilisé' : canSelect ? 'Sélectionner ce dé' : "En attente du tour de l'autre joueur"}
      className={cn(
        "relative overflow-hidden w-16 h-16 rounded-xl shadow-dice transition-all duration-300",
        "flex items-center justify-center font-bold text-lg",
        isColorDice ? getDiceColorClass(value as DiceColor) : "bg-gradient-dice text-foreground",
        isSelected && "ring-4 ring-ring shadow-glow scale-110",
        isUsed && "opacity-50 cursor-not-allowed",
        canSelect ? "hover:scale-105 active:scale-95" : "cursor-not-allowed opacity-30"
      )}
    >
      {value === 'wild' ? (
        <HelpCircle className="w-6 h-6" />
      ) : (
        <span>{getDiceShortDisplayValue(value)}</span>
      )}

      {isUsed && (
        <>
          <span className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-foreground/60 rotate-45" />
          <span className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-foreground/60 -rotate-45" />
        </>
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
  flashRoll = false,
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
          glow={flashRoll}
          className="gap-2 transition-all"
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
            {colorDice.length === 0 ? (
              <>
                <div className="w-16 h-16 rounded-xl shadow-dice bg-muted/40 flex items-center justify-center">
                  <img src="/placeholder.svg" alt="Dé en attente" className="w-6 h-6 opacity-60" />
                </div>
                <div className="w-16 h-16 rounded-xl shadow-dice bg-muted/40 flex items-center justify-center">
                  <img src="/placeholder.svg" alt="Dé en attente" className="w-6 h-6 opacity-60" />
                </div>
                <div className="w-16 h-16 rounded-xl shadow-dice bg-muted/40 flex items-center justify-center">
                  <img src="/placeholder.svg" alt="Dé en attente" className="w-6 h-6 opacity-60" />
                </div>
              </>
            ) : (
              colorDice.map(die => (
                <DiceDisplay
                  key={die.id}
                  dice={die}
                  onSelect={onDiceSelect}
                  canSelect={finalCanSelect}
                  isSelected={selectedColorDice?.id === die.id}
                  hideUsedMarks={false}
                />
              ))
            )}
          </div>
        </div>

        {/* Number Dice */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Dés numériques</p>
          <div className="flex gap-2 flex-wrap">
            {numberDice.length === 0 ? (
              <>
                <div className="w-16 h-16 rounded-xl shadow-dice bg-muted/40 flex items-center justify-center">
                  <img src="/placeholder.svg" alt="Dé en attente" className="w-6 h-6 opacity-60" />
                </div>
                <div className="w-16 h-16 rounded-xl shadow-dice bg-muted/40 flex items-center justify-center">
                  <img src="/placeholder.svg" alt="Dé en attente" className="w-6 h-6 opacity-60" />
                </div>
                <div className="w-16 h-16 rounded-xl shadow-dice bg-muted/40 flex items-center justify-center">
                  <img src="/placeholder.svg" alt="Dé en attente" className="w-6 h-6 opacity-60" />
                </div>
              </>
            ) : (
              numberDice.map(die => (
                <DiceDisplay
                  key={die.id}
                  dice={die}
                  onSelect={onDiceSelect}
                  canSelect={finalCanSelect}
                  isSelected={selectedNumberDice?.id === die.id}
                  hideUsedMarks={false}
                />
              ))
            )}
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