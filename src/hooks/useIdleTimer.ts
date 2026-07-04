import { useEffect, useRef, useCallback } from 'react'

const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel',
] as const

interface IdleTimerOptions {
  /** Show warning modal after this many ms of inactivity. */
  warnAfterMs: number
  /** Auto sign out after this many ms of inactivity (must be > warnAfterMs). */
  logoutAfterMs: number
  /** Called once when idle crosses the warn threshold. */
  onWarn: () => void
  /** Called once when idle crosses the logout threshold. */
  onTimeout: () => void
  /** Called when activity is detected while warning is already showing — lets
   *  the modal dismiss itself. */
  onActivity: () => void
  /** Pause the timer entirely (e.g. user is not logged in). */
  enabled: boolean
}

export function useIdleTimer({
  warnAfterMs,
  logoutAfterMs,
  onWarn,
  onTimeout,
  onActivity,
  enabled,
}: IdleTimerOptions) {
  const lastActivity = useRef(Date.now())
  const warned       = useRef(false)

  const handleActivity = useCallback(() => {
    lastActivity.current = Date.now()
    if (warned.current) {
      warned.current = false
      onActivity()
    }
  }, [onActivity])

  useEffect(() => {
    if (!enabled) return

    ACTIVITY_EVENTS.forEach(e =>
      window.addEventListener(e, handleActivity, { passive: true })
    )

    // Poll every 10 s — low overhead, precise enough for minute-scale thresholds.
    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivity.current

      if (idleMs >= logoutAfterMs) {
        clearInterval(interval)
        onTimeout()
      } else if (idleMs >= warnAfterMs && !warned.current) {
        warned.current = true
        onWarn()
      }
    }, 10_000)

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity))
      clearInterval(interval)
    }
  }, [enabled, warnAfterMs, logoutAfterMs, onWarn, onTimeout, handleActivity])
}
