import { useEffect, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { STAGE_COLORS, STAGE_LABELS } from '@/lib/constants'
import { animateListIn } from '@/lib/animations'
import { KanbanCard } from './KanbanCard'
import type { Application, PipelineStage } from '@/types'

interface KanbanColumnProps {
  stage: PipelineStage
  apps: Application[]
  interviewMap?: Map<string, { scheduled_at: string; round_type: string }>
}

export function KanbanColumn({ stage, apps, interviewMap }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { type: 'column', stage } })
  const colors = STAGE_COLORS[stage]
  const listRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(apps.length)

  useEffect(() => {
    if (listRef.current && apps.length > prevCount.current) {
      animateListIn('.kanban-card', listRef.current)
    }
    prevCount.current = apps.length
  }, [apps.length])

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0',
        colors.bg, colors.border
      )}>
        <div className="flex items-center gap-2">
          <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
          <span className={cn('text-[11px] font-bold tracking-wider uppercase', colors.text)}>
            {STAGE_LABELS[stage]}
          </span>
        </div>
        <span className={cn(
          'text-[10px] font-bold rounded-full px-2 py-0.5 min-w-[1.4rem] text-center',
          apps.length > 0 ? `${colors.bg} ${colors.text}` : 'text-muted-foreground bg-muted/40'
        )}>
          {apps.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={node => { setNodeRef(node); (listRef as React.MutableRefObject<HTMLDivElement | null>).current = node }}
        className={cn(
          'flex flex-col gap-2 p-2 rounded-b-xl border min-h-[120px] transition-all duration-200',
          isOver ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20' : 'bg-muted/20 border-border'
        )}
      >
        <SortableContext items={apps.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {apps.map(app => (
            <div key={app.id} className="kanban-card">
              <KanbanCard app={app} nextInterview={interviewMap?.get(app.id) ?? null} />
            </div>
          ))}
        </SortableContext>
        {apps.length === 0 && (
          <div className={cn(
            'flex-1 flex items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground py-5 transition-colors',
            isOver && 'border-primary/50 text-primary/60 bg-primary/3'
          )}>
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}
