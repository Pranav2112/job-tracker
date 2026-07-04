import { useEffect, useRef, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Calendar, Target, TrendingUp, Loader2, Zap } from 'lucide-react'
import { isWithinInterval, addDays, parseISO, startOfDay } from 'date-fns'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { useApplications } from '@/hooks/useApplications'
import { needsAttention, formatDate } from '@/lib/utils'
import { TERMINAL_STAGES } from '@/lib/constants'
import { StageBadge } from '@/components/common/StageBadge'
import { animateCounter, animateListIn, animateIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { useGamification } from '@/hooks/useGamification'
import { SeasonGoal } from '@/components/gamification/SeasonGoal'
import { WeeklyChallenges } from '@/components/gamification/WeeklyChallenges'
import type { Application } from '@/types'

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  sub?: string
  accent?: 'default' | 'amber' | 'green' | 'red'
}

function StatCard({ title, value, icon: Icon, sub, accent = 'default' }: StatCardProps) {
  const numRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    animateCounter(numRef.current, value)
    animateIn(cardRef.current)
  }, [value])

  const accentMap = {
    default: 'from-primary/5 to-primary/10 border-primary/10',
    amber:   'from-amber-500/5 to-amber-500/10 border-amber-500/10',
    green:   'from-green-500/5 to-green-500/10 border-green-500/10',
    red:     'from-red-500/5 to-red-500/10 border-red-500/10',
  }
  const iconMap = {
    default: 'bg-primary/10 text-primary',
    amber:   'bg-amber-500/10 text-amber-600',
    green:   'bg-green-500/10 text-green-600',
    red:     'bg-red-500/10 text-red-600',
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        'rounded-xl border bg-gradient-to-br card-shadow p-5 flex items-center gap-4',
        accentMap[accent]
      )}
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', iconMap[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
        <p className="text-2xl font-bold tracking-tight leading-none mt-1">
          <span ref={numRef}>0</span>
        </p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

type Filter = 'all' | 'priority-high' | 'needs-attention' | 'internship' | 'full-time'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'priority-high', label: '🔴 High priority' },
  { key: 'needs-attention', label: '⚠️ Needs attention' },
  { key: 'internship', label: '🎓 Internships' },
  { key: 'full-time', label: '💼 Full-time' },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: applications = [], isLoading } = useApplications()
  const [filter, setFilter] = useState<Filter>('all')
  const headerRef = useRef<HTMLDivElement>(null)
  const { challenges, seasonGoal, seasonProgress } = useGamification()

  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    const week = addDays(today, 7)
    const active = applications.filter(a => !TERMINAL_STAGES.includes(a.stage))
    const deadlines = applications.filter(a => a.deadline && isWithinInterval(parseISO(a.deadline), { start: today, end: week }))
    const attention = applications.filter(a => needsAttention(a).flag)
    return { total: applications.length, active: active.length, deadlines: deadlines.length, attention: attention.length }
  }, [applications])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'priority-high': return applications.filter(a => a.priority === 'High')
      case 'needs-attention': return applications.filter(a => needsAttention(a).flag)
      case 'internship': return applications.filter(a => a.app_type === 'Internship')
      case 'full-time': return applications.filter(a => a.app_type === 'FullTime')
      default: return applications
    }
  }, [applications, filter])

  const upcomingDeadlines = useMemo(() => {
    const today = startOfDay(new Date())
    const week = addDays(today, 7)
    return applications
      .filter(a => a.deadline && isWithinInterval(parseISO(a.deadline), { start: today, end: week }))
      .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
      .slice(0, 6)
  }, [applications])

  useEffect(() => {
    if (!isLoading) {
      animateIn(headerRef.current, 0)
      animateListIn('.filter-btn')
    }
  }, [isLoading])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats + filters */}
      <div className="px-6 pt-5 pb-4 space-y-4 shrink-0" ref={headerRef}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Total Applications" value={stats.total} icon={Target} accent="default" />
          <StatCard title="Active Pipeline" value={stats.active} icon={TrendingUp} sub="not in terminal stage" accent="green" />
          <StatCard title="Deadlines This Week" value={stats.deadlines} icon={Calendar} accent="amber" />
          <StatCard title="Needs Attention" value={stats.attention} icon={AlertTriangle} accent="red" />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={cn(
                'filter-btn px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
                filter === f.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
              )}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main: Kanban + sidebar */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-x-auto overflow-y-auto scrollbar-thin">
            <div className="py-2 min-h-full">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 px-6">
                  <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                    <Zap className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">No applications yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Start tracking your job search</p>
                  </div>
                  <Button size="sm" onClick={() => navigate('/applications/new')}>
                    Add first application
                  </Button>
                </div>
              ) : (
                <KanbanBoard applications={filtered} />
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar — deadlines + gamification */}
        <aside className="hidden lg:flex flex-col w-72 border-l shrink-0 p-4 gap-4 overflow-y-auto scrollbar-thin">
          {/* Season Goal */}
          <SeasonGoal appCount={applications.length} goal={seasonGoal} progress={seasonProgress} />

          {/* Weekly Challenges */}
          <WeeklyChallenges challenges={challenges} />

          {/* Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Deadlines this week
                </p>
              </div>
              {upcomingDeadlines.map((app: Application) => (
                <button
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className="group w-full text-left p-3 rounded-xl border bg-card card-shadow hover:card-shadow-hover transition-all duration-150 hover:-translate-y-0.5"
                >
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{app.company_name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{app.role_title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <StageBadge stage={app.stage} />
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                      {formatDate(app.deadline, 'MMM d')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
