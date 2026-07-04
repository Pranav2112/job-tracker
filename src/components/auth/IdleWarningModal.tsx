import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  /** Total seconds the user has before auto sign-out once the modal appears. */
  countdownSeconds: number
  onStay: () => void
  onSignOut: () => void
}

export function IdleWarningModal({ open, countdownSeconds, onStay, onSignOut }: Props) {
  const overlayRef  = useRef<HTMLDivElement>(null)
  const panelRef    = useRef<HTMLDivElement>(null)
  const [remaining, setRemaining] = useState(countdownSeconds)
  const [signingOut, setSigningOut] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset countdown whenever modal opens
  useEffect(() => {
    if (open) setRemaining(countdownSeconds)
  }, [open, countdownSeconds])

  // Countdown tick
  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          onSignOut()
          return 0
        }
        return prev - 1
      })
    }, 1_000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [open, onSignOut])

  // GSAP entrance / exit
  useEffect(() => {
    if (!overlayRef.current || !panelRef.current) return
    if (open) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' })
      gsap.fromTo(panelRef.current,   { opacity: 0, y: 32, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.4)' })
    }
  }, [open])

  async function handleSignOut() {
    setSigningOut(true)
    onSignOut()
  }

  if (!open) return null

  // SVG ring progress
  const radius      = 28
  const circumference = 2 * Math.PI * radius
  const progress    = remaining / countdownSeconds
  const dashOffset  = circumference * (1 - progress)

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const timeLabel = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}s`

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm rounded-2xl border bg-card shadow-2xl overflow-hidden"
      >
        {/* Top accent bar */}
        <div className="h-1 w-full gradient-primary" />

        <div className="px-8 py-8 space-y-6 text-center">
          {/* Countdown ring */}
          <div className="flex justify-center">
            <div className="relative flex items-center justify-center">
              <svg width="72" height="72" className="-rotate-90">
                {/* Track */}
                <circle
                  cx="36" cy="36" r={radius}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="4"
                />
                {/* Progress */}
                <circle
                  cx="36" cy="36" r={radius}
                  fill="none"
                  stroke={remaining <= 30 ? '#ef4444' : 'hsl(var(--primary))'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute text-sm font-bold tabular-nums text-foreground">
                {timeLabel}
              </span>
            </div>
          </div>

          {/* Copy */}
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">Still there?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You've been inactive for a while. For your security, you'll be
              signed out automatically when the timer reaches zero.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <Button
              className="w-full h-11 gradient-primary border-0 text-white font-semibold"
              onClick={onStay}
              disabled={signingOut}
            >
              Stay signed in
            </Button>
            <Button
              variant="ghost"
              className="w-full h-10 text-muted-foreground hover:text-foreground text-sm"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Sign out now
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
