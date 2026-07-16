import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Sparkles, LayoutDashboard, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'apptracker_welcomed'

const STEPS = [
  {
    icon: Sparkles,
    color: 'bg-primary/10 text-primary',
    title: 'Auto-fill from a URL',
    desc: 'Paste any Greenhouse, Lever, or Ashby posting — we\'ll fill in company, role, location and salary automatically.',
  },
  {
    icon: LayoutDashboard,
    color: 'bg-sky-500/10 text-sky-500',
    title: 'Track your pipeline',
    desc: 'Drag cards across the Kanban board as you progress from Applied → Interview → Offer. Your streak builds as you stay consistent.',
  },
  {
    icon: Trophy,
    color: 'bg-amber-500/10 text-amber-500',
    title: 'Earn XP & achievements',
    desc: 'Every application, interview, and note earns you XP. Level up, complete weekly challenges, and celebrate wins with confetti.',
  },
]

interface Props {
  hasApplications: boolean
}

export function WelcomeModal({ hasApplications }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!hasApplications && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
    }
  }, [hasApplications])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  function handleStart() {
    dismiss()
    navigate('/applications/new')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header gradient */}
        <div className="gradient-primary px-6 py-8 text-white text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-white/20 mb-4">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold">Welcome to AppTracker</h2>
          <p className="text-sm text-white/80 mt-1">Your internship & job search command center</p>
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Steps */}
        <div className="p-6">
          <div className="space-y-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const active = i === step
              return (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    'w-full flex items-start gap-4 p-3.5 rounded-xl border text-left transition-all duration-150',
                    active
                      ? 'border-primary/30 bg-primary/5 shadow-sm'
                      : 'border-transparent hover:bg-muted/50'
                  )}
                >
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', s.color)}>
                    <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{s.title}</p>
                    {active && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mt-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === step ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
              />
            ))}
          </div>

          {/* CTA */}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1 h-10" onClick={dismiss}>
              Skip tour
            </Button>
            {step < STEPS.length - 1 ? (
              <Button className="flex-1 h-10 gradient-primary border-0 text-white" onClick={() => setStep(s => s + 1)}>
                Next →
              </Button>
            ) : (
              <Button className="flex-1 h-10 gradient-primary border-0 text-white font-semibold" onClick={handleStart}>
                Add first application
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
