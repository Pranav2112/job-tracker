import { cn } from '@/lib/utils'
import { PRIORITY_COLORS } from '@/lib/constants'
import type { PriorityLevel } from '@/types'

export function PriorityBadge({ priority, className }: { priority: PriorityLevel; className?: string }) {
  const colors = PRIORITY_COLORS[priority]
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', colors.bg, colors.text, className)}>
      {priority}
    </span>
  )
}
