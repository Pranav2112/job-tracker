import { useEffect, useRef } from 'react'
import { Briefcase, LayoutDashboard, Trophy, Zap } from 'lucide-react'
import { gsap } from 'gsap'

const features = [
  { icon: LayoutDashboard, text: 'Visual Kanban pipeline for every stage' },
  { icon: Zap,             text: 'Completeness scores & next-action prompts' },
  { icon: Trophy,          text: 'XP system, streaks & achievement badges' },
]

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const leftRef  = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(leftRef.current,
        { opacity: 0, x: -24 },
        { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }
      )
      gsap.fromTo(rightRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.1 }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left branding panel ── */}
      <div
        ref={leftRef}
        className="hidden lg:flex lg:w-[480px] shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0a1a12 0%, #0d2a1c 60%, #0a1a12 100%)' }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow blob */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-primary/30">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg leading-none text-white">AppTracker</p>
            <p className="text-xs text-white/40 font-medium mt-0.5">Summer 2027</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
              Track smarter.<br />Land faster.
            </h1>
            <p className="text-white/50 text-base leading-relaxed">
              The job search OS built for students who take their career seriously.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <div className="relative">
          <p className="text-xs text-white/25 font-medium">Free forever for students. No credit card required.</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div ref={rightRef} className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
            <Briefcase className="h-[18px] w-[18px] text-white" />
          </div>
          <p className="font-bold text-base">AppTracker</p>
        </div>

        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  )
}
