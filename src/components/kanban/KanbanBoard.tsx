import { useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
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
import { useUpcomingInterviews } from '@/hooks/useDetailData'
import { useUpdateStreak } from '@/hooks/useGamification'
import type { Application, PipelineStage } from '@/types'

interface KanbanBoardProps {
  applications: Application[]
}

function fireConfetti(stage: PipelineStage) {
  if (stage === 'Accepted') {
    const colors = ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f472b6', '#a3e635']
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors })
    setTimeout(() => confetti({ particleCount: 60, angle: 60,  spread: 55, origin: { x: 0, y: 0.65 }, colors }), 250)
    setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors }), 400)
  } else if (stage === 'OfferReceived') {
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.65 }, colors: ['#10b981', '#34d399', '#fbbf24'] })
  } else if (stage === 'RecruiterScreen' || stage === 'Interviewing') {
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, scalar: 0.8, colors: ['#10b981', '#6ee7b7'] })
  }
}

export function KanbanBoard({ applications }: KanbanBoardProps) {
  const [activeApp, setActiveApp] = useState<Application | null>(null)
  const updateStage   = useUpdateStage()
  const updateStreak  = useUpdateStreak()
  const { data: upcomingInterviews = [] } = useUpcomingInterviews()

  const interviewMap = useMemo(() => {
    const map = new Map<string, { scheduled_at: string; round_type: string }>()
    for (const iv of upcomingInterviews) {
      if (!map.has(iv.application_id) && iv.scheduled_at) {
        map.set(iv.application_id, { scheduled_at: iv.scheduled_at, round_type: iv.round_type })
      }
    }
    return map
  }, [upcomingInterviews])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragStart(event: DragStartEvent) {
    const app = applications.find(a => a.id === event.active.id)
    setActiveApp(app ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveApp(null)
    if (!over) return

    const draggedApp = applications.find(a => a.id === active.id)
    if (!draggedApp) return

    const targetStage = (
      PIPELINE_STAGES.includes(over.id as PipelineStage)
        ? over.id as PipelineStage
        : (over.data.current?.sortable?.containerId as PipelineStage | undefined)
    )

    if (!targetStage || targetStage === draggedApp.stage) return

    try {
      await updateStage.mutateAsync({ id: draggedApp.id, stage: targetStage, prevStage: draggedApp.stage })
      fireConfetti(targetStage)
      await updateStreak()
    } catch {
      // Stage update failed — skip celebration
    }
  }

  const byStage = (stage: PipelineStage) => applications.filter(a => a.stage === stage)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full pb-4 overflow-x-auto px-4 scrollbar-thin">
        {PIPELINE_STAGES.map(stage => (
          <KanbanColumn key={stage} stage={stage} apps={byStage(stage)} interviewMap={interviewMap} />
        ))}
      </div>

      <DragOverlay>
        {activeApp && (
          <div className="rotate-2 opacity-95 scale-105">
            <KanbanCard app={activeApp} nextInterview={interviewMap.get(activeApp.id) ?? null} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
