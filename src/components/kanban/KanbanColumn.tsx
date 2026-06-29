import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { STAGE_COLORS, STAGE_LABELS } from '@/lib/constants'
import { KanbanCard } from './KanbanCard'
import type { Application, PipelineStage } from '@/types'

interface KanbanColumnProps {
  stage: PipelineStage
  apps: Application[]
}

export function KanbanColumn({ stage, apps }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { type: 'column', stage } })
  const colors = STAGE_COLORS[stage]

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className={cn('flex items-center justify-between px-3 py-2 rounded-t-lg border border-b-0', colors.bg, colors.border)}>
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', colors.dot)} />
          <span className={cn('text-xs font-semibold tracking-wide uppercase', colors.text)}>
            {STAGE_LABELS[stage]}
          </span>
        </div>
        <span className={cn('text-xs font-medium rounded-full px-1.5 py-0.5', colors.bg, colors.text)}>
          {apps.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 p-2 rounded-b-lg border min-h-[120px] transition-colors',
          isOver ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border'
        )}
      >
        <SortableContext items={apps.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {apps.map(app => <KanbanCard key={app.id} app={app} />)}
        </SortableContext>
        {apps.length === 0 && (
          <div className={cn('flex-1 flex items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground py-4', isOver && 'border-primary/50')}>
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}
