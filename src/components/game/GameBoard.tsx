import { Star } from 'lucide-react'

import type { BoardConfiguration } from '@/data/boardConfigurations'
import { COLUMN_FIRST_PLAYER_POINTS, COLUMN_SECOND_PLAYER_POINTS } from '@/hooks/useEncoreGame'
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

const COLOR_NAMES: Record<GameColor, string> = {
  yellow: 'jaune',
  green: 'verte',
  blue: 'bleue',
  red: 'rouge',
  orange: 'orange',
}

const getSquareLabel = (square: Square, rowIndex: number, colIndex: number): string =>
  `Case ${COLUMNS[colIndex]}${rowIndex + 1}, ${COLOR_NAMES[square.color]}${
    square.hasStar ? ', étoile' : ''
  }${square.crossed ? ', cochée' : ''}`

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
}

function ColumnPoint({ index, isClaimedByMe, isClaimedByOther, display }: ColumnPointProps) {
  return (
    <div
      className={cn(
        'relative aspect-square bg-secondary flex items-center justify-center text-[3cqw] font-semibold rounded-[1cqw]',
        isClaimedByMe &&
          'bg-yellow-400 before:w-10/12 before:h-10/12 before:absolute before:border before:border-black before:rounded-full',
        isStartingColumn(index) && 'text-destructive font-black',
        isClaimedByOther && 'bg-secondary/80',
      )}
    >
      {isClaimedByOther && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full bg-muted-foreground/50 transform rotate-45 h-[0.33cqw]" />
          <div className="w-full bg-muted-foreground/50 transform -rotate-45 absolute h-[0.33cqw]" />
        </div>
      )}
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
        // Own container so the proportional `cqw` sizing below scales with the
        // board's own width. This keeps the small "other" board an exact scaled
        // copy of the large board, so the player-switch swap is one continuous
        // scale with no layout jump on arrival.
        compact ? 'rounded-md p-1' : '@container rounded-[2cqw] p-[2.67cqw]',
        boardConfiguration?.fillClass,
      )}
      onMouseLeave={() => !disabled && onSquareLeave?.()}
    >
      <div className={cn('grid grid-cols-15', compact ? 'gap-px' : 'gap-[0.67cqw]')}>
        {COLUMNS.map((col, colIndex) => (
          <ColumnPoint
            key={col}
            index={colIndex}
            isClaimedByMe={false}
            isClaimedByOther={false}
            display={col}
          />
        ))}
      </div>

      <div
        className={cn(compact ? 'space-y-0 mt-px mb-px' : 'space-y-[0.67cqw] mt-[2cqw] mb-[2cqw]')}
      >
        {board.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={cn('grid grid-cols-15', compact ? 'gap-0' : 'gap-[0.67cqw]')}
          >
            {row.map((square, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => !disabled && onSquareClick?.(rowIndex, colIndex)}
                onMouseEnter={() => !disabled && onSquareHover?.(rowIndex, colIndex)}
                disabled={disabled || square.crossed}
                aria-label={getSquareLabel(square, rowIndex, colIndex)}
                aria-pressed={isSquareSelected(rowIndex, colIndex)}
                className={cn(
                  // Animate only interaction affordances (selection/hover), not
                  // the fill colour: otherwise every cell cross-fades its colour
                  // when the board content swaps on a player switch, which reads
                  // as a shimmer/flicker.
                  'aspect-square relative transition-[transform,box-shadow,border-color,outline-color] duration-200',
                  compact ? 'rounded-[3px] border' : 'rounded-[1cqw] border-[0.33cqw]',
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
                      : 'outline-solid outline-[0.33cqw] outline-border'
                    : '',
                  !disabled && !square.crossed && 'cursor-pointer',
                )}
              >
                {square.hasStar ? (
                  <Star
                    fill="white"
                    className={cn(
                      'absolute inset-0 m-auto w-full h-full max-h-[4cqw] max-w-[4cqw]',
                      square.crossed ? 'text-muted-foreground' : 'text-black drop-shadow-md',
                    )}
                  />
                ) : (
                  <div className="absolute opacity-25 bg-white rounded-full inset-[0.08cqw] w-11/12 h-11/12" />
                )}
                {square.crossed && (
                  <>
                    <div className="absolute w-full bg-foreground transform rotate-45 h-[0.33cqw]" />
                    <div className="absolute w-full bg-foreground transform -rotate-45 h-[0.33cqw]" />
                  </>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {showColumnScores && (
        <div className={cn('grid grid-cols-15', compact ? 'gap-px' : 'gap-[0.67cqw]')}>
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
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
