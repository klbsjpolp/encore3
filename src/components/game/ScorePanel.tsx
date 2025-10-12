import { Player } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import {COLUMN_FIRST_PLAYER_POINTS, COLUMN_SECOND_PLAYER_POINTS, TOTAL_STARS} from "@/hooks/useEncoreGame.ts";
import {ReactNode} from "react";

interface ScorePanelProps {
  player: Player;
  isCurrentPlayer?: boolean;
  gameComplete?: boolean;
  claimedFirstColumnBonus: Record<string, string>;
}

export const ScorePanel = ({ player, isCurrentPlayer = false, gameComplete = false, claimedFirstColumnBonus = {} }: ScorePanelProps) => {
  const columnsScore = Array.from('ABCDEFGHIJKLMNO').map((c,i) => {
      const firstPoints = player.completedColumnsFirst.includes(c) ? COLUMN_FIRST_PLAYER_POINTS[i] : null;
      const secondPoints = firstPoints == null && player.completedColumnsNotFirst.includes(c) ? COLUMN_SECOND_PLAYER_POINTS[i] : null;
      return firstPoints ?? secondPoints ?? 0;
    }).reduce((a, b) => a + b, 0);

  let scorePanel: ReactNode;
  if (gameComplete) {
    const jokersRemaining = player.jokersRemaining;
    // This would need to be calculated based on first completion logic
    const colorScore = player.completedColors.length * 5; // Simplified for now
    const starPenalty = TOTAL_STARS - player.starsCollected;
    const finalScore = columnsScore + jokersRemaining + colorScore - starPenalty;
    scorePanel = (
      <div className="space-y-2 pt-2 border-t">
        <div className="flex justify-between text-sm">
          <span>Colonnes :</span>
          <span>{columnsScore}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Joker :</span>
          <span>+{jokersRemaining}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Couleurs :</span>
          <span>+{colorScore}</span>
        </div>
        <div className="flex justify-between text-sm text-destructive">
          <span>Pénalité d'étoile :</span>
          <span>-{starPenalty}</span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span>Total :</span>
          <span>{finalScore}</span>
        </div>
      </div>
    );
  } else
    scorePanel = (
      <div className="bg-muted rounded-lg p-3">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Score des colonnes</p>
          <p className="text-2xl font-bold">{columnsScore}</p>
        </div>
      </div>
    );

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
          <div className="grid grid-cols-5 gap-0.5">
            {Array.from('ABCDEFGHIJKLMNO').map((c,i) => {
              const firstPoints = player.completedColumnsFirst.includes(c) ? COLUMN_FIRST_PLAYER_POINTS[i] : null;
              const secondPoints = firstPoints == null && player.completedColumnsNotFirst.includes(c) ? COLUMN_SECOND_PLAYER_POINTS[i] : null;
              return <Badge key={c} variant={firstPoints == null ? secondPoints == null ? 'outline' : 'secondary' : 'default'}>
                {`${c}: ${firstPoints ?? secondPoints ?? '-'}`}
              </Badge>
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
                  "w-6 h-6 rounded border-2 flex items-center justify-center text-[10px] font-bold",
                  color === 'yellow' && "bg-game-yellow border-yellow-600 text-black",
                  color === 'green' && "bg-game-green border-green-700 text-white",
                  color === 'blue' && "bg-game-blue border-blue-700 text-white",
                  color === 'red' && "bg-game-red border-red-700 text-white",
                  color === 'orange' && "bg-game-orange border-orange-700 text-black",
                  color === 'purple' && "bg-game-purple border-purple-700 text-white"
                )}
              >
                +5
              </div>
            ))}
            {Array.from({ length: 2-player.completedColors.length }, (_, i) =>
              <div
                key={i}
                className="w-6 h-6 rounded border-2 bg-muted"
              />
            )}
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
        {scorePanel}
      </CardContent>
    </Card>
  );
};