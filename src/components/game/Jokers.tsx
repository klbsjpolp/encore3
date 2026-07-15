import { MAX_JOKERS } from '@/hooks/encore-game/scoring.ts'
import { cn } from '@/lib/utils.ts'

interface JokersProps {
  jokersRemaining: number
  size?: 'xs' | 'sm'
}

export const Jokers = ({ jokersRemaining, size = 'sm' }: JokersProps) => (
  <div className="flex flex-row gap-2 items-baseline mb-2">
    <span
      className={cn(size === 'sm' && 'text-sm font-medium', size === 'xs' && 'text-xs font-normal')}
    >
      Jokers (
      <span className={cn(size === 'xs' ? '' : 'font-bold')}>
        {jokersRemaining}/{MAX_JOKERS}
      </span>
      )
    </span>
    <span className="flex font-mono">
      {Array.from({ length: MAX_JOKERS }, (_, i) => (
        <span
          key={i}
          className={cn(
            'border rounded-full',
            size === 'xs' ? 'text-2xs' : 'text-xs',
            i >= MAX_JOKERS - jokersRemaining && 'border-primary',
          )}
        >
          {i >= MAX_JOKERS - jokersRemaining ? '❗' : '❕'}
        </span>
      ))}
    </span>
  </div>
)
