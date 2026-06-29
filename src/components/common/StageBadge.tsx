import { cn } from '@/lib/utils'
import { STAGE_COLORS, STAGE_LABELS } from '@/lib/constants'
import type { PipelineStage } from '@/types'

export function StageBadge({ stage, className }: { stage: PipelineStage; className?: string }) {
  const colors = STAGE_COLORS[stage]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', colors.bg, colors.text, colors.border, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
      {STAGE_LABELS[stage]}
    </span>
  )
}
