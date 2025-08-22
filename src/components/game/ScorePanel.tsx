import { Player, GameColor } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScorePanelProps {
  player: Player;
  isCurrentPlayer?: boolean;
  gameComplete?: boolean;
}

const COLOR_POINTS = {
  yellow: { first: 20, later: 10 },
  green: { first: 20, later: 10 },
  blue: { first: 20, later: 10 },
  red: { first: 20, later: 10 },
  orange: { first: 20, later: 10 },
  purple: { first: 20, later: 10 },
};

const COLUMN_POINTS = [4, 7, 1, 3, 8, 2, 5, 10, 5, 2, 8, 3, 1, 7, 4];
const TOTAL_STARS = 15;

export const ScorePanel = ({ player, isCurrentPlayer = false, gameComplete = false }: ScorePanelProps) => {
  const calculateColumnScore = () => {
    let total = 0;
    for (let col = 0; col < 15; col++) {
      const columnComplete = player.board.every(row => row[col].crossed);
      if (columnComplete) {
        total += COLUMN_POINTS[col];
      }
    }
    return total;
  };

  const calculateColorScore = () => {
    // This would need to be calculated based on first completion logic
    return player.completedColors.length * 15; // Simplified for now
  };

  const calculateStarPenalty = () => {
    return (TOTAL_STARS - player.starsCollected) * 2;
  };

  const totalScore = calculateColumnScore() + calculateColorScore() - calculateStarPenalty();

  return (
    <Card className={cn(
      "transition-all duration-300",
      isCurrentPlayer && "ring-2 ring-primary shadow-glow"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {player.name}
            {isCurrentPlayer && <Badge variant="default">Current</Badge>}
          </span>
          {gameComplete && player.score === Math.max(...[player.score]) && (
            <Trophy className="w-5 h-5 text-yellow-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Completed Colors */}
        <div>
          <p className="text-sm font-medium mb-2">Completed Colors</p>
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
          <p className="text-sm font-medium mb-2">Stars Collected</p>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
            <span className="font-bold">{player.starsCollected} / {TOTAL_STARS}</span>
          </div>
        </div>

        {/* Score Breakdown */}
        {gameComplete && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span>Columns:</span>
              <span>+{calculateColumnScore()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Colors:</span>
              <span>+{calculateColorScore()}</span>
            </div>
            <div className="flex justify-between text-sm text-destructive">
              <span>Star Penalty:</span>
              <span>-{calculateStarPenalty()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>{totalScore}</span>
            </div>
          </div>
        )}

        {/* Current Score (during game) */}
        {!gameComplete && (
          <div className="bg-muted rounded-lg p-3">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current Score</p>
              <p className="text-2xl font-bold">{player.score}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};