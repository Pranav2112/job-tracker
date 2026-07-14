import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, Trash2, ExternalLink, Search, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useContacts, useCreateContact, useDeleteContact, useUpdateContact } from '@/hooks/useContacts'
import { formatDate } from '@/lib/utils'
import type { Contact } from '@/types'

const RELATIONSHIPS = ['Recruiter', 'Referral', 'Alum', 'HiringManager', 'Other'] as const

function ContactDialog({ contact, open, onClose }: { contact?: Contact | null; open: boolean; onClose: () => void }) {
  const create = useCreateContact()
  const update = useUpdateContact()
  const isEdit = !!contact

  const blank = { name: '', role_title: '', relationship: 'Other', linkedin_url: '', email: '', notes: '', last_contacted: '' }
  const [form, setForm] = useState(contact ? {
    name: contact.name,
    role_title: contact.role_title ?? '',
    relationship: contact.relationship,
    linkedin_url: contact.linkedin_url ?? '',
    email: contact.email ?? '',
    notes: contact.notes ?? '',
    last_contacted: contact.last_contacted ?? '',
  } : blank)

  const f = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))
  })

  async function handleSave() {
    if (!form.name.trim()) return
    const payload = {
      name: form.name,
      role_title: form.role_title || null,
      relationship: form.relationship as Contact['relationship'],
      linkedin_url: form.linkedin_url || null,
      email: form.email || null,
      notes: form.notes || null,
      last_contacted: form.last_contacted || null,
    }
    if (isEdit && contact) {
      await update.mutateAsync({ id: contact.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  const pending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit contact' : 'Add contact'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
              <Input {...f('name')} placeholder="Jane Smith" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role / title</Label>
              <Input {...f('role_title')} placeholder="Software Recruiter" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Relationship</Label>
              <Select value={form.relationship} onValueChange={v => setForm(p => ({ ...p, relationship: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last contacted</Label>
              <Input type="date" {...f('last_contacted')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" {...f('email')} placeholder="jane@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">LinkedIn URL</Label>
              <Input {...f('linkedin_url')} placeholder="https://linkedin.com/in/…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea {...f('notes')} placeholder="How you know them, interaction history…" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isEdit ? 'Save changes' : 'Add contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ContactsPage() {
  const navigate = useNavigate()
  const { data: contacts = [], isLoading } = useContacts()
  const del = useDeleteContact()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.role_title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Add contact
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {search ? 'No contacts match your search.' : 'No contacts yet. Add someone you talked to or who can refer you.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    {c.role_title && <p className="text-xs text-muted-foreground truncate">{c.role_title}</p>}
                    <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{c.relationship}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditing(c); setDialogOpen(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => del.mutate(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                {c.linkedin_url && (
                  <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> LinkedIn
                  </a>
                )}
                {c.last_contacted && <p className="text-xs text-muted-foreground">Last contact: {formatDate(c.last_contacted)}</p>}

                {(c.application_contacts?.length ?? 0) > 0 && (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Linked to {c.application_contacts!.length} application{c.application_contacts!.length !== 1 ? 's' : ''}</p>
                    <button
                      onClick={() => navigate(`/applications/${c.application_contacts![0].application_id}`)}
                      className="text-xs text-primary hover:underline"
                    >
                      View application →
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ContactDialog
        key={editing?.id ?? 'new'}
        contact={editing}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
      />
    </div>
  )
}
