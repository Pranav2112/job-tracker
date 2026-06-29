import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, format, parseISO, isValid } from 'date-fns'
import type { Application } from '@/types'
import { TERMINAL_STAGES, STALE_DAYS, DEADLINE_WARNING_DAYS } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined, fmt = 'MMM d, yyyy'): string {
  if (!date) return '—'
  try {
    const d = parseISO(date)
    return isValid(d) ? format(d, fmt) : '—'
  } catch {
    return '—'
  }
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function isDeadlineSoon(deadline: string | null | undefined): boolean {
  if (!deadline) return false
  const days = differenceInDays(parseISO(deadline), new Date())
  return days >= 0 && days <= DEADLINE_WARNING_DAYS
}

export function isDeadlinePast(deadline: string | null | undefined): boolean {
  if (!deadline) return false
  return differenceInDays(parseISO(deadline), new Date()) < 0
}

export function isStale(app: Application): boolean {
  if (TERMINAL_STAGES.includes(app.stage)) return false
  const days = differenceInDays(new Date(), parseISO(app.updated_at))
  return days >= STALE_DAYS
}

export function needsAttention(app: Application): { flag: boolean; reason: string } {
  if (isDeadlineSoon(app.deadline)) return { flag: true, reason: `Deadline in ${differenceInDays(parseISO(app.deadline!), new Date())}d` }
  if (isDeadlinePast(app.deadline) && !TERMINAL_STAGES.includes(app.stage)) return { flag: true, reason: 'Deadline passed' }
  if (isStale(app)) return { flag: true, reason: `No update in ${differenceInDays(new Date(), parseISO(app.updated_at))}d` }
  return { flag: false, reason: '' }
}

export function exportToCSV(applications: Application[]): void {
  const headers = [
    'Company', 'Role', 'Type', 'Stage', 'Priority', 'Location', 'Remote',
    'Source', 'Date Discovered', 'Date Applied', 'Deadline', 'Salary Info',
    'Posting URL', 'Notes', 'Created', 'Updated',
  ]
  const rows = applications.map(a => [
    a.company_name, a.role_title, a.app_type, a.stage, a.priority,
    a.location ?? '', a.remote_type ?? '', a.source ?? '',
    a.date_discovered ?? '', a.date_applied ?? '', a.deadline ?? '',
    a.salary_info ?? '', a.posting_url ?? '',
    (a.notes ?? '').replace(/\n/g, ' '),
    a.created_at, a.updated_at,
  ])

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `applications-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
