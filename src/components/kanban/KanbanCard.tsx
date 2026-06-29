import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Calendar, Building2 } from 'lucide-react'
import { cn, formatDate, needsAttention } from '@/lib/utils'
import { PRIORITY_COLORS } from '@/lib/constants'
import type { Application } from '@/types'

export function KanbanCard({ app }: { app: Application }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
    data: { type: 'card', app },
  })

  const { flag, reason } = needsAttention(app)
  const priorityColors = PRIORITY_COLORS[app.priority]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing select-none group',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/30 z-50',
        flag && 'border-amber-300'
      )}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/applications/${app.id}`)}
    >
      {/* Company + role */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm leading-tight truncate">{app.company_name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{app.role_title}</p>
        </div>
        <span className={cn('shrink-0 text-xs px-1.5 py-0.5 rounded font-medium', priorityColors.bg, priorityColors.text)}>
          {app.priority[0]}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {app.location && (
            <span className="flex items-center gap-0.5">
              <Building2 className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{app.remote_type ?? app.location}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {flag && (
            <span className="text-amber-500" title={reason}>
              <AlertTriangle className="h-3 w-3" />
            </span>
          )}
          {app.deadline && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(app.deadline, 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
