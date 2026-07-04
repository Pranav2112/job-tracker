import { useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Calendar, Building2, Video } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { cn, formatDate, needsAttention } from '@/lib/utils'
import { PRIORITY_COLORS } from '@/lib/constants'
import { computeBasicScore, scoreColor } from '@/lib/completeness'
import { hoverLift, hoverDrop } from '@/lib/animations'
import type { Application } from '@/types'

interface KanbanCardProps {
  app: Application
  nextInterview?: { scheduled_at: string; round_type: string } | null
}

function CompletenessRing({ score }: { score: number }) {
  const r = 8
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = scoreColor(score)
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" className="shrink-0" aria-label={`${score}% complete`}>
      <circle cx="11" cy="11" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
      <circle
        cx="11" cy="11" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 11 11)"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      <text x="11" y="11" textAnchor="middle" dominantBaseline="central" fontSize="5" fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  )
}

export function KanbanCard({ app, nextInterview }: KanbanCardProps) {
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
    data: { type: 'card', app },
  })

  const { flag, reason } = needsAttention(app)
  const priorityColors = PRIORITY_COLORS[app.priority]
  const score = computeBasicScore(app)

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

  return (
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
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/applications/${app.id}`)}
    >
      {/* Priority accent strip */}
      <div className={cn(
        'h-0.5 w-full rounded-t-xl',
        app.priority === 'High' ? 'bg-red-400' : app.priority === 'Medium' ? 'bg-amber-400' : 'bg-border'
      )} />

      <div className="p-3">
        {/* Interview badge */}
        {interviewBadge && (
          <div className={cn(
            'flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md mb-2 w-fit',
            interviewBadge.urgent
              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          )}>
            <Video className="h-3 w-3 shrink-0" />
            {interviewBadge.label}
          </div>
        )}

        {/* Company + role */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-tight truncate">{app.company_name}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{app.role_title}</p>
          </div>
          <span className={cn(
            'shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-bold tracking-wide',
            priorityColors.bg, priorityColors.text
          )}>
            {app.priority[0]}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/60">
          <div className="flex items-center gap-1.5">
            {app.location && !flag && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate max-w-[70px]">{app.remote_type ?? app.location}</span>
              </span>
            )}
            {flag && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium" title={reason}>
                <AlertTriangle className="h-3 w-3" />
                <span className="max-w-[70px] truncate">{reason}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {app.deadline && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(app.deadline, 'MMM d')}
              </span>
            )}
            <CompletenessRing score={score} />
          </div>
        </div>
      </div>
    </div>
  )
}
