import { APP_VERSION } from '@/lib/appVersion'
import { cn } from '@/lib/utils'

interface AppVersionProps {
  className?: string
}

export const AppVersion = ({ className }: AppVersionProps) => (
  <span className={cn('text-xs text-muted-foreground', className)}>{APP_VERSION}</span>
)
