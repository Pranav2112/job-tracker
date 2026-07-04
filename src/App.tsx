import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CommandPalette } from '@/components/common/CommandPalette'
import { ShortcutsOverlay } from '@/components/common/ShortcutsOverlay'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ApplicationsPage } from '@/pages/ApplicationsPage'
import { NewApplicationPage } from '@/pages/NewApplicationPage'
import { ApplicationDetailPage } from '@/pages/ApplicationDetailPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { Loader2 } from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Global keyboard shortcut handler — lives inside Router so useNavigate works */
function GlobalShortcuts({ onCmd }: { onCmd: () => void }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    if (!user) return
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target as HTMLElement).isContentEditable
      // Cmd+K / Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onCmd(); return }
      if (isInput) return
      switch (e.key) {
        case 'n': case 'N': e.preventDefault(); navigate('/applications/new'); break
        case 'k': case 'K': e.preventDefault(); navigate('/dashboard'); break
        case 'l': case 'L': e.preventDefault(); navigate('/applications'); break
        case 'c': case 'C': e.preventDefault(); navigate('/calendar'); break
        case 'u': case 'U': e.preventDefault(); navigate('/contacts'); break
        case '?': setShowShortcuts(true); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [user, navigate, onCmd])

  return <ShortcutsOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />
}

function AppRoutes() {
  const [cmdOpen, setCmdOpen] = useState(false)

  return (
    <>
      <GlobalShortcuts onCmd={() => setCmdOpen(true)} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/applications/new" element={<NewApplicationPage />} />
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <TooltipProvider>
              <AppRoutes />
              <Toaster position="bottom-right" richColors />
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
