import { cn } from '@/lib/utils'

const getColorBadgeClasses = (color: string) =>
  cn(
    color === 'yellow' && 'bg-game-yellow border-yellow-600 text-black',
    color === 'green' && 'bg-game-green border-green-700 text-white',
    color === 'blue' && 'bg-game-blue border-blue-700 text-white',
    color === 'red' && 'bg-game-red border-red-700 text-white',
    color === 'orange' && 'bg-game-orange border-orange-700 text-black',
  )

export function CompletedColorBadge(props: { color: string; points: number }) {
  return (
    <div
      className={cn(
        'w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold',
        getColorBadgeClasses(props.color),
      )}
    >
      {props.points ? `+${props.points}` : ''}
    </div>
  )
}
