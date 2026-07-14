import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, List, Calendar, Users, LogOut, Briefcase,
  Search, Sun, Moon, Command, X, Trophy, Menu, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useApplications } from '@/hooks/useApplications'
import { animateSidebarIn } from '@/lib/animations'
import { useGamification } from '@/hooks/useGamification'
import { AchievementsModal } from '@/components/gamification/AchievementsModal'
import { useProfile } from '@/hooks/useProfile'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',    shortcut: 'K' },
  { to: '/applications', icon: List,            label: 'Applications', shortcut: 'L' },
  { to: '/calendar',     icon: Calendar,        label: 'Calendar',     shortcut: 'C' },
  { to: '/contacts',     icon: Users,           label: 'Contacts',     shortcut: 'U' },
]

// ── Shared nav content (used by both desktop and mobile drawer) ───────────────

interface NavContentProps {
  onNav?: () => void
}

function NavContent({ onNav }: NavContentProps) {
  const { signOut, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { data: applications = [] } = useApplications()
  const { level, streak, achievements, unlockedCount } = useGamification()
  const { data: profile } = useProfile()

  const [searchOpen, setSearchOpen]       = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) {
      const id = setTimeout(() => searchRef.current?.focus(), 50)
      return () => clearTimeout(id)
    } else {
      setSearchQuery('')
    }
  }, [searchOpen])

  const searchResults = searchQuery.trim()
    ? applications.filter(a =>
        a.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.role_title.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : []

  async function handleSignOut() {
    await signOut()
    navigate('/login')
    onNav?.()
  }

  const email    = user?.email ?? ''
  const initials = (profile?.full_name ?? email).slice(0, 2).toUpperCase() || '?'
  const avatarUrl = profile?.avatar_url

  function go(path: string) { navigate(path); onNav?.() }

  return (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border/60 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-white shadow-sm shrink-0">
          <Briefcase className="h-4 w-4" />
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <p className="text-sm font-bold tracking-tight">AppTracker</p>
          <p className="text-[10px] text-muted-foreground font-medium">Summer 2027</p>
        </div>
      </div>

      {/* XP / Level bar */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <div className="rounded-xl border bg-card/50 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⚡</span>
              <span className="text-xs font-semibold text-foreground">{level.title}</span>
              <span className="text-[10px] text-muted-foreground ml-0.5">Lv.{level.level}</span>
            </div>
            {streak > 0 && (
              <span className="text-[11px] font-bold flex items-center gap-0.5">
                🔥<span className="text-orange-400">{streak}</span>
              </span>
            )}
          </div>
          <div className="relative h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-700"
              style={{ width: `${level.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{level.xp} XP</span>
            <span>{level.progress}% → {level.next?.title ?? 'MAX'}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-1 pb-1 shrink-0">
        {!searchOpen ? (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground text-xs transition-all"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Search apps…</span>
            <span className="flex items-center gap-0.5 text-[10px]">
              <Command className="h-3 w-3" /><span>K</span>
            </span>
          </button>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/40 bg-card glow-primary">
              <Search className="h-3.5 w-3.5 text-primary shrink-0" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
              />
              <button onClick={() => setSearchOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-lg z-50 overflow-hidden">
                {searchResults.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { go(`/applications/${a.id}`); setSearchOpen(false) }}
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0"
                  >
                    <p className="text-xs font-medium truncate">{a.company_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{a.role_title}</p>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim() && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-lg z-50 px-3 py-4 text-center text-xs text-muted-foreground">
                No results
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Menu</p>
        {navItems.map(({ to, icon: Icon, label, shortcut }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNav}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all',
                  isActive ? 'gradient-primary text-white shadow-sm' : 'bg-muted/60 group-hover:bg-muted'
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="flex-1">{label}</span>
                <kbd className={cn(
                  'text-[10px] font-medium transition-opacity',
                  isActive ? 'opacity-60 text-primary' : 'opacity-0 group-hover:opacity-40'
                )}>
                  {shortcut}
                </kbd>
              </>
            )}
          </NavLink>
        ))}

        {/* Achievements */}
        <button
          onClick={() => setAchievementsOpen(true)}
          className="group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-150"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 group-hover:bg-muted transition-all">
            <Trophy className="h-3.5 w-3.5" />
          </div>
          <span className="flex-1 text-left">Achievements</span>
          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
            {unlockedCount}
          </span>
        </button>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 border-t border-border/60 space-y-1 shrink-0">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60">
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </div>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        <div className="flex items-center gap-2 px-1 py-1">
          <button
            onClick={() => go('/profile')}
            className="flex items-center gap-2 flex-1 min-w-0 rounded-lg hover:bg-muted/60 transition-colors px-2 py-1.5 group"
            title="Profile & settings"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-primary/30 transition-all" />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-primary text-white text-[10px] font-bold ring-1 ring-white/10">
                {initials}
              </div>
            )}
            <p className="flex-1 text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors">{email}</p>
          </button>
          <button
            onClick={() => go('/profile')}
            title="Settings"
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted shrink-0"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AchievementsModal
        open={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
        achievements={achievements}
        unlockedCount={unlockedCount}
      />
    </>
  )
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

export function Sidebar() {
  const sidebarRef = useRef<HTMLDivElement>(null)
  useEffect(() => { animateSidebarIn(sidebarRef.current) }, [])

  return (
    <aside ref={sidebarRef} className="hidden md:flex flex-col w-60 shrink-0 sidebar-bg border-r h-full">
      <NavContent />
    </aside>
  )
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-72 sidebar-bg border-r md:hidden',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent onNav={onClose} />
      </div>
    </>
  )
}

// ── Bottom tab bar for mobile ─────────────────────────────────────────────────

interface BottomNavProps {
  onMenuOpen: () => void
}

export function BottomNav({ onMenuOpen }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm z-40 flex safe-bottom">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center justify-center py-2.5 text-[10px] gap-1 font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={cn('flex h-6 w-6 items-center justify-center rounded-lg transition-all', isActive && 'bg-primary/10')}>
                <Icon className="h-4 w-4" />
              </div>
              {label}
            </>
          )}
        </NavLink>
      ))}
      {/* More button */}
      <button
        onClick={onMenuOpen}
        className="flex-1 flex flex-col items-center justify-center py-2.5 text-[10px] gap-1 font-medium text-muted-foreground transition-colors"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg">
          <Menu className="h-4 w-4" />
        </div>
        More
      </button>
    </nav>
  )
}
