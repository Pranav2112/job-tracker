import type { Application } from '@/types'

export interface CompletenessCounts {
  docs: number
  interviews: number
  contacts: number
  notes: number
}

interface Check { label: string; done: boolean }

export function computeCompleteness(app: Application, counts?: CompletenessCounts): { score: number; checks: Check[]; nextAction: string | null } {
  const checks: Check[] = [
    { label: 'Posting URL saved', done: !!app.posting_url },
    { label: 'Deadline set', done: !!app.deadline },
    { label: 'Applied date logged', done: !!app.date_applied },
    { label: 'Salary info added', done: !!app.salary_info },
    { label: 'Notes written', done: !!app.notes?.trim() },
    { label: 'Resume or document uploaded', done: (counts?.docs ?? 0) > 0 },
    { label: 'Interview round logged', done: (counts?.interviews ?? 0) > 0 },
    { label: 'Contact linked', done: (counts?.contacts ?? 0) > 0 },
    { label: 'Research notes added', done: (counts?.notes ?? 0) > 0 },
  ]

  const done = checks.filter(c => c.done).length
  const score = Math.round((done / checks.length) * 100)
  const missing = checks.find(c => !c.done)
  const nextAction = missing ? missing.label : null

  return { score, checks, nextAction }
}

/** Lightweight version using only Application fields (no async counts) */
export function computeBasicScore(app: Application): number {
  const checks = [
    !!app.posting_url,
    !!app.deadline,
    !!app.date_applied,
    !!app.salary_info,
    !!app.notes?.trim(),
    !!app.location,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function scoreColor(score: number): string {
  if (score >= 75) return '#22c55e'   // green
  if (score >= 45) return '#f59e0b'   // amber
  return '#ef4444'                     // red
}
