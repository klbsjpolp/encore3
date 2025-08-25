import { Square, GameColor } from '@/types/game';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import {COLUMN_FIRST_PLAYER_POINTS, COLUMN_SECOND_PLAYER_POINTS} from "@/hooks/useEncoreGame.ts";

interface GameBoardProps {
  board: Square[][];
  onSquareClick?: (row: number, col: number) => void;
  onSquareHover?: (row: number, col: number) => void;
  onSquareLeave?: () => void;
  selectedSquares?: { row: number; col: number }[];
  hoveredSquares?: { row: number; col: number }[];
  previewSquares?: { row: number; col: number }[];
  disabled?: boolean;
  firstBonusClaimed: string[];
  iClaimedFirstBonus: string[];
  iClaimedSecondBonus: string[];
}

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

const getColorClass = (color: GameColor): string => {
  const colorMap = {
    yellow: 'bg-game-yellow border-yellow-600',
    green: 'bg-game-green border-green-700',
    blue: 'bg-game-blue border-blue-700',
    red: 'bg-game-red border-red-700',
    orange: 'bg-game-orange border-orange-700',
    purple: 'bg-game-purple border-purple-700',
  };
  return colorMap[color];
};

function isStartingColumn(colIndex: number) {
  return colIndex === 7;
}

export const GameBoard = ({ 
  board, 
  onSquareClick, 
  onSquareHover,
  onSquareLeave,
  selectedSquares = [], 
  hoveredSquares = [],
  previewSquares = [], 
  disabled = false,
  firstBonusClaimed,
  iClaimedFirstBonus,
  iClaimedSecondBonus,
}: GameBoardProps) => {
  const isSquareSelected = (row: number, col: number) =>
    selectedSquares.some(s => s.row === row && s.col === col);
  
  const isSquareHovered = (row: number, col: number) =>
    hoveredSquares.some(s => s.row === row && s.col === col);

  const isSquarePreview = (row: number, col: number) =>
    previewSquares.some(s => s.row === row && s.col === col);

  return (
    <div className="bg-gradient-board rounded-sm @lg:rounded-xl p-2 @lg:p-6 shadow-square" onMouseLeave={() => !disabled && onSquareLeave?.()}>
      {/* Column Headers */}
      <div className="grid grid-cols-15 gap-1">
        {COLUMNS.map((col, colIndex) => (
          <div key={col} className="aspect-square rounded-xs @lg:rounded-md bg-secondary flex items-center justify-center">
            <span className={cn(
              "text-xs font-semibold text-primary",
              isStartingColumn(colIndex) && "text-destructive font-black",
            )}>
              {col}
            </span>
          </div>
        ))}
      </div>

      {/* Game Grid */}
      <div className="space-y-1 mt-1 @lg:mt-3 mb-1 @lg:mb-3">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-15 gap-0.5 @lg:gap-1">
            {row.map((square, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => !disabled && onSquareClick?.(rowIndex, colIndex)}
                onMouseEnter={() => !disabled && onSquareHover?.(rowIndex, colIndex)}
                disabled={disabled || square.crossed}
                className={cn(
                  "aspect-square rounded-xs @lg:rounded-md relative transition-all duration-200 border-1 @lg:border-2",
                  getColorClass(square.color),
                  square.crossed && "opacity-30 cursor-not-allowed",
                  isSquareSelected(rowIndex, colIndex) && "ring-4 ring-ring shadow-glow scale-110",
                  isSquareHovered(rowIndex, colIndex) && "scale-105 shadow-md",
                  isSquarePreview(rowIndex, colIndex) && "ring-2 ring-primary/50 scale-105",
                  isStartingColumn(colIndex) ? 'outline-solid outline-2 outline-border' : '',
                  !disabled && !square.crossed && "cursor-pointer"
                )}
              >
                {square.hasStar && (
                  <Star
                    className={cn(
                      "absolute inset-0 m-auto w-full h-full max-h-6 max-w-6",
                      square.crossed ? "text-muted-foreground" : "text-white drop-shadow-md"
                    )}
                  />
                )}
                {square.crossed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-foreground transform rotate-45" />
                    <div className="w-full h-0.5 bg-foreground transform -rotate-45 absolute" />
                  </div>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Column Point Values */}
      <div className="grid grid-cols-15 gap-1">
        {COLUMN_FIRST_PLAYER_POINTS.map((points, index) => {
          const isClaimedByMe = iClaimedFirstBonus.includes(COLUMNS[index]);
          const isClaimedByOther = firstBonusClaimed.includes(COLUMNS[index]) && !isClaimedByMe;
          return (
            <div key={index} className={cn(
              "aspect-square rounded-xs @lg:rounded-md bg-secondary flex items-center justify-center",
              isClaimedByMe && "ring-2 ring-yellow-400",
            )}>
              <span className={cn(
                "text-xs font-semibold text-primary",
                isStartingColumn(index) && "text-destructive font-black",
                isClaimedByOther && "line-through text-muted-foreground",
              )}>
                {points}
              </span>
            </div>
          )
        })}
        {COLUMN_SECOND_PLAYER_POINTS.map((points, index) => {
          const isClaimedByMe = iClaimedSecondBonus.includes(COLUMNS[index]);
          return (
            <div key={index} className={cn(
              "aspect-square rounded-md bg-secondary flex items-center justify-center",
              isClaimedByMe && "ring-2 ring-yellow-400",
            )}>
              <span className={cn(
                "text-xs font-semibold text-primary",
                isStartingColumn(index) && "text-destructive font-black",
              )}>
                {points}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  );
};
