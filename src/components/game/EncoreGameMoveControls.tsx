import { Shuffle } from 'lucide-react'

import { KeyboardHint } from '@/components/game/KeyboardHint.tsx'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EncoreGameMoveControlsProps {
  isMobile: boolean
  selectedCount: number
  selectionLimit: number
  canConfirm: boolean
  actionsDisabled: boolean
  confirmGlow: boolean
  skipGlow: boolean
  showRoll?: boolean
  canRoll?: boolean
  onRoll?: () => void
  onConfirm: () => void
  onClear: () => void
  onSkip: () => void
}

export const EncoreGameMoveControls = ({
  isMobile,
  selectedCount,
  selectionLimit,
  canConfirm,
  actionsDisabled,
  confirmGlow,
  skipGlow,
  showRoll = false,
  canRoll = false,
  onRoll,
  onConfirm,
  onClear,
  onSkip,
}: EncoreGameMoveControlsProps) => {
  // On mobile the bar shows the phase's primary action: rolling the dice
  // before a roll, then the placement actions once the dice are rolled.
  if (isMobile && showRoll) {
    return (
      <Button
        onClick={onRoll}
        disabled={!canRoll}
        variant="game"
        glow={canRoll}
        className="w-full gap-2 text-sm"
      >
        <Shuffle className="w-4 h-4" />
        Lancer les dés
      </Button>
    )
  }

  return (
    <div
      className={cn(
        'gap-2',
        isMobile ? 'grid grid-cols-[2fr_1fr_1fr]' : 'flex flex-col sm:flex-row',
      )}
    >
      <Button
        onClick={onConfirm}
        disabled={!canConfirm || actionsDisabled}
        variant="game"
        glow={confirmGlow}
        className="flex-1 text-sm sm:text-base"
      >
        {isMobile ? (
          <span>
            Confirmer ({selectedCount}/{selectionLimit})
          </span>
        ) : (
          <>
            <span className="hidden sm:inline">Confirmer le placement ({selectedCount} cases)</span>
            <span className="sm:hidden">Confirmer ({selectedCount})</span>
            {canConfirm && !actionsDisabled && <KeyboardHint />}
          </>
        )}
      </Button>
      <Button
        onClick={onClear}
        variant="outline"
        disabled={actionsDisabled || selectedCount === 0}
        className="text-sm sm:text-base"
      >
        Effacer
      </Button>
      <Button
        onClick={onSkip}
        variant="secondary"
        disabled={actionsDisabled}
        glow={skipGlow}
        className="text-sm sm:text-base"
      >
        <span className="hidden sm:inline">Passer le tour</span>
        <span className="sm:hidden">Passer</span>
      </Button>
    </div>
  )
}
