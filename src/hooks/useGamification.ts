import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { startOfWeek, endOfWeek, parseISO, differenceInCalendarDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useApplications } from '@/hooks/useApplications'

// ─── XP & Level system ────────────────────────────────────────────────────────
export const LEVELS = [
  { level: 1, title: 'Newcomer',    minXP: 0    },
  { level: 2, title: 'Prospect',    minXP: 100  },
  { level: 3, title: 'Candidate',   minXP: 300  },
  { level: 4, title: 'Contender',   minXP: 650  },
  { level: 5, title: 'Finalist',    minXP: 1200 },
  { level: 6, title: 'Offer Magnet',minXP: 2200 },
  { level: 7, title: 'Hired',       minXP: 4000 },
]

export function xpToLevel(xp: number) {
  let current = LEVELS[0]
  let next = LEVELS[1]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      current = LEVELS[i]
      next = LEVELS[i + 1] ?? LEVELS[i]
      break
    }
  }
  const withinLevel = xp - current.minXP
  const levelRange  = next.minXP - current.minXP
  const progress    = next === current ? 100 : Math.min(100, Math.round((withinLevel / levelRange) * 100))
  return { ...current, next, xp, progress }
}

// ─── Aggregate XP from Supabase counts ────────────────────────────────────────
async function fetchXPCounts(userId: string) {
  const [docs, interviews, notes, contacts, offers] = await Promise.all([
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('interview_rounds').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('research_notes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('offers').select('final_outcome').eq('user_id', userId),
  ])
  return {
    docCount:      docs.count      ?? 0,
    interviewCount:interviews.count ?? 0,
    noteCount:     notes.count     ?? 0,
    contactCount:  contacts.count  ?? 0,
    acceptedCount: (offers.data ?? []).filter(o => o.final_outcome === 'Accepted').length,
    offerCount:    (offers.data ?? []).length,
  }
}

export function computeXP(
  apps: { stage: string }[],
  counts: Awaited<ReturnType<typeof fetchXPCounts>>
) {
  let xp = 0
  for (const a of apps) {
    xp += 10
    if (a.stage === 'Offer')    xp += 40
    if (a.stage === 'Accepted') xp += 90
  }
  xp += counts.docCount       * 5
  xp += counts.interviewCount * 15
  xp += counts.noteCount      * 8
  xp += counts.contactCount   * 5
  return xp
}

// ─── Achievements ─────────────────────────────────────────────────────────────
export interface Achievement {
  id: string
  icon: string
  title: string
  desc: string
  unlocked: boolean
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export function computeAchievements(
  apps: { stage: string; app_type: string; priority: string; created_at: string }[],
  counts: Awaited<ReturnType<typeof fetchXPCounts>>,
  streak: number
): Achievement[] {
  const offerApps    = apps.filter(a => ['Offer', 'Accepted'].includes(a.stage))
  const acceptedApps = apps.filter(a => a.stage === 'Accepted')

  return [
    {
      id: 'first_app', icon: '🚀', title: 'Off to the Races',
      desc: 'Added your first application',
      unlocked: apps.length >= 1, rarity: 'common',
    },
    {
      id: 'ten_apps', icon: '📦', title: 'Batch Mode',
      desc: 'Tracked 10+ applications',
      unlocked: apps.length >= 10, rarity: 'common',
    },
    {
      id: 'fifty_apps', icon: '💯', title: 'Mass Applier',
      desc: 'Tracked 50+ applications',
      unlocked: apps.length >= 50, rarity: 'rare',
    },
    {
      id: 'first_doc', icon: '📄', title: 'Paper Trail',
      desc: 'Uploaded your first document',
      unlocked: counts.docCount >= 1, rarity: 'common',
    },
    {
      id: 'researcher', icon: '🔬', title: 'Deep Researcher',
      desc: 'Added research notes to 10+ applications',
      unlocked: counts.noteCount >= 10, rarity: 'rare',
    },
    {
      id: 'networker', icon: '🤝', title: 'Networker',
      desc: 'Linked 5+ contacts',
      unlocked: counts.contactCount >= 5, rarity: 'rare',
    },
    {
      id: 'first_interview', icon: '📞', title: 'Phone Screen',
      desc: 'Logged your first interview round',
      unlocked: counts.interviewCount >= 1, rarity: 'common',
    },
    {
      id: 'interview_veteran', icon: '🎙️', title: 'Interview Veteran',
      desc: 'Survived 10+ interview rounds',
      unlocked: counts.interviewCount >= 10, rarity: 'rare',
    },
    {
      id: 'streak_3', icon: '🔥', title: 'On a Roll',
      desc: 'Maintained a 3-day activity streak',
      unlocked: streak >= 3, rarity: 'common',
    },
    {
      id: 'streak_7', icon: '⚡', title: 'Hot Streak',
      desc: 'Maintained a 7-day activity streak',
      unlocked: streak >= 7, rarity: 'rare',
    },
    {
      id: 'streak_30', icon: '💎', title: 'Unstoppable',
      desc: '30-day activity streak',
      unlocked: streak >= 30, rarity: 'epic',
    },
    {
      id: 'first_offer', icon: '✉️', title: 'In Demand',
      desc: 'Received your first offer',
      unlocked: offerApps.length >= 1, rarity: 'epic',
    },
    {
      id: 'triple_offer', icon: '🏅', title: 'Triple Threat',
      desc: 'Received 3+ simultaneous offers',
      unlocked: offerApps.length >= 3, rarity: 'epic',
    },
    {
      id: 'dream_job', icon: '🏆', title: 'Dream Job',
      desc: 'Accepted an offer — you did it!',
      unlocked: acceptedApps.length >= 1, rarity: 'legendary',
    },
  ]
}

// ─── Weekly Challenges (deterministic from week number) ───────────────────────
export interface Challenge {
  id: string
  icon: string
  desc: string
  target: number
  progress: number
  done: boolean
  xpReward: number
}

export function computeWeeklyChallenges(
  apps: { created_at: string; stage: string }[],
  interviewCount: number,
  noteCount: number
): Challenge[] {
  const now   = new Date()
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end   = endOfWeek(now,   { weekStartsOn: 1 })

  const appsThisWeek = apps.filter(a => {
    const d = parseISO(a.created_at)
    return d >= start && d <= end
  }).length

  // Deterministic set — same every week (could rotate by week number later)
  const challenges: Challenge[] = [
    {
      id: 'weekly_apps', icon: '📋', desc: 'Add 3 new applications this week',
      target: 3, progress: Math.min(3, appsThisWeek), done: appsThisWeek >= 3, xpReward: 50,
    },
    {
      id: 'weekly_interview', icon: '🎙️', desc: 'Log at least 1 interview round',
      target: 1, progress: Math.min(1, interviewCount > 0 ? 1 : 0), done: interviewCount > 0, xpReward: 30,
    },
    {
      id: 'weekly_research', icon: '🔬', desc: 'Write 2 research notes',
      target: 2, progress: Math.min(2, noteCount), done: noteCount >= 2, xpReward: 25,
    },
  ]

  return challenges
}

// ─── Streak hook ──────────────────────────────────────────────────────────────
export function useStreakData() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['user-gamification'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data as {
        current_streak: number
        longest_streak: number
        last_activity_date: string
        season_goal: number
      } | null
    },
    enabled: !!user,
    staleTime: 60_000,
  })

  const upsert = useMutation({
    mutationFn: async (data: { current_streak: number; longest_streak: number; last_activity_date: string; season_goal?: number }) => {
      const { error } = await supabase
        .from('user_gamification')
        .upsert({ user_id: user!.id, ...data }, { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-gamification'] }),
  })

  return { query, upsert }
}

export function useUpdateStreak() {
  const { upsert, query } = useStreakData()

  return async function touch() {
    const current = query.data
    const today   = new Date().toISOString().split('T')[0]

    if (current) {
      const last = current.last_activity_date
      if (last === today) return // already touched today

      const lastDate = new Date(last)
      const gap      = differenceInCalendarDays(new Date(), lastDate)
      const newStreak = gap === 1 ? current.current_streak + 1 : 1
      const newLongest = Math.max(newStreak, current.longest_streak)

      await upsert.mutateAsync({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_activity_date: today,
        season_goal: current.season_goal,
      })
    } else {
      await upsert.mutateAsync({ current_streak: 1, longest_streak: 1, last_activity_date: today })
    }
  }
}

export function useSetSeasonGoal() {
  const { upsert, query } = useStreakData()
  return async function setGoal(goal: number) {
    const current = query.data
    await upsert.mutateAsync({
      current_streak: current?.current_streak ?? 1,
      longest_streak: current?.longest_streak ?? 1,
      last_activity_date: current?.last_activity_date ?? new Date().toISOString().split('T')[0],
      season_goal: goal,
    })
  }
}

// ─── Master gamification hook ─────────────────────────────────────────────────
export function useGamification() {
  const { user } = useAuth()
  const { data: apps = [] } = useApplications()
  const { query: streakQuery } = useStreakData()

  const countsQuery = useQuery({
    queryKey: ['xp-counts'],
    queryFn: () => fetchXPCounts(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  })

  const counts = countsQuery.data ?? {
    docCount: 0, interviewCount: 0, noteCount: 0, contactCount: 0, acceptedCount: 0, offerCount: 0,
  }
  const streak   = streakQuery.data?.current_streak   ?? 0
  const longest  = streakQuery.data?.longest_streak   ?? 0
  const goalData = streakQuery.data?.season_goal      ?? 50
  const xp       = computeXP(apps, counts)
  const level    = xpToLevel(xp)

  const achievements = computeAchievements(
    apps.map(a => ({ stage: a.stage, app_type: a.app_type, priority: a.priority, created_at: a.created_at })),
    counts,
    streak
  )
  const unlockedCount = achievements.filter(a => a.unlocked).length

  const challenges = computeWeeklyChallenges(
    apps.map(a => ({ created_at: a.created_at, stage: a.stage })),
    counts.interviewCount,
    counts.noteCount
  )

  return {
    xp, level,
    streak, longest,
    seasonGoal: goalData,
    seasonProgress: Math.min(100, Math.round((apps.length / goalData) * 100)),
    achievements, unlockedCount,
    challenges,
    isLoading: countsQuery.isLoading || streakQuery.isLoading,
  }
}
