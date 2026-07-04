import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, LayoutDashboard, List, Calendar, Users, ArrowRight, Loader2 } from 'lucide-react'
import { gsap } from 'gsap'
import { useApplications } from '@/hooks/useApplications'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  icon: React.ElementType
  label: string
  sub?: string
  action: () => void
  group: 'actions' | 'navigate' | 'apps'
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { data: applications = [], isLoading } = useApplications()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const go = useCallback((path: string) => {
    navigate(path)
    onClose()
  }, [navigate, onClose])

  const staticItems: CommandItem[] = [
    { id: 'new-app', icon: Plus, label: 'Add new application', sub: 'Create a new job application', action: () => go('/applications/new'), group: 'actions' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Go to Dashboard', action: () => go('/dashboard'), group: 'navigate' },
    { id: 'applications', icon: List, label: 'Go to Applications', action: () => go('/applications'), group: 'navigate' },
    { id: 'calendar', icon: Calendar, label: 'Go to Calendar', action: () => go('/calendar'), group: 'navigate' },
    { id: 'contacts', icon: Users, label: 'Go to Contacts', action: () => go('/contacts'), group: 'navigate' },
  ]

  const appItems: CommandItem[] = applications
    .filter(a => {
      if (!query.trim()) return false
      const q = query.toLowerCase()
      return a.company_name.toLowerCase().includes(q) || a.role_title.toLowerCase().includes(q)
    })
    .slice(0, 5)
    .map(a => ({
      id: a.id,
      icon: ArrowRight,
      label: a.company_name,
      sub: a.role_title,
      action: () => go(`/applications/${a.id}`),
      group: 'apps' as const,
    }))

  const filtered = query.trim()
    ? [...appItems, ...staticItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))]
    : staticItems

  useEffect(() => { setSelected(0) }, [query])

  // Mount animation
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        if (backdropRef.current) gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.18 })
        if (panelRef.current) gsap.fromTo(panelRef.current,
          { scale: 0.95, opacity: 0, y: -12 },
          { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: 'back.out(1.4)' }
        )
      })
    }
  }, [open])

  function handleClose() {
    if (backdropRef.current) gsap.to(backdropRef.current, { opacity: 0, duration: 0.15 })
    if (panelRef.current) gsap.to(panelRef.current, { scale: 0.95, opacity: 0, y: -8, duration: 0.15, onComplete: onClose })
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'Escape') { handleClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); filtered[selected]?.action() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, selected])

  if (!open) return null

  const groups = [
    { key: 'apps', label: 'Applications' },
    { key: 'actions', label: 'Actions' },
    { key: 'navigate', label: 'Navigate' },
  ]

  return (
    <div
      ref={backdropRef}
      className="cmd-backdrop fixed inset-0 z-[100] bg-black/40 flex items-start justify-center pt-[15vh]"
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-[560px] mx-4 rounded-2xl border bg-card card-shadow-hover overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search applications, navigate…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2 scrollbar-thin">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No results</p>
          ) : (
            <>
              {groups.map(g => {
                const items = filtered.filter(i => i.group === g.key)
                if (!items.length) return null
                const groupStart = filtered.findIndex(i => i.group === g.key)
                return (
                  <div key={g.key}>
                    <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {g.label}
                    </p>
                    {items.map((item, localIdx) => {
                      const globalIdx = groupStart + localIdx
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            selected === globalIdx ? 'bg-primary/8 text-primary' : 'hover:bg-muted/60'
                          )}
                          onMouseEnter={() => setSelected(globalIdx)}
                          onClick={item.action}
                        >
                          <div className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                            selected === globalIdx ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground'
                          )}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.label}</p>
                            {item.sub && <p className="text-xs text-muted-foreground truncate">{item.sub}</p>}
                          </div>
                          {selected === globalIdx && <ArrowRight className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span><kbd className="font-medium">↑↓</kbd> navigate</span>
          <span><kbd className="font-medium">↵</kbd> open</span>
          <span><kbd className="font-medium">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
