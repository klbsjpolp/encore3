import { Player } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import {COLUMN_FIRST_PLAYER_POINTS, COLUMN_SECOND_PLAYER_POINTS, TOTAL_STARS} from "@/hooks/useEncoreGame.ts";

interface ScorePanelProps {
  player: Player;
  isCurrentPlayer?: boolean;
  gameComplete?: boolean;
  claimedFirstColumnBonus: Record<string, string>;
}

export const ScorePanel = ({ player, isCurrentPlayer = false, gameComplete = false, claimedFirstColumnBonus = {} }: ScorePanelProps) => {

  const calculateColorScore = () => {
    // This would need to be calculated based on first completion logic
    return player.completedColors.length * 5; // Simplified for now
  };

  const calculateStarPenalty = () => {
    return (TOTAL_STARS - player.starsCollected) * -1;
  };

  const finalScore = player.score + calculateStarPenalty();

  return (
    <Card className={cn(
      "transition-all duration-300",
      isCurrentPlayer && "ring-2 ring-primary shadow-glow"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {player.name}
            {isCurrentPlayer && <Badge variant="default">Actuel</Badge>}
          </span>
          {gameComplete && player.score === Math.max(...[player.score]) && (
            <Trophy className="w-5 h-5 text-yellow-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Completed Columns */}
        <div>
          <p className="text-sm font-medium mb-2">Colonnes</p>
          <div className="grid grid-cols-8 gap-1">
            {COLUMN_FIRST_PLAYER_POINTS.map((points, index) => {
              const column = String.fromCharCode(65 + index);
              const isCompletedByPlayer = player.completedColumnsFirst.includes(column) || player.completedColumnsNotFirst.includes(column);
              const firstBonusClaimedBy = claimedFirstColumnBonus[column];
              const didPlayerClaimFirstBonus = isCompletedByPlayer && firstBonusClaimedBy === player.id;

              return (
                <div key={column} className={cn(
                  "text-center border rounded-md p-1",
                  isCompletedByPlayer ? 'bg-primary/20' : 'bg-muted/50'
                )}>
                  <div className="font-bold text-xs">{column}</div>
                  <div className={cn(
                    "text-xs",
                    !!firstBonusClaimedBy && !didPlayerClaimFirstBonus && "line-through text-muted-foreground",
                    didPlayerClaimFirstBonus && "font-bold text-primary"
                  )}>{points}</div>
                  <div className={cn(
                    "text-xs",
                    isCompletedByPlayer && !didPlayerClaimFirstBonus && "font-bold text-primary"
                  )}>{COLUMN_SECOND_PLAYER_POINTS[index]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completed Colors */}
        <div>
          <p className="text-sm font-medium mb-2">Couleurs complétées</p>
          <div className="flex flex-wrap gap-1">
            {player.completedColors.map(color => (
              <div
                key={color}
                className={cn(
                  "w-6 h-6 rounded border-2",
                  color === 'yellow' && "bg-game-yellow border-yellow-600",
                  color === 'green' && "bg-game-green border-green-700",
                  color === 'blue' && "bg-game-blue border-blue-700",
                  color === 'red' && "bg-game-red border-red-700",
                  color === 'orange' && "bg-game-orange border-orange-700",
                  color === 'purple' && "bg-game-purple border-purple-700"
                )}
              />
            ))}
          </div>
        </div>

        {/* Stars Collected */}
        <div>
          <p className="text-sm font-medium mb-2">Étoiles collectées</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: TOTAL_STARS }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-4 h-4",
                  i < player.starsCollected ? "text-yellow-500" : "text-muted"
                )}
                fill="currentColor"
              />
            ))}
          </div>
        </div>

        {/* Jokers */}
        <div>
          <p className="text-sm font-medium mb-2">Jokers</p>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: 8 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    i >= (8-player.jokersRemaining) ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        {gameComplete && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span>Couleurs :</span>
              <span>+{calculateColorScore()}</span>
            </div>
            <div className="flex justify-between text-sm text-destructive">
              <span>Pénalité d'étoile :</span>
              <span>{calculateStarPenalty()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total :</span>
              <span>{finalScore}</span>
            </div>
          </div>
        )}

        {/* Current Score (during game) */}
        {!gameComplete && (
          <div className="bg-muted rounded-lg p-3">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Score actuel</p>
              <p className="text-2xl font-bold">{player.score}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};