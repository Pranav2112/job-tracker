import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Challenge } from '@/hooks/useGamification'

interface WeeklyChallengesProps {
  challenges: Challenge[]
}

export function WeeklyChallenges({ challenges }: WeeklyChallengesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current.children,
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: 0.35, stagger: 0.1, ease: 'power2.out', delay: 0.2 }
      )
    }
  }, [])

  const doneCount = challenges.filter(c => c.done).length

  return (
    <div className="rounded-xl border bg-card card-shadow p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <p className="text-sm font-bold">Weekly Challenges</p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {doneCount}/{challenges.length} done
        </span>
      </div>

      <div ref={containerRef} className="space-y-2">
        {challenges.map(c => (
          <div
            key={c.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-all',
              c.done
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-border bg-muted/30'
            )}
          >
            {/* Icon */}
            <span className="text-lg shrink-0">{c.icon}</span>

            {/* Description + progress */}
            <div className="flex-1 min-w-0">
              <p className={cn('text-xs font-medium leading-tight', c.done && 'line-through text-muted-foreground')}>
                {c.desc}
              </p>
              {!c.done && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.round((c.progress / c.target) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                    {c.progress}/{c.target}
                  </span>
                </div>
              )}
            </div>

            {/* Status + XP */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {c.done
                ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                : <Circle className="h-4 w-4 text-muted-foreground/40" />
              }
              <span className="text-[10px] font-bold text-primary">+{c.xpReward} XP</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
