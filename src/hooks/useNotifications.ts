import { useMemo, useCallback, useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import type { Application } from '@/types'
import { TERMINAL_STAGES } from '@/lib/constants'

export type NotifType = 'deadline' | 'stale' | 'followup'
export type NotifSeverity = 'urgent' | 'normal' | 'info'

export interface AppNotification {
  id: string
  type: NotifType
  severity: NotifSeverity
  title: string
  body: string
  applicationId: string
}

const STORAGE_KEY = 'apptracker_dismissed_notifs'

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function saveDismissed(ids: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])) } catch { /* noop */ }
}

export function useNotifications(applications: Application[]) {
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed)

  const all = useMemo<AppNotification[]>(() => {
    const now = new Date()
    const notifs: AppNotification[] = []

    for (const app of applications) {
      if (TERMINAL_STAGES.includes(app.stage)) continue

      // Deadline alerts
      if (app.deadline) {
        const days = differenceInDays(parseISO(app.deadline), now)
        if (days >= 0 && days <= 3) {
          notifs.push({
            id: `deadline-${app.id}`,
            type: 'deadline',
            severity: days <= 1 ? 'urgent' : 'normal',
            title: days === 0 ? 'Deadline today!' : `Deadline in ${days} day${days === 1 ? '' : 's'}`,
            body: `${app.company_name} — ${app.role_title}`,
            applicationId: app.id,
          })
        }
      }

      // Stale applications (not updated in 30+ days)
      const daysSinceUpdate = differenceInDays(now, parseISO(app.updated_at))
      if (daysSinceUpdate >= 30) {
        notifs.push({
          id: `stale-${app.id}`,
          type: 'stale',
          severity: 'info',
          title: 'Application going stale',
          body: `${app.company_name} hasn't been updated in ${daysSinceUpdate} days`,
          applicationId: app.id,
        })
      }

      // Follow-up nudge: in Applied stage for 14+ days
      if (app.stage === 'Applied') {
        const daysSinceApplied = differenceInDays(now, parseISO(app.updated_at))
        if (daysSinceApplied >= 14) {
          notifs.push({
            id: `followup-${app.id}`,
            type: 'followup',
            severity: 'normal',
            title: 'Consider following up',
            body: `${app.company_name} — applied ${daysSinceApplied} days ago`,
            applicationId: app.id,
          })
        }
      }
    }

    // Sort: urgent first, then by type
    return notifs.sort((a, b) => {
      const order = { urgent: 0, normal: 1, info: 2 }
      return order[a.severity] - order[b.severity]
    })
  }, [applications])

  const unread = useMemo(() => all.filter(n => !dismissed.has(n.id)), [all, dismissed])

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(id)
      saveDismissed(next)
      return next
    })
  }, [])

  const dismissAll = useCallback(() => {
    const ids = new Set(all.map(n => n.id))
    saveDismissed(ids)
    setDismissed(ids)
  }, [all])

  return { all, unread, unreadCount: unread.length, dismiss, dismissAll }
}
