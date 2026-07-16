import { useMemo, useEffect, useRef } from 'react'
import { format, parseISO, startOfWeek, endOfWeek, subWeeks, isWithinInterval, differenceInDays } from 'date-fns'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { Loader2, Target, TrendingUp, MessageSquare, Award, BarChart2 } from 'lucide-react'
import { useApplications } from '@/hooks/useApplications'
import { STAGE_LABELS } from '@/lib/constants'
import { animateIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { PipelineStage } from '@/types'

// ── KPI card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: 'default' | 'green' | 'amber' | 'red'
}

function KpiCard({ label, value, sub, icon: Icon, accent = 'default' }: KpiProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { animateIn(ref.current) }, [])
  const iconCls = {
    default: 'bg-primary/10 text-primary',
    green:   'bg-green-500/10 text-green-600',
    amber:   'bg-amber-500/10 text-amber-600',
    red:     'bg-red-500/10 text-red-600',
  }[accent]
  return (
    <div ref={ref} className="rounded-xl border bg-card p-4 flex items-center gap-3 card-shadow">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconCls)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        <p className="text-xl font-bold leading-none mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold">{label}</p>
      <p className="text-primary font-bold mt-0.5">{payload[0].value} application{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Stage bar tooltip ─────────────────────────────────────────────────────────

function StageTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold">{label}</p>
      <p className="text-primary font-bold mt-0.5">{payload[0].value} app{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Funnel bar ────────────────────────────────────────────────────────────────

function FunnelRow({ label, count, total, accent }: { label: string; count: number; total: number; accent: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-muted-foreground w-28 shrink-0 truncate">{label}</p>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', accent)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5 shrink-0 w-16 justify-end">
        <span className="text-xs font-semibold">{count}</span>
        <span className="text-[10px] text-muted-foreground">({pct}%)</span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function InsightsPage() {
  const { data: applications = [], isLoading } = useApplications()
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (!isLoading) animateIn(pageRef.current, 0) }, [isLoading])

  const stats = useMemo(() => {
    const applied = applications.filter(a => !['Researching', 'Preparing'].includes(a.stage))
    const responded = applications.filter(a =>
      ['RecruiterScreen', 'Interviewing', 'OfferReceived', 'Negotiating', 'Accepted'].includes(a.stage)
    )
    const interviewed = applications.filter(a =>
      ['Interviewing', 'OfferReceived', 'Negotiating', 'Accepted'].includes(a.stage)
    )
    const offered = applications.filter(a =>
      ['OfferReceived', 'Negotiating', 'Accepted'].includes(a.stage)
    )
    const accepted = applications.filter(a => a.stage === 'Accepted')

    const responseRate = applied.length > 0 ? Math.round((responded.length / applied.length) * 100) : 0
    const interviewRate = applied.length > 0 ? Math.round((interviewed.length / applied.length) * 100) : 0
    const offerRate = applied.length > 0 ? Math.round((offered.length / applied.length) * 100) : 0

    const avgDaysApplied = applied.length > 0
      ? Math.round(applied.reduce((acc, a) => acc + differenceInDays(new Date(), parseISO(a.created_at)), 0) / applied.length)
      : 0

    return {
      totalApplied: applied.length,
      responded: responded.length,
      interviewed: interviewed.length,
      offered: offered.length,
      accepted: accepted.length,
      responseRate,
      interviewRate,
      offerRate,
      avgDaysApplied,
    }
  }, [applications])

  // Apply velocity — last 12 weeks
  const velocityData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const weekDate = subWeeks(now, 11 - i)
      const wStart = startOfWeek(weekDate, { weekStartsOn: 1 })
      const wEnd = endOfWeek(weekDate, { weekStartsOn: 1 })
      const count = applications.filter(a =>
        isWithinInterval(parseISO(a.created_at), { start: wStart, end: wEnd })
      ).length
      return { week: format(wStart, 'MMM d'), count }
    })
  }, [applications])

  // Stage breakdown (exclude Researching/Preparing, show counts)
  const stageData = useMemo(() => {
    const counts: Partial<Record<PipelineStage, number>> = {}
    for (const app of applications) {
      if (app.stage === 'Researching' || app.stage === 'Preparing') continue
      counts[app.stage] = (counts[app.stage] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([stage, count]) => ({ stage: STAGE_LABELS[stage as PipelineStage], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [applications])

  if (isLoading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  const hasData = applications.length >= 3

  return (
    <div ref={pageRef} className="p-4 sm:p-6 pb-24 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" /> Insights
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Your job search at a glance</p>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <BarChart2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-semibold">Not enough data yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Add at least 3 applications and insights will appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <Section title="Overview">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Total applied" value={stats.totalApplied} icon={Target} accent="default" />
              <KpiCard label="Response rate" value={`${stats.responseRate}%`} sub={`${stats.responded} responded`} icon={MessageSquare} accent="green" />
              <KpiCard label="Interview rate" value={`${stats.interviewRate}%`} sub={`${stats.interviewed} interviews`} icon={TrendingUp} accent="amber" />
              <KpiCard label="Offer rate" value={`${stats.offerRate}%`} sub={`${stats.offered} offers`} icon={Award} accent={stats.offerRate > 0 ? 'green' : 'default'} />
            </div>
          </Section>

          {/* Apply velocity */}
          <Section title="Apply velocity — last 12 weeks">
            <div className="rounded-xl border bg-card p-4 card-shadow">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={velocityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#velocityGrad)"
                    dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#10b981', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Stage breakdown */}
          {stageData.length > 0 && (
            <Section title="Applications by stage">
              <div className="rounded-xl border bg-card p-4 card-shadow">
                <ResponsiveContainer width="100%" height={stageData.length * 36 + 20}>
                  <BarChart data={stageData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" strokeOpacity={0.06} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.7 }} tickLine={false} axisLine={false} width={110} />
                    <Tooltip content={<StageTooltip />} />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          )}

          {/* Pipeline funnel */}
          {stats.totalApplied > 0 && (
            <Section title="Pipeline funnel">
              <div className="rounded-xl border bg-card p-5 card-shadow space-y-4">
                <FunnelRow label="Applied" count={stats.totalApplied} total={stats.totalApplied} accent="bg-primary" />
                <FunnelRow label="Got response" count={stats.responded} total={stats.totalApplied} accent="bg-sky-500" />
                <FunnelRow label="Interviewed" count={stats.interviewed} total={stats.totalApplied} accent="bg-amber-500" />
                <FunnelRow label="Got offer" count={stats.offered} total={stats.totalApplied} accent="bg-green-500" />
                <FunnelRow label="Accepted" count={stats.accepted} total={stats.totalApplied} accent="bg-emerald-600" />
              </div>
            </Section>
          )}

          {/* Summary footer */}
          <div className="rounded-xl border bg-muted/30 px-5 py-4">
            <p className="text-xs text-muted-foreground">
              Tracking <span className="font-semibold text-foreground">{applications.length}</span> applications total
              {stats.avgDaysApplied > 0 && (
                <> · avg. <span className="font-semibold text-foreground">{stats.avgDaysApplied} days</span> since applying</>
              )}
              {stats.accepted > 0 && (
                <> · <span className="font-semibold text-green-600">{stats.accepted} offer accepted 🎉</span></>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
