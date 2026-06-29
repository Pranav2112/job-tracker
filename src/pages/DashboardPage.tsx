import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Calendar, Target, TrendingUp, Loader2 } from 'lucide-react'
import { isWithinInterval, addDays, parseISO, startOfDay } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { useApplications } from '@/hooks/useApplications'
import { needsAttention, formatDate } from '@/lib/utils'
import { TERMINAL_STAGES } from '@/lib/constants'
import { StageBadge } from '@/components/common/StageBadge'
import type { Application } from '@/types'

function StatCard({ title, value, icon: Icon, sub }: { title: string; value: number; icon: React.ElementType; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: applications = [], isLoading } = useApplications()
  const [filter, setFilter] = useState<'all' | 'priority-high' | 'needs-attention' | 'internship' | 'full-time'>('all')

  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    const week = addDays(today, 7)
    const active = applications.filter(a => !TERMINAL_STAGES.includes(a.stage))
    const deadlines = applications.filter(a => a.deadline && isWithinInterval(parseISO(a.deadline), { start: today, end: week }))
    const interviews = applications.filter(a => ['RecruiterScreen', 'Interviewing'].includes(a.stage))
    const attention = applications.filter(a => needsAttention(a).flag)
    return { total: applications.length, active: active.length, deadlines: deadlines.length, interviews: interviews.length, attention: attention.length }
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

  // Upcoming deadlines sidebar
  const upcomingDeadlines = useMemo(() => {
    const today = startOfDay(new Date())
    const week = addDays(today, 7)
    return applications
      .filter(a => a.deadline && isWithinInterval(parseISO(a.deadline), { start: today, end: week }))
      .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
      .slice(0, 5)
  }, [applications])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats */}
      <div className="px-6 pt-6 pb-4 space-y-4 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total Applications" value={stats.total} icon={Target} />
          <StatCard title="Active Pipeline" value={stats.active} icon={TrendingUp} sub="not in terminal stage" />
          <StatCard title="Deadlines This Week" value={stats.deadlines} icon={Calendar} />
          <StatCard title="Needs Attention" value={stats.attention} icon={AlertTriangle} />
        </div>

        {/* Filters + quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'priority-high', 'needs-attention', 'internship', 'full-time'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="text-xs">
              {f === 'all' ? 'All' : f === 'priority-high' ? 'High Priority' : f === 'needs-attention' ? 'Needs Attention' : f === 'internship' ? 'Internships' : 'Full-Time'}
            </Button>
          ))}
        </div>
      </div>

      {/* Main area: Kanban + sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Kanban */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-x-auto overflow-y-auto">
            <div className="py-2 min-h-full">
              {filtered.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 px-6">
                  <p className="text-muted-foreground text-sm">No applications yet.</p>
                  <Button size="sm" onClick={() => navigate('/applications/new')}>Add your first application</Button>
                </div>
              ) : (
                <KanbanBoard applications={filtered} />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: upcoming deadlines */}
        {upcomingDeadlines.length > 0 && (
          <aside className="hidden lg:flex flex-col w-64 border-l shrink-0 p-4 gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deadlines this week</p>
            {upcomingDeadlines.map((app: Application) => (
              <button
                key={app.id}
                onClick={() => navigate(`/applications/${app.id}`)}
                className="text-left p-2 rounded-md border hover:bg-muted transition-colors"
              >
                <p className="text-sm font-medium truncate">{app.company_name}</p>
                <p className="text-xs text-muted-foreground truncate">{app.role_title}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <StageBadge stage={app.stage} />
                  <span className="text-xs font-medium text-amber-600">{formatDate(app.deadline, 'MMM d')}</span>
                </div>
              </button>
            ))}
          </aside>
        )}
      </div>
    </div>
  )
}
