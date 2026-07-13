import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/applications': 'Applications',
  '/calendar':     'Calendar',
  '/contacts':     'Contacts',
  '/profile':      'Profile',
}

interface HeaderProps {
  onMenuOpen: () => void
}

export function Header({ onMenuOpen }: HeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const title = Object.entries(PAGE_TITLES).find(([path]) => pathname.startsWith(path))?.[1] ?? 'AppTracker'
  const showAdd = pathname === '/dashboard' || pathname === '/applications'

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0 gap-3">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuOpen}
        className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-base font-semibold tracking-tight flex-1">{title}</h1>

      {showAdd && (
        <Button
          size="sm"
          onClick={() => navigate('/applications/new')}
          className="gradient-primary border-0 text-white font-medium h-8 px-3 text-xs shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">Add Application</span>
          <span className="sm:hidden">Add</span>
        </Button>
      )}
    </header>
  )
}
