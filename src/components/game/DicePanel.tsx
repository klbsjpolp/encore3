import { useEffect, useMemo, useRef, useState } from 'react';
import { Shuffle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ColorDiceResult, DiceColor, DiceNumber, DiceResult, GameState, NumberDiceResult } from '@/types/game';

interface DicePanelProps {
  dice: DiceResult[];
  phase: GameState['phase'];
  onDiceSelect?: (dice: DiceResult) => void;
  onRollDice?: () => void;
  canRoll?: boolean;
  canSelect?: boolean;
  selectedColorDice?: ColorDiceResult | null;
  selectedNumberDice?: NumberDiceResult | null;
  flashRoll?: boolean;
  compact?: boolean;
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

function getDiceDisplayValue(value: DiceColor | DiceNumber): string {
  if (value === 'wild') return 'Joker';
  const display = displayMap[value];
  if (display) return display;
  return value.toString();
}

function getDiceShortDisplayValue(value: DiceColor | DiceNumber): string {
  if (value === 'wild') return '?';
  const display = getDiceDisplayValue(value);
  return display[0];
}

const isColorDice = (dice: DiceResult): dice is ColorDiceResult => dice.type === 'color';
const isNumberDice = (dice: DiceResult): dice is NumberDiceResult => dice.type === 'number';

function getStableAnimationDelayFromId(id: string): string {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) + hash) + id.charCodeAt(i);
  }
  const n = Math.abs(hash % 100);
  const seconds = n / 1000;
  return `${seconds}s`;
}

