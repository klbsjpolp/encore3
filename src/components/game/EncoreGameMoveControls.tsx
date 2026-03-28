import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EncoreGameMoveControlsProps {
  isMobile: boolean
  selectedCount: number
  canConfirm: boolean
  actionsDisabled: boolean
  confirmGlow: boolean
  skipGlow: boolean
  onConfirm: () => void
  onClear: () => void
  onSkip: () => void
}

export const EncoreGameMoveControls = ({
  isMobile,
  selectedCount,
  canConfirm,
  actionsDisabled,
  confirmGlow,
  skipGlow,
  onConfirm,
  onClear,
  onSkip,
}: EncoreGameMoveControlsProps) => {
  return (
    <div className={cn('gap-2', isMobile ? 'grid grid-cols-3' : 'flex flex-col sm:flex-row')}>
      <Button
        onClick={onConfirm}
        disabled={!canConfirm || actionsDisabled}
        variant="game"
        glow={confirmGlow}
        className="flex-1 text-sm sm:text-base"
      >
        {isMobile ? (
          <span>Confirmer ({selectedCount})</span>
        ) : (
          <>
            <span className="hidden sm:inline">Confirmer le placement ({selectedCount} cases)</span>
            <span className="sm:hidden">Confirmer ({selectedCount})</span>
          </>
        )}
      </Button>
      <Button
        onClick={onClear}
        variant="outline"
        disabled={actionsDisabled}
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
