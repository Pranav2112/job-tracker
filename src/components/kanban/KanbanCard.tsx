import { useRef, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Calendar, Video } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { cn, formatDate, needsAttention } from '@/lib/utils'
import { hoverLift, hoverDrop } from '@/lib/animations'
import { useUpdateStage } from '@/hooks/useApplications'
import type { Application } from '@/types'

interface KanbanCardProps {
  app: Application
  nextInterview?: { scheduled_at: string; round_type: string } | null
}

export function KanbanCard({ app, nextInterview }: KanbanCardProps) {
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const updateStage = useUpdateStage()
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!ctxMenu) return
    function close() { setCtxMenu(null) }
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    return () => { window.removeEventListener('click', close); window.removeEventListener('contextmenu', close) }
  }, [ctxMenu])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
    data: { type: 'card', app },
  })

  const { flag, reason } = needsAttention(app)

  // Interview countdown
  let interviewBadge: { label: string; urgent: boolean } | null = null
  if (nextInterview?.scheduled_at) {
    const days = differenceInDays(parseISO(nextInterview.scheduled_at), new Date())
    if (days < 0) interviewBadge = null
    else if (days === 0) interviewBadge = { label: 'Interview today', urgent: true }
    else if (days === 1) interviewBadge = { label: 'Interview tomorrow', urgent: true }
    else if (days <= 7) interviewBadge = { label: `Interview in ${days}d`, urgent: days <= 2 }
    else interviewBadge = { label: `Interview ${formatDate(nextInterview.scheduled_at, 'MMM d')}`, urgent: false }
  }

  function combinedRef(node: HTMLDivElement | null) {
    setNodeRef(node)
    ;(cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }

  async function markAs(stage: 'Ghosted' | 'Withdrawn') {
    setCtxMenu(null)
    await updateStage.mutateAsync({ id: app.id, stage, prevStage: app.stage, existingDateApplied: app.date_applied })
  }

  return (
    <>
    <div
      ref={combinedRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-xl border bg-card card-shadow cursor-grab active:cursor-grabbing select-none transition-shadow duration-150',
        'hover:card-shadow-hover',
        isDragging && 'opacity-40 shadow-xl ring-2 ring-primary/30 z-50 rotate-1',
        flag && 'border-amber-300/70'
      )}
      onMouseEnter={() => !isDragging && hoverLift(cardRef.current)}
      onMouseLeave={() => hoverDrop(cardRef.current)}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }) }}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/applications/${app.id}`)}
    >
      {/* Priority accent strip */}
      <div className={cn(
        'h-0.5 w-full rounded-t-xl',
        app.priority === 'High' ? 'bg-red-400' : app.priority === 'Medium' ? 'bg-amber-400' : 'bg-border/40'
      )} />

      <div className="px-3 py-2.5">
        {/* Interview badge — kept because it's time-critical */}
        {interviewBadge && (
          <div className={cn(
            'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md mb-2 w-fit',
            interviewBadge.urgent
              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          )}>
            <Video className="h-3 w-3 shrink-0" />
            {interviewBadge.label}
          </div>
        )}

        {/* Company + role — the only two things that matter at a glance */}
        <p className="font-semibold text-sm leading-tight truncate">{app.company_name}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{app.role_title}</p>

        {/* Bottom row: only shown when there's something worth flagging */}
        {(flag || app.deadline) && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
            {flag && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium" title={reason}>
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span className="truncate">{reason}</span>
              </span>
            )}
            {app.deadline && !flag && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
                <Calendar className="h-3 w-3" />
                {formatDate(app.deadline, 'MMM d')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>

    {ctxMenu && (
      <div
        className="fixed z-[200] min-w-[160px] rounded-lg border bg-popover shadow-lg py-1 text-sm"
        style={{ top: ctxMenu.y, left: ctxMenu.x }}
        onClick={e => e.stopPropagation()}
      >
        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{app.company_name}</p>
        <button
          className="w-full text-left px-3 py-1.5 hover:bg-muted/60 transition-colors"
          onClick={() => markAs('Ghosted')}
        >
          👻 Mark as Ghosted
        </button>
        <button
          className="w-full text-left px-3 py-1.5 hover:bg-muted/60 transition-colors"
          onClick={() => markAs('Withdrawn')}
        >
          🚪 Mark as Withdrawn
        </button>
      </div>
    )}
    </>
  )
}
