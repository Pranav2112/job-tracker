import { AlertTriangle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { needsAttention } from '@/lib/utils'
import type { Application } from '@/types'

export function AttentionFlag({ app }: { app: Application }) {
  const { flag, reason } = needsAttention(app)
  if (!flag) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex text-amber-500 cursor-default">
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}
