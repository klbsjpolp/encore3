import { HelpCircle, Shuffle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  ColorDiceResult,
  DiceColor,
  DiceNumber,
  DiceResult,
  GameState,
  NumberDiceResult,
} from '@/types/game'
import { DICE_COLOR_FACES, DICE_NUMBER_FACES } from '@/types/game'

interface DicePanelProps {
  dice: DiceResult[]
  phase: GameState['phase']
  lastPhase?: GameState['lastPhase']
  onDiceSelect?: (dice: DiceResult) => void
  onRollDice?: () => void
  canRoll?: boolean
  canSelect?: boolean
  selectedColorDice?: ColorDiceResult | null
  selectedNumberDice?: NumberDiceResult | null
  flashRoll?: boolean
  compact?: boolean
}

const colorMap = {
  yellow: 'bg-game-yellow text-black',
  green: 'bg-game-green text-white',
  blue: 'bg-game-blue text-white',
  red: 'bg-game-red text-white',
  orange: 'bg-game-orange text-black',
  purple: 'bg-game-purple text-white',
}

const getDiceColorClass = (value: DiceColor): string => {
  if (value === 'wild') {
    return 'bg-game-wild text-white'
  }
  return colorMap[value]
}

const displayMap = {
  yellow: 'Jaune',
  green: 'Vert',
  blue: 'Bleu',
  red: 'Rouge',
  orange: 'Orange',
  purple: 'Mauve',
}

function getDiceDisplayValue(value: DiceColor | DiceNumber): string {
  if (value === 'wild') {
    return 'Joker'
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  return displayMap[value]
}

function getDiceShortDisplayValue(value: DiceColor | DiceNumber): string {
  if (value === 'wild') {
    return '?'
  }
  const display = getDiceDisplayValue(value)
  return display[0]
}

const isColorDice = (dice: DiceResult): dice is ColorDiceResult => dice.type === 'color'
const isNumberDice = (dice: DiceResult): dice is NumberDiceResult => dice.type === 'number'

function getRandomDiceValue(dice: DiceResult): DiceColor | DiceNumber {
  const values = dice.type === 'color' ? DICE_COLOR_FACES : DICE_NUMBER_FACES
  return values[Math.floor(Math.random() * values.length)]
}

function getStableAnimationDelayFromId(id: string): string {
  let hash = 5381
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) + hash + id.charCodeAt(i)
  }
  const n = Math.abs(hash % 100)
  const seconds = n / 1000
  return `${seconds}s`
}

