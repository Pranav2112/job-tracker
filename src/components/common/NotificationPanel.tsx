import { useNavigate } from 'react-router-dom'
import { X, Bell, Calendar, Clock, MessageSquare, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/hooks/useNotifications'

interface Props {
  open: boolean
  onClose: () => void
  notifications: AppNotification[]
  onDismiss: (id: string) => void
  onDismissAll: () => void
}

const TYPE_ICON = {
  deadline: Calendar,
  stale: Clock,
  followup: MessageSquare,
}

const SEVERITY_STYLES = {
  urgent: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  normal: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  info:   'bg-muted/60 border-border',
}

const SEVERITY_ICON = {
  urgent: 'text-red-500',
  normal: 'text-amber-500',
  info:   'text-muted-foreground',
}

export function NotificationPanel({ open, onClose, notifications, onDismiss, onDismissAll }: Props) {
  const navigate = useNavigate()

  function handleClick(n: AppNotification) {
    navigate(`/applications/${n.applicationId}`)
    onDismiss(n.id)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed bottom-16 left-2 right-2 md:left-64 md:right-auto md:bottom-auto md:top-auto z-50',
          'md:w-80 rounded-2xl border bg-popover shadow-2xl',
          'transition-all duration-200 origin-bottom-left',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        )}
        style={{ maxHeight: '70vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Notifications</p>
            {notifications.length > 0 && (
              <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <button
                onClick={onDismissAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted"
              >
                <CheckCheck className="h-3 w-3" /> All read
              </button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 52px)' }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center px-6">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-0.5">No pending alerts right now.</p>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {notifications.map(n => {
                const Icon = TYPE_ICON[n.type]
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'group relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 hover:shadow-sm',
                      SEVERITY_STYLES[n.severity]
                    )}
                    onClick={() => handleClick(n)}
                  >
                    <div className={cn('mt-0.5 shrink-0', SEVERITY_ICON[n.severity])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 pr-5">
                      <p className="text-xs font-semibold leading-snug">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.body}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onDismiss(n.id) }}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity p-0.5 rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
