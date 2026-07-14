import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { gsap } from 'gsap'

interface ShortcutsOverlayProps {
  open: boolean
  onClose: () => void
}

const shortcuts = [
  { keys: ['⌘', 'K'], label: 'Open command palette' },
  { keys: ['N'], label: 'New application' },
  { keys: ['K'], label: 'Go to Dashboard (Kanban)' },
  { keys: ['L'], label: 'Go to Applications (List)' },
  { keys: ['C'], label: 'Go to Calendar' },
  { keys: ['U'], label: 'Go to Contacts (Users)' },
  { keys: ['?'], label: 'Show this overlay' },
  { keys: ['Esc'], label: 'Close modal / palette' },
]

export function ShortcutsOverlay({ open, onClose }: ShortcutsOverlayProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        if (backdropRef.current) gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.18 })
        if (panelRef.current) gsap.fromTo(panelRef.current, { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.24, ease: 'back.out(1.4)' })
      })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="cmd-backdrop fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm rounded-2xl border bg-card card-shadow-hover p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          <button onClick={onClose} aria-label="Close shortcuts" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map(k => (
                  <kbd key={k} className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1.5 rounded border border-border bg-muted text-xs font-medium">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