const DiceDisplay = ({
  dice,
  onSelect,
  canSelect,
  isSelected,
  hideUsedMarks = false,
  isRolling = false,
  isSwitching = false,
  compact = false,
  displayValue,
}: {
  dice: DiceResult
  onSelect?: (dice: DiceResult) => void
  canSelect?: boolean
  isSelected?: boolean
  hideUsedMarks?: boolean
  isRolling?: boolean
  isSwitching?: boolean
  compact?: boolean
  displayValue?: DiceColor | DiceNumber
}) => {
  const isColorDie = dice.type === 'color'
  const value = displayValue ?? dice.value
  const isUsed = dice.selected && !hideUsedMarks
  const isInteractable = canSelect && !isRolling
  const sizeClass = compact
    ? 'h-11 w-11 rounded-md text-sm'
    : 'w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl text-base sm:text-lg'
  const animationDelay = useMemo(
    () => (isRolling ? getStableAnimationDelayFromId(dice.id) : undefined),
    [isRolling, dice.id],
  )

  return (
    <button
      onClick={() => isInteractable && onSelect?.(dice)}
      disabled={!isInteractable || isUsed}
      aria-label={
        isRolling
          ? `${isColorDie ? 'Dé couleur' : 'Dé nombre'} en rotation`
          : `${isColorDie ? 'Dé couleur' : 'Dé nombre'} ${getDiceDisplayValue(value)}`
      }
      title={
        isUsed
          ? 'Dé déjà utilisé'
          : isRolling
            ? 'Résultat en cours'
            : canSelect
              ? 'Sélectionner ce dé'
              : "En attente du tour de l'autre joueur"
      }
      className={cn(
        'relative overflow-hidden shadow-dice transition-all duration-300',
        'flex items-center justify-center font-bold',
        sizeClass,
        isColorDie ? getDiceColorClass(value as DiceColor) : 'bg-gradient-dice text-foreground',
        isSelected &&
          (compact
            ? 'ring-2 ring-ring shadow-glow scale-105'
            : 'ring-4 ring-ring shadow-glow scale-110'),
        isUsed && 'opacity-50 cursor-not-allowed',
        isInteractable
          ? 'hover:scale-105 active:scale-95'
          : // During a player switch keep the dice steady instead of dimming
            // them to 30% and back, which reads as a flash between turns.
            isSwitching
            ? 'cursor-not-allowed'
            : 'cursor-not-allowed opacity-30',
        isRolling && 'animate-spin duration-500 blur-xs opacity-30',
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
  )
}

export const DicePanel = ({
  dice,
  phase,
  lastPhase,
  onDiceSelect,
  onRollDice,
  canRoll = false,
  canSelect = false,
  selectedColorDice,
  selectedNumberDice,
  flashRoll = false,
  compact = false,
}: DicePanelProps) => {
  const [isRolling, setIsRolling] = useState(false)
  const [rollingValues, setRollingValues] = useState<Record<string, DiceColor | DiceNumber>>({})
  const prevDiceIdsRef = useRef<string>('')
  const prevPhaseRef = useRef<string>(phase)

  const colorDice = dice.filter(isColorDice)
  const numberDice = dice.filter(isNumberDice)
  const orderedDice = [...colorDice, ...numberDice]

  useEffect(() => {
    const currentDiceIds = dice.map((d) => d.id).join(',')
    const wasRolling = prevPhaseRef.current === 'rolling' || prevPhaseRef.current === 'rolling-ai'
    const isNowSelecting =
      phase === 'active-selection' ||
      phase === 'active-selection-ai' ||
      phase === 'passive-selection' ||
      phase === 'passive-selection-ai'
    const hasPreviousDice = prevDiceIdsRef.current !== ''
    const diceChanged = currentDiceIds !== prevDiceIdsRef.current
    const changedAfterRoll = wasRolling && isNowSelecting
    const changedWithinPhase = hasPreviousDice && phase === prevPhaseRef.current

    let clear: (() => void) | undefined
    if (dice.length > 0 && diceChanged && (changedAfterRoll || changedWithinPhase)) {
      const start = setTimeout(() => setIsRolling(true), 0)
      const stop = setTimeout(() => setIsRolling(false), 600)
      clear = () => {
        clearTimeout(start)
        clearTimeout(stop)
      }
    }
    prevDiceIdsRef.current = currentDiceIds
    prevPhaseRef.current = phase
    return () => {
      clear?.()
    }
  }, [dice, phase])

  useEffect(() => {
    if (!isRolling || dice.length === 0) {
      return
    }

    const randomize = () => {
      setRollingValues(Object.fromEntries(dice.map((die) => [die.id, getRandomDiceValue(die)])))
    }

    const initialTimeout = window.setTimeout(randomize, 0)
    const interval = window.setInterval(randomize, 300)

    return () => {
      window.clearTimeout(initialTimeout)
      window.clearInterval(interval)
    }
  }, [dice, isRolling])

  const isSwitching = phase === 'player-switching'
  // A player switch that follows an AI phase is still part of the AI's play, so
  // keep the dice dimmed like an AI turn instead of flashing them to the
  // "active" look, which reads as the human's turn starting early.
  const isAiSwitch = isSwitching && (lastPhase?.includes('-ai') ?? false)
  const disabled = phase.includes('-ai') || isAiSwitch
  // Only keep the dice steady (no dimming) for human-to-human switches.
  const steadySwitch = isSwitching && !isAiSwitch
  const finalCanRoll = canRoll && !disabled
  const finalCanSelect = canSelect && !disabled
  const placeholderSrc = `${import.meta.env.BASE_URL}placeholder.svg`

  const renderPlaceholders = (count: number) =>
    Array.from({ length: count }, (_, index) => (
      <div
        key={index}
        className={cn(
          'shadow-dice bg-muted/40 flex items-center justify-center',
          compact ? 'h-11 w-11 rounded-md' : 'w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl',
        )}
      >
        <img
          src={placeholderSrc}
          alt="Dé en attente"
          className={cn('opacity-60', compact ? 'w-4 h-4' : 'w-5 h-5 sm:w-6 sm:h-6')}
        />
      </div>
    ))

  return (
    <div
      className={cn(
        compact
          ? 'bg-card rounded-lg p-3 shadow-square space-y-3 transition-opacity'
          : 'bg-card rounded-xl p-3 sm:p-4 lg:p-6 shadow-square space-y-3 sm:space-y-4 lg:space-y-6 transition-opacity',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      {compact ? (
        // The roll action lives in the mobile bottom action bar, so the compact
        // panel only shows the dice themselves.
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Dés</h3>
            <p className="text-xs font-medium text-muted-foreground">Couleur puis nombre</p>
          </div>
          <div className="grid grid-cols-6 gap-2" data-testid="compact-dice-row">
            {orderedDice.length === 0
              ? renderPlaceholders(6)
              : orderedDice.map((die) => (
                  <DiceDisplay
                    key={die.id}
                    dice={die}
                    onSelect={onDiceSelect}
                    canSelect={finalCanSelect}
                    isSelected={
                      selectedColorDice?.id === die.id || selectedNumberDice?.id === die.id
                    }
                    hideUsedMarks={false}
                    isRolling={isRolling}
                    isSwitching={steadySwitch}
                    compact={true}
                    displayValue={isRolling ? rollingValues[die.id] : undefined}
                  />
                ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground text-base sm:text-lg">Dés</h3>
            <Button
              onClick={onRollDice}
              size="sm"
              variant="game"
              glow={flashRoll}
              className="gap-2 transition-all w-full sm:w-auto"
              disabled={!finalCanRoll}
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Lancer les dés</span>
              <span className="sm:hidden">Lancer</span>
              {finalCanRoll && (
                <kbd className="pointer-events-none hidden rounded border border-current px-1 font-mono text-[10px] font-normal opacity-75 lg:inline-block">
                  Espace
                </kbd>
              )}
            </Button>
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">Couleur</p>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {colorDice.length === 0
                ? renderPlaceholders(3)
                : colorDice.map((die) => (
                    <DiceDisplay
                      key={die.id}
                      dice={die}
                      onSelect={onDiceSelect}
                      canSelect={finalCanSelect}
                      isSelected={selectedColorDice?.id === die.id}
                      hideUsedMarks={false}
                      isRolling={isRolling}
                      isSwitching={steadySwitch}
                      displayValue={isRolling ? rollingValues[die.id] : undefined}
                    />
                  ))}
            </div>
          </div>

          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">Nombre</p>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {numberDice.length === 0
                ? renderPlaceholders(3)
                : numberDice.map((die) => (
                    <DiceDisplay
                      key={die.id}
                      dice={die}
                      onSelect={onDiceSelect}
                      canSelect={finalCanSelect}
                      isSelected={selectedNumberDice?.id === die.id}
                      hideUsedMarks={false}
                      isRolling={isRolling}
                      isSwitching={steadySwitch}
                      displayValue={isRolling ? rollingValues[die.id] : undefined}
                    />
                  ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
