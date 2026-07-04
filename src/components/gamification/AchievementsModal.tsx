import { useEffect, useRef } from 'react'
import { X, Lock } from 'lucide-react'
import { gsap } from 'gsap'
import { cn } from '@/lib/utils'
import type { Achievement } from '@/hooks/useGamification'

interface AchievementsModalProps {
  open: boolean
  onClose: () => void
  achievements: Achievement[]
  unlockedCount: number
}

const rarityStyles: Record<Achievement['rarity'], string> = {
  common:    'border-border bg-muted/40',
  rare:      'border-blue-400/40 bg-blue-500/5',
  epic:      'border-purple-400/40 bg-purple-500/5',
  legendary: 'border-amber-400/50 bg-amber-500/8',
}

const rarityLabel: Record<Achievement['rarity'], string> = {
  common:    'Common',
  rare:      'Rare',
  epic:      'Epic',
  legendary: 'Legendary',
}

const rarityBadge: Record<Achievement['rarity'], string> = {
  common:    'bg-muted text-muted-foreground',
  rare:      'bg-blue-500/15 text-blue-500',
  epic:      'bg-purple-500/15 text-purple-500',
  legendary: 'bg-amber-500/15 text-amber-500',
}

export function AchievementsModal({ open, onClose, achievements, unlockedCount }: AchievementsModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef    = useRef<HTMLDivElement>(null)
  const gridRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => {
        if (backdropRef.current) gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 })
        if (panelRef.current)    gsap.fromTo(panelRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' })
        if (gridRef.current) {
          gsap.fromTo(gridRef.current.children,
            { opacity: 0, y: 16, scale: 0.92 },
            { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.04, ease: 'back.out(1.4)', delay: 0.1 }
          )
        }
      })
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="cmd-backdrop fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-2xl bg-card rounded-2xl border card-shadow-hover overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="font-bold text-base">Achievements</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unlockedCount} of {achievements.length} unlocked
            </p>
          </div>
          {/* XP from achievements */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                {Array.from({ length: achievements.length }).map((_, i) => (
                  <div key={i} className={cn('h-1.5 w-1.5 rounded-full transition-colors', i < unlockedCount ? 'bg-primary' : 'bg-muted')} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{Math.round((unlockedCount / achievements.length) * 100)}% complete</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto scrollbar-thin p-6">
          <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map(a => (
              <div
                key={a.id}
                className={cn(
                  'relative rounded-xl border p-4 flex flex-col items-center text-center gap-2 transition-all',
                  a.unlocked ? rarityStyles[a.rarity] : 'border-border bg-muted/20 opacity-50 grayscale'
                )}
              >
                {/* Rarity badge */}
                {a.unlocked && (
                  <span className={cn('absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full', rarityBadge[a.rarity])}>
                    {rarityLabel[a.rarity]}
                  </span>
                )}

                {/* Icon */}
                <div className={cn(
                  'text-3xl leading-none flex items-center justify-center w-14 h-14 rounded-xl',
                  a.unlocked ? 'bg-background/60' : 'bg-muted/40'
                )}>
                  {a.unlocked ? a.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
                </div>

                {/* Text */}
                <div>
                  <p className={cn('text-xs font-bold leading-tight', !a.unlocked && 'text-muted-foreground')}>{a.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{a.desc}</p>
                </div>

                {/* Legendary glow */}
                {a.unlocked && a.rarity === 'legendary' && (
                  <div className="absolute inset-0 rounded-xl ring-1 ring-amber-400/30 pointer-events-none" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
