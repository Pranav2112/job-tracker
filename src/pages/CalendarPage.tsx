import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import { Loader2 } from 'lucide-react'
import { useApplications } from '@/hooks/useApplications'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { InterviewRound } from '@/types'

function useAllInterviews() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['all-interviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_rounds')
        .select('*, applications(company_name, role_title, stage)')
        .eq('user_id', user!.id)
        .not('scheduled_at', 'is', null)
      if (error) throw error
      return data as (InterviewRound & { applications: { company_name: string; role_title: string; stage: string } })[]
    },
    enabled: !!user,
  })
}

export function CalendarPage() {
  const navigate = useNavigate()
  const { data: applications = [], isLoading: appsLoading, isError: appsError } = useApplications()
  const { data: interviews = [], isLoading: intvLoading, isError: intvError } = useAllInterviews()

  const events = useMemo<EventInput[]>(() => {
    const deadlineEvents = applications
      .filter(a => a.deadline)
      .map(a => ({
        id: `deadline-${a.id}`,
        title: `📅 ${a.company_name} deadline`,
        date: a.deadline!,
        extendedProps: { applicationId: a.id, type: 'deadline' },
        backgroundColor: '#f59e0b',
        borderColor: '#f59e0b',
        textColor: '#fff',
        allDay: true,
      }))

    const interviewEvents = interviews.map(r => {
      return {
        id: `interview-${r.id}`,
        title: `🎙 ${r.applications.company_name} · ${r.round_type}`,
        start: r.scheduled_at!,
        extendedProps: { applicationId: r.application_id, type: 'interview' },
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
        textColor: '#fff',
      }
    })

    return [...deadlineEvents, ...interviewEvents]
  }, [applications, interviews])

  if (appsLoading || intvLoading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (appsError || intvError) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Failed to load calendar data. Please refresh.</p>
    </div>
  )

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          events={events}
          eventClick={({ event }) => {
            const appId = event.extendedProps.applicationId as string
            if (appId) navigate(`/applications/${appId}`)
          }}
          height="100%"
          eventDisplay="block"
        />
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground shrink-0">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400 inline-block" />Deadline</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500 inline-block" />Interview</span>
      </div>
    </div>
  )
}
