import { Square, GameColor } from '@/types/game';
import { cn } from '@/lib/utils';
import {Star, StarOffIcon} from 'lucide-react';
import {BOARD_CONFIGURATIONS, BoardConfiguration} from "@/data/boardConfigurations.ts";
import {useMemo} from "react";

interface BoardPreviewProps {
  size: 'small' | 'large';
  board: BoardConfiguration;
}

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

export const BoardPreview = ({ size, board }: BoardPreviewProps) => {
  // Generate preview boards for setup
  const previewBoard = useMemo(() => {
      const previewBoard: Square[][] = [];
      for (let row = 0; row < board.colorLayout.length; row++) {
        const boardRow: Square[] = [];
        for (let col = 0; col < board.colorLayout[0].length; col++) {
          boardRow.push({
            color: board.colorLayout[row][col],
            hasStar: board.starPositions.has(`${row},${col}`),
            crossed: false,
            column: String.fromCharCode(65 + col),
            row
          });
        }
        previewBoard.push(boardRow);
      }
      return previewBoard;
  }, [board]);

  const squareSize = size === 'small' ? 'w-1 h-1' : 'w-2 h-2';
  const gap = 'gap-0';
  const starSize = size === 'small' ? 'w-0.75 h-0.75' : 'w-1 h-1';

  return (
    <div className={cn(size === 'small' ? "p-1" : 'p-2', board.fillClass)}>
      <div className={cn("flex flex-col", gap)}>
        {previewBoard.map((row, rowIndex) => (
          <div key={rowIndex} className={cn("flex", gap)}>
            {row.map((square, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cn(
                  "border relative",
                  squareSize,
                  getColorClass(square.color)
                )}
              >
                {square.hasStar && (
                  <Star fill="white" className={cn("absolute inset-0 m-auto text-white", starSize)} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
