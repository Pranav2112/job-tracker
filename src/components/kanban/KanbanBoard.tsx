import { useState } from 'react'
import {
  DndContext, DragOverlay, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { PIPELINE_STAGES } from '@/lib/constants'
import { useUpdateStage } from '@/hooks/useApplications'
import type { Application, PipelineStage } from '@/types'

interface KanbanBoardProps {
  applications: Application[]
}

export function KanbanBoard({ applications }: KanbanBoardProps) {
  const [activeApp, setActiveApp] = useState<Application | null>(null)
  const updateStage = useUpdateStage()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragStart(event: DragStartEvent) {
    const app = applications.find(a => a.id === event.active.id)
    setActiveApp(app ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveApp(null)
    if (!over) return

    const draggedApp = applications.find(a => a.id === active.id)
    if (!draggedApp) return

    // over.id is either a column id (stage) or another card's id
    const targetStage = (PIPELINE_STAGES.includes(over.id as PipelineStage)
      ? over.id
      : over.data.current?.app?.stage ?? over.data.current?.stage
    ) as PipelineStage | undefined

    if (!targetStage || targetStage === draggedApp.stage) return

    updateStage.mutate({ id: draggedApp.id, stage: targetStage, prevStage: draggedApp.stage })
  }

  const byStage = (stage: PipelineStage) => applications.filter(a => a.stage === stage)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full pb-4 overflow-x-auto px-6">
        {PIPELINE_STAGES.map(stage => (
          <KanbanColumn key={stage} stage={stage} apps={byStage(stage)} />
        ))}
      </div>

      <DragOverlay>
        {activeApp && (
          <div className="rotate-2 opacity-95">
            <KanbanCard app={activeApp} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
