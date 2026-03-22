import { Star } from 'lucide-react'

import type { BoardConfiguration } from '@/data/boardConfigurations.ts'
import { COLUMN_FIRST_PLAYER_POINTS, COLUMN_SECOND_PLAYER_POINTS } from '@/hooks/useEncoreGame.ts'
import { cn } from '@/lib/utils'
import type { GameColor, Square } from '@/types/game'

interface GameBoardProps {
  board: Square[][]
  onSquareClick?: (row: number, col: number) => void
  onSquareHover?: (row: number, col: number) => void
  onSquareLeave?: () => void
  selectedSquares?: { row: number; col: number }[]
  hoveredSquares?: { row: number; col: number }[]
  previewSquares?: { row: number; col: number }[]
  disabled?: boolean
  firstBonusClaimed: string[]
  iClaimedFirstBonus: string[]
  iClaimedSecondBonus: string[]
  compact?: boolean
  showColumnScores?: boolean
  boardConfiguration?: BoardConfiguration | undefined
}

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']

const getColorClass = (color: GameColor): string => {
  const colorMap = {
    yellow: 'bg-game-yellow border-yellow-800',
    green: 'bg-game-green border-green-900',
    blue: 'bg-game-blue border-blue-900',
    red: 'bg-game-red border-red-900',
    orange: 'bg-game-orange border-orange-900',
    purple: 'bg-game-purple border-purple-900',
  }
  return colorMap[color]
}

function isStartingColumn(colIndex: number) {
  return colIndex === 7
}

interface ColumnPointProps {
  index: number
  isClaimedByMe: boolean
  isClaimedByOther: boolean
  display: string | number
  compact?: boolean
}

function ColumnPoint({
  index,
  isClaimedByMe,
  isClaimedByOther,
  display,
  compact = false,
}: ColumnPointProps) {
  return (
    <div
      className={cn(
        'aspect-square bg-secondary flex items-center justify-center',
        compact ? 'rounded-[3px]' : 'rounded-xs @lg:rounded-md',
        isClaimedByMe && 'ring-2 @lg:ring-3 ring-yellow-400',
        compact ? 'text-[0.45rem] font-semibold' : 'text-xs @lg:text-lg font-semibold',
        isStartingColumn(index) && 'text-destructive font-black',
        isClaimedByOther && 'line-through text-muted-foreground bg-secondary/80',
      )}
    >
      {display}
    </div>
  )
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
  compact = false,
  showColumnScores = true,
  boardConfiguration,
}: GameBoardProps) => {
  const isSquareSelected = (row: number, col: number) =>
    selectedSquares.some((s) => s.row === row && s.col === col)

  const isSquareHovered = (row: number, col: number) =>
    hoveredSquares.some((s) => s.row === row && s.col === col)

  const isSquarePreview = (row: number, col: number) =>
    previewSquares.some((s) => s.row === row && s.col === col)

  return (
    <div
      className={cn(
        'shadow-square',
        compact ? 'rounded-md p-1' : 'rounded-sm @lg:rounded-xl p-2 @lg:p-4',
        boardConfiguration?.fillClass,
      )}
      onMouseLeave={() => !disabled && onSquareLeave?.()}
    >
      <div className={cn('grid grid-cols-15', compact ? 'gap-px' : 'gap-1')}>
        {COLUMNS.map((col, colIndex) => (
          <ColumnPoint
            key={col}
            index={colIndex}
            isClaimedByMe={false}
            isClaimedByOther={false}
            display={col}
            compact={compact}
          />
        ))}
      </div>

      <div
        className={cn(compact ? 'space-y-0 mt-px mb-px' : 'space-y-1 mt-1 @lg:mt-3 mb-1 @lg:mb-3')}
      >
        {board.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={cn('grid grid-cols-15', compact ? 'gap-0' : 'gap-0.5 @lg:gap-1')}
          >
            {row.map((square, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => !disabled && onSquareClick?.(rowIndex, colIndex)}
                onMouseEnter={() => !disabled && onSquareHover?.(rowIndex, colIndex)}
                disabled={disabled || square.crossed}
                className={cn(
                  'aspect-square relative transition-all duration-200',
                  compact
                    ? 'rounded-[3px] border'
                    : 'rounded-[3px] @lg:rounded-md border-1 @lg:border-2',
                  getColorClass(square.color),
                  square.crossed && 'opacity-30 cursor-not-allowed',
                  isSquareSelected(rowIndex, colIndex) &&
                    (compact
                      ? 'z-20 border-white ring-2 ring-ring outline-solid outline-2 outline-slate-900 scale-[1.04]'
                      : 'border-white ring-4 ring-ring shadow-glow outline-solid outline-2 outline-slate-900 scale-110'),
                  isSquareHovered(rowIndex, colIndex) &&
                    (compact ? 'z-10 ring-1 ring-primary/70' : 'scale-105 shadow-md'),
                  isSquarePreview(rowIndex, colIndex) &&
                    (compact ? 'ring-2 ring-primary/70' : 'ring-2 ring-primary/50 scale-105'),
                  isStartingColumn(colIndex) && !isSquareSelected(rowIndex, colIndex)
                    ? compact
                      ? 'outline-solid outline-1 outline-border'
                      : 'outline-solid outline-1 @lg:outline-2 outline-border'
                    : '',
                  !disabled && !square.crossed && 'cursor-pointer',
                )}
              >
                {square.hasStar ? (
                  <Star
                    fill="white"
                    className={cn(
                      compact
                        ? 'absolute inset-0 m-auto w-full h-full max-h-3 max-w-3'
                        : 'absolute inset-0 m-auto w-full h-full max-h-6 max-w-6',
                      square.crossed ? 'text-muted-foreground' : 'text-black drop-shadow-md',
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      'absolute opacity-25 bg-white rounded-full',
                      compact ? 'inset-[1px]' : 'inset-[0.5px] @lg:inset-0.25 w-11/12 h-11/12',
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

      {showColumnScores && (
        <div className={cn('grid grid-cols-15', compact ? 'gap-px' : 'gap-1')}>
          {COLUMN_FIRST_PLAYER_POINTS.map((points, index) => {
            const isClaimedByMe = iClaimedFirstBonus.includes(COLUMNS[index])
            const isClaimedByOther = firstBonusClaimed.includes(COLUMNS[index]) && !isClaimedByMe
            return (
              <ColumnPoint
                index={index}
                key={index}
                isClaimedByMe={isClaimedByMe}
                isClaimedByOther={isClaimedByOther}
                display={points}
                compact={compact}
              />
            )
          })}
          {COLUMN_SECOND_PLAYER_POINTS.map((points, index) => {
            const isClaimedByMe = iClaimedSecondBonus.includes(COLUMNS[index])
            return (
              <ColumnPoint
                index={index}
                key={index}
                isClaimedByMe={isClaimedByMe}
                isClaimedByOther={false}
                display={points}
                compact={compact}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
