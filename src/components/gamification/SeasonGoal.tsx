import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Edit2, Check, X, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSetSeasonGoal } from '@/hooks/useGamification'

interface SeasonGoalProps {
  appCount: number
  goal: number
  progress: number
}

export function SeasonGoal({ appCount, goal, progress }: SeasonGoalProps) {
  const barRef        = useRef<HTMLDivElement>(null)
  const setGoal       = useSetSeasonGoal()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(goal.toString())

  // Sync draft when goal prop changes externally (e.g. DB refresh)
  useEffect(() => { setDraft(goal.toString()) }, [goal])

  useEffect(() => {
    if (barRef.current) {
      gsap.fromTo(barRef.current, { scaleX: 0 }, { scaleX: Math.min(1, progress / 100), duration: 1, ease: 'power3.out', transformOrigin: 'left', delay: 0.3 })
    }
  }, [progress])

  async function handleSave() {
    const v = parseInt(draft)
    if (!isNaN(v) && v > 0) await setGoal(v)
    setEditing(false)
  }

  const milestones = [25, 50, 75, 100].filter(m => m <= goal + 10)

  return (
    <div className="rounded-xl border bg-card card-shadow p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Season Goal</p>
        </div>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-16 h-6 text-xs text-center rounded-md border bg-background px-1 outline-none focus:ring-1 ring-primary"
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
            />
            <button onClick={handleSave} className="text-green-500 hover:text-green-400"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(goal.toString()); setEditing(true) }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="h-3 w-3" /> Edit goal
          </button>
        )}
      </div>

      {/* Count */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tabular-nums">{appCount}</span>
        <span className="text-sm text-muted-foreground font-medium">/ {goal} applications</span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div
            ref={barRef}
            className={cn(
              'h-full rounded-full transition-none',
              progress >= 100
                ? 'bg-green-500'
                : progress >= 60
                ? 'gradient-primary'
                : 'bg-primary/70'
            )}
            style={{ width: '100%' }}
          />
          {/* Milestone ticks */}
          {milestones.map(m => {
            const pct = Math.round((m / goal) * 100)
            if (pct >= 100) return null
            return (
              <div
                key={m}
                className="absolute top-0 bottom-0 w-px bg-background/60"
                style={{ left: `${pct}%` }}
              />
            )
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{progress}% to goal</span>
          {progress >= 100 && <span className="text-green-500 font-bold">🎉 Goal reached!</span>}
          {progress < 100 && <span>{goal - appCount} left</span>}
        </div>
      </div>
    </div>
  )
}
