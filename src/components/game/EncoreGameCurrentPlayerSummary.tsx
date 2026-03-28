import { Badge } from '@/components/ui/badge'
import type { DiceColor, DiceNumber } from '@/types/game'

const COLOR_LABELS: Record<DiceColor, string> = {
  yellow: 'Jaune',
  green: 'Vert',
  blue: 'Bleu',
  red: 'Rouge',
  orange: 'Orange',
  wild: 'Joker',
}

const formatDiceValue = (value?: DiceColor | DiceNumber) => {
  if (value == null) {
    return 'Aucun'
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  return COLOR_LABELS[value] ?? value
}

interface EncoreGameCurrentPlayerSummaryProps {
  currentPlayerName?: string
  selectedColor?: DiceColor
  selectedNumber?: DiceNumber
  statusLabel: string
  isMobile: boolean
  selectedCount: number
  selectionLimit: number
}

export const EncoreGameCurrentPlayerSummary = ({
  currentPlayerName,
  selectedColor,
  selectedNumber,
  statusLabel,
  isMobile,
  selectedCount,
  selectionLimit,
}: EncoreGameCurrentPlayerSummaryProps) => {
  return (
    <div className="bg-card rounded-lg p-3 shadow-square sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-base font-semibold sm:text-lg">Tour actuel : {currentPlayerName}</p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Couleur: {formatDiceValue(selectedColor)} · Nombre: {formatDiceValue(selectedNumber)}
          </p>
        </div>
        <Badge
          variant="default"
          className="shrink-0 px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm"
        >
          {statusLabel}
        </Badge>
      </div>
      {isMobile && (
        <div className="mt-3 flex items-center justify-between rounded-md bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
          <span>Sélection</span>
          <span>
            {selectedCount}/{selectionLimit}
          </span>
        </div>
      )}
    </div>
  )
}
