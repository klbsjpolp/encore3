import { Star, Trophy } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  calculateColumnScore,
  calculateFinalScore,
  determineWinners,
  getColorCompletionPoints,
  getColumnScoreBreakdown,
  MAX_JOKERS,
  TOTAL_STARS,
} from '@/hooks/useEncoreGame.ts'
import { cn } from '@/lib/utils'
import type { Player } from '@/types/game'

interface ScorePanelProps {
  player: Player
  isCurrentPlayer?: boolean
  gameComplete?: boolean
  allPlayers?: Player[]
  compact?: boolean
}

const getColorBadgeClasses = (color: string) =>
  cn(
    color === 'yellow' && 'bg-game-yellow border-yellow-600 text-black',
    color === 'green' && 'bg-game-green border-green-700 text-white',
    color === 'blue' && 'bg-game-blue border-blue-700 text-white',
    color === 'red' && 'bg-game-red border-red-700 text-white',
    color === 'orange' && 'bg-game-orange border-orange-700 text-black',
  )

export const ScorePanel = ({
  player,
  isCurrentPlayer = false,
  gameComplete = false,
  allPlayers = [],
  compact = false,
}: ScorePanelProps) => {
  const columnsScore = calculateColumnScore(player)
  const winners = allPlayers.length > 0 ? determineWinners(allPlayers) : []
  const isWinner = winners.some((winner) => winner.id === player.id)
  const columnScores = getColumnScoreBreakdown(player)
  const completedColumnScores = columnScores.filter(({ points }) => points != null)
  const colorScores = player.completedColors.map((color) => ({
    color,
    points: getColorCompletionPoints(player, color),
  }))
  const finalScore = gameComplete ? calculateFinalScore(player) : null

  const renderScorePanel = (classes: string) => {
    if (!finalScore) {
      return null
    }

    return (
      <div className={cn('flex gap-1 font-medium', classes)}>
        <span className="font-normal">Total :</span>
        <span className="grow" />
        <span>{finalScore.columnsScore}</span>
        <span>+</span>
        <span>{finalScore.colorsScore}</span>
        <span className="text-destructive">-</span>
        <span className="text-destructive">{finalScore.starPenalty}</span>
        <span>+</span>
        <span>{finalScore.jokersScore}</span>
        <span>=</span>
        <span className="font-bold">{finalScore.totalScore}</span>
      </div>
    )
  }

  if (compact) {
    return (
      <Card
        className={cn(
          'transition-all duration-300',
          gameComplete && isWinner && 'ring-2 ring-yellow-500 shadow-glow',
          !gameComplete && isCurrentPlayer && 'ring-2 ring-primary shadow-glow',
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{player.name}</span>
              {!gameComplete && isCurrentPlayer && (
                <Badge variant="default" className="text-[0.65rem]">
                  Actuel
                </Badge>
              )}
            </span>
            {gameComplete && isWinner ? (
              <Trophy className="w-4 h-4 text-yellow-800 fill-yellow-500" />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <div className="flex flex-wrap items-center-safe gap-1 text-xs">
            {completedColumnScores.length > 0 ? (
              <>
                Colonnes (total: {columnsScore} points) :
                {completedColumnScores.map(({ column, points }) => (
                  <Badge key={column} variant="outline">{`${column}: ${points}`}</Badge>
                ))}
              </>
            ) : (
              <span className="text-muted-foreground">Aucune colonne complétée</span>
            )}
          </div>

          <div className="flex flex-wrap items-center-safe gap-1 text-xs">
            {colorScores.length > 0 ? (
              <>
                Couleurs complétées :
                {colorScores.map(({ color, points }) => (
                  <div
                    key={color}
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold',
                      getColorBadgeClasses(color),
                    )}
                  >
                    {points > 0 ? `+${points}` : '0'}
                  </div>
                ))}
              </>
            ) : (
              <span className="text-muted-foreground">Aucune couleur complétée</span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-800 fill-yellow-500" />
              Étoiles :{' '}
              <span className="font-bold">
                {player.starsCollected}/{TOTAL_STARS}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs border rounded-full border-primary">❗</span>
              Jokers :{' '}
              <span className="font-bold">
                {player.jokersRemaining}/{MAX_JOKERS}
              </span>
            </div>
          </div>

          {renderScorePanel('rounded-md bg-muted/70 px-2.5 py-2')}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'transition-all duration-300',
        !gameComplete && isCurrentPlayer && 'ring-2 ring-primary shadow-glow',
        gameComplete && isWinner && 'ring-2 ring-yellow-500 shadow-glow',
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {player.name}
            <Badge
              variant="default"
              className={cn(
                'transition-all duration-300',
                (gameComplete || !isCurrentPlayer) && 'invisible',
              )}
            >
              Actuel
            </Badge>
          </span>
          {gameComplete && isWinner ? (
            <Trophy className="w-5 h-5 text-yellow-800 fill-yellow-500" />
          ) : null}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Colonnes (total: {columnsScore} points) : </p>
          <div className="grid grid-cols-5 gap-0.5">
            {columnScores.map(({ column, points, isFirst }) => (
              <Badge
                key={column}
                variant={points == null ? 'outline' : isFirst ? 'default' : 'secondary'}
              >
                {`${column}: ${points ?? '-'}`}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-row gap-2 items-center mb-2">
          <span className="text-sm font-medium">Couleurs complétées : </span>
          {colorScores.map(({ color, points }) => (
            <div
              key={color}
              className={cn(
                'w-6 h-6 rounded border-2 flex items-center justify-center text-[10px] font-bold',
                getColorBadgeClasses(color),
              )}
            >
              {points > 0 ? `+${points}` : '0'}
            </div>
          ))}
          {Array.from({ length: Math.max(0, 2 - colorScores.length) }, (_, i) => (
            <div key={i} className="w-6 h-6 rounded border-2 bg-muted" />
          ))}
        </div>

        <div>
          <p className="text-sm font-medium mb-2">
            Étoiles collectées ({player.starsCollected}/{TOTAL_STARS}) :{' '}
          </p>
          <div className="flex items-center gap-1">
            {Array.from({ length: TOTAL_STARS }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-4 h-4',
                  i < player.starsCollected ? 'text-yellow-800' : 'text-black',
                  i < player.starsCollected ? 'fill-yellow-500' : 'fill-(--color-muted)',
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-row gap-2 items-baseline mb-2">
          <span className="text-sm font-medium">
            Jokers ({player.jokersRemaining}/{MAX_JOKERS})
          </span>
          <span className="flex font-mono">
            {Array.from({ length: MAX_JOKERS }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'text-xs border rounded-full',
                  i >= MAX_JOKERS - player.jokersRemaining && 'border-primary',
                )}
              >
                {i >= MAX_JOKERS - player.jokersRemaining ? '❗' : '❕'}
              </span>
            ))}
          </span>
        </div>

        {renderScorePanel('text-lg border-t pt-2')}
      </CardContent>
    </Card>
  )
}