const DiceDisplay = ({
  dice,
  onSelect,
  canSelect,
  isSelected,
  hideUsedMarks = false,
  isRolling = false,
  compact = false,
}: {
  dice: DiceResult;
  onSelect?: (dice: DiceResult) => void;
  canSelect?: boolean;
  isSelected?: boolean;
  hideUsedMarks?: boolean;
  isRolling?: boolean;
  compact?: boolean;
}) => {
  const isColorDie = dice.type === 'color';
  const value = dice.value;
  const isUsed = dice.selected && !hideUsedMarks;
  const sizeClass = compact
    ? 'h-11 w-11 rounded-md text-sm'
    : 'w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl text-base sm:text-lg';
  const animationDelay = useMemo(() => (isRolling ? getStableAnimationDelayFromId(dice.id) : undefined), [isRolling, dice.id]);

  return (
    <button
      onClick={() => canSelect && onSelect?.(dice)}
      disabled={!canSelect || isUsed}
      aria-label={`${isColorDie ? 'Dé couleur' : 'Dé nombre'} ${getDiceDisplayValue(value)}`}
      title={isUsed ? 'Dé déjà utilisé' : canSelect ? 'Sélectionner ce dé' : "En attente du tour de l'autre joueur"}
      className={cn(
        'relative overflow-hidden shadow-dice transition-all duration-300',
        'flex items-center justify-center font-bold',
        sizeClass,
        isColorDie ? getDiceColorClass(value as DiceColor) : 'bg-gradient-dice text-foreground',
        isSelected && (compact ? 'ring-2 ring-ring shadow-glow scale-105' : 'ring-4 ring-ring shadow-glow scale-110'),
        isUsed && 'opacity-50 cursor-not-allowed',
        canSelect ? 'hover:scale-105 active:scale-95' : 'cursor-not-allowed opacity-30',
        isRolling && 'animate-spin duration-500 blur-xs opacity-30'
      )}
      style={{ animationDelay }}
    >
      {value === 'wild' ? (
        <HelpCircle className={compact ? 'w-4 h-4' : 'w-5 h-5 sm:w-6 sm:h-6'} />
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
  compact = false,
}: DicePanelProps) => {
  const [isRolling, setIsRolling] = useState(false);
  const prevDiceIdsRef = useRef<string>('');
  const prevPhaseRef = useRef<string>(phase);

  const colorDice = dice.filter(isColorDice);
  const numberDice = dice.filter(isNumberDice);
  const orderedDice = [...colorDice, ...numberDice];

  useEffect(() => {
    const currentDiceIds = dice.map(d => d.id).join(',');
    const wasRolling = prevPhaseRef.current === 'rolling' || prevPhaseRef.current === 'rolling-ai';
    const isNowSelecting = phase === 'active-selection' || phase === 'active-selection-ai' ||
      phase === 'passive-selection' || phase === 'passive-selection-ai';
    const diceChanged = currentDiceIds !== prevDiceIdsRef.current && prevDiceIdsRef.current !== '';

    let clear: (() => void) | undefined;
    if (dice.length > 0 && diceChanged && ((wasRolling && isNowSelecting) || phase === prevPhaseRef.current)) {
      const start = setTimeout(() => setIsRolling(true), 0);
      const stop = setTimeout(() => setIsRolling(false), 600);
      clear = () => {
        clearTimeout(start);
        clearTimeout(stop);
      };
    }
    prevDiceIdsRef.current = currentDiceIds;
    prevPhaseRef.current = phase;
    return () => {
      clear?.();
    };
  }, [dice, phase]);

  const disabled = phase.includes('-ai');
  const finalCanRoll = canRoll && !disabled;
  const finalCanSelect = canSelect && !disabled;
  const placeholderSrc = `${import.meta.env.BASE_URL}placeholder.svg`;

  const renderPlaceholders = (count: number) =>
    Array.from({ length: count }, (_, index) => (
      <div
        key={index}
        className={cn(
          'shadow-dice bg-muted/40 flex items-center justify-center',
          compact ? 'h-11 w-11 rounded-md' : 'w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl'
        )}
      >
        <img src={placeholderSrc} alt="Dé en attente" className={cn('opacity-60', compact ? 'w-4 h-4' : 'w-5 h-5 sm:w-6 sm:h-6')} />
      </div>
    ));

  return (
    <div
      className={cn(
        compact ? 'bg-card rounded-lg p-3 shadow-square space-y-3 transition-opacity' : 'bg-card rounded-xl p-3 sm:p-4 lg:p-6 shadow-square space-y-3 sm:space-y-4 lg:space-y-6 transition-opacity',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h3 className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base sm:text-lg')}>Dés</h3>
        <Button
          onClick={onRollDice}
          size="sm"
          variant="game"
          glow={flashRoll}
          className={cn('gap-2 transition-all', compact ? 'w-full' : 'w-full sm:w-auto')}
          disabled={!finalCanRoll}
        >
          <Shuffle className="w-4 h-4" />
          {compact ? (
            <span>Lancer</span>
          ) : (
            <>
              <span className="hidden sm:inline">Lancer les dés</span>
              <span className="sm:hidden">Lancer</span>
            </>
          )}
        </Button>
      </div>

      {compact ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Couleur puis nombre</p>
          <div className="grid grid-cols-6 gap-2" data-testid="compact-dice-row">
            {orderedDice.length === 0
              ? renderPlaceholders(6)
              : orderedDice.map(die => (
                  <DiceDisplay
                    key={die.id}
                    dice={die}
                    onSelect={onDiceSelect}
                    canSelect={finalCanSelect}
                    isSelected={selectedColorDice?.id === die.id || selectedNumberDice?.id === die.id}
                    hideUsedMarks={false}
                    isRolling={isRolling}
                    compact={true}
                  />
                ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">Couleur</p>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {colorDice.length === 0
                ? renderPlaceholders(3)
                : colorDice.map(die => (
                    <DiceDisplay
                      key={die.id}
                      dice={die}
                      onSelect={onDiceSelect}
                      canSelect={finalCanSelect}
                      isSelected={selectedColorDice?.id === die.id}
                      hideUsedMarks={false}
                      isRolling={isRolling}
                    />
                  ))}
            </div>
          </div>

          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">Nombre</p>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {numberDice.length === 0
                ? renderPlaceholders(3)
                : numberDice.map(die => (
                    <DiceDisplay
                      key={die.id}
                      dice={die}
                      onSelect={onDiceSelect}
                      canSelect={finalCanSelect}
                      isSelected={selectedNumberDice?.id === die.id}
                      hideUsedMarks={false}
                      isRolling={isRolling}
                    />
                  ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
