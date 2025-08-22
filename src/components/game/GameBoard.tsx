import { Square, GameColor } from '@/types/game';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface GameBoardProps {
  board: Square[][];
  onSquareClick?: (row: number, col: number) => void;
  selectedSquares?: { row: number; col: number }[];
  previewSquares?: { row: number; col: number }[];
  disabled?: boolean;
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

export const GameBoard = ({ 
  board, 
  onSquareClick, 
  selectedSquares = [], 
  previewSquares = [], 
  disabled = false 
}: GameBoardProps) => {
  const isSquareSelected = (row: number, col: number) =>
    selectedSquares.some(s => s.row === row && s.col === col);
  
  const isSquarePreview = (row: number, col: number) =>
    previewSquares.some(s => s.row === row && s.col === col);

  return (
    <div className="bg-gradient-board rounded-xl p-6 shadow-square">
      {/* Column Headers */}
      <div className="grid grid-cols-15 gap-1 mb-2">
        {COLUMNS.map((col) => (
          <div key={col} className="text-center text-sm font-bold text-muted-foreground">
            {col}
          </div>
        ))}
      </div>

      {/* Game Grid */}
      <div className="space-y-1">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-15 gap-1">
            {row.map((square, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => !disabled && onSquareClick?.(rowIndex, colIndex)}
                disabled={disabled || square.crossed}
                className={cn(
                  "aspect-square rounded-md border-2 relative transition-all duration-200",
                  "hover:scale-105 hover:shadow-md active:scale-95",
                  getColorClass(square.color),
                  square.crossed && "opacity-30 cursor-not-allowed bg-muted",
                  isSquareSelected(rowIndex, colIndex) && "ring-4 ring-ring shadow-glow scale-110",
                  isSquarePreview(rowIndex, colIndex) && "ring-2 ring-primary/50 scale-105",
                  !disabled && !square.crossed && "cursor-pointer"
                )}
              >
                {square.hasStar && (
                  <Star 
                    className={cn(
                      "absolute inset-0 m-auto w-4 h-4",
                      square.crossed ? "text-muted-foreground" : "text-white drop-shadow-md"
                    )} 
                    fill="currentColor"
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
      <div className="grid grid-cols-15 gap-1 mt-4">
        {[4, 7, 1, 3, 8, 2, 5, 10, 5, 2, 8, 3, 1, 7, 4].map((points, index) => (
          <div key={index} className="text-center text-xs font-semibold text-primary bg-secondary rounded px-1 py-0.5">
            {points}
          </div>
        ))}
      </div>
    </div>
  );
};