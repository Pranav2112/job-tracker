import { useState, useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar, MobileSidebar, BottomNav } from './Sidebar'
import { Header } from './Header'
import { useAuth } from '@/contexts/AuthContext'
import { useIdleTimer } from '@/hooks/useIdleTimer'
import { IdleWarningModal } from '@/components/auth/IdleWarningModal'

const WARN_AFTER_MS   = 15 * 60 * 1_000
const LOGOUT_AFTER_MS = 20 * 60 * 1_000
const COUNTDOWN_SECS  = (LOGOUT_AFTER_MS - WARN_AFTER_MS) / 1_000

export function AppLayout() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [warnOpen,      setWarnOpen]      = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleWarn     = useCallback(() => setWarnOpen(true), [])
  const handleActivity = useCallback(() => setWarnOpen(false), [])
  const handleTimeout  = useCallback(async () => {
    setWarnOpen(false)
    await signOut()
    navigate('/login')
  }, [signOut, navigate])
  const handleStay     = useCallback(() => setWarnOpen(false), [])
  const handleSignOut  = useCallback(async () => {
    setWarnOpen(false)
    await signOut()
    navigate('/login')
  }, [signOut, navigate])

  useIdleTimer({
    warnAfterMs:   WARN_AFTER_MS,
    logoutAfterMs: LOGOUT_AFTER_MS,
    onWarn:        handleWarn,
    onTimeout:     handleTimeout,
    onActivity:    handleActivity,
    enabled:       !!user,
  })

  return (
    <>
      <div className="flex h-dvh overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Mobile drawer */}
        <MobileSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header onMenuOpen={() => setMobileNavOpen(true)} />
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            <Outlet />
          </main>
        </div>

        {/* Mobile bottom nav */}
        <BottomNav onMenuOpen={() => setMobileNavOpen(true)} />
      </div>

      <IdleWarningModal
        open={warnOpen}
        countdownSeconds={COUNTDOWN_SECS}
        onStay={handleStay}
        onSignOut={handleSignOut}
      />
    </>
  )
}
