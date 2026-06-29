import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/applications': 'Applications',
  '/calendar': 'Calendar',
  '/contacts': 'Contacts',
}

export function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const title = Object.entries(PAGE_TITLES).find(([path]) => pathname.startsWith(path))?.[1] ?? 'AppTracker'

  return (
    <header className="h-16 border-b flex items-center justify-between px-6 bg-background shrink-0">
      <h1 className="text-lg font-semibold">{title}</h1>
      {(pathname === '/dashboard' || pathname === '/applications') && (
        <Button size="sm" onClick={() => navigate('/applications/new')}>
          <Plus className="h-4 w-4 mr-1" /> Add Application
        </Button>
      )}
    </header>
  )
}
