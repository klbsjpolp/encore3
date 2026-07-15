import { Badge } from '@/components/ui/badge'

interface EncoreGameCurrentPlayerSummaryProps {
  currentPlayerName?: string
  statusLabel: string
}

export const EncoreGameCurrentPlayerSummary = ({
  currentPlayerName,
  statusLabel,
}: EncoreGameCurrentPlayerSummaryProps) => {
  return (
    <div className="bg-card rounded-lg p-3 shadow-square sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-base font-semibold sm:text-lg">Tour actuel : {currentPlayerName}</p>
        </div>
        <Badge
          variant="default"
          className="shrink-0 px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm"
        >
          {statusLabel}
        </Badge>
      </div>
    </div>
  )
}
