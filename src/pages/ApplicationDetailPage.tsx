import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, ExternalLink, Trash2, Plus, FileText, User, Clock,
  Calendar as CalendarIcon, Edit, Check, X, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StageBadge } from '@/components/common/StageBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { AttentionFlag } from '@/components/common/AttentionFlag'
import { FilePreviewModal } from '@/components/common/FilePreviewModal'
import {
  useApplication, useUpdateApplication, useDeleteApplication,
} from '@/hooks/useApplications'
import {
  useInterviewRounds, useCreateInterviewRound, useUpdateInterviewRound, useDeleteInterviewRound,
  useResearchNotes, useCreateResearchNote, useUpdateResearchNote, useDeleteResearchNote,
  useDocuments, useUploadDocument, useAddDocumentLink, useDeleteDocument,
  useOffer, useUpsertOffer, useAddNegotiationEntry,
  useActivityLog,
} from '@/hooks/useDetailData'
import { useApplicationContacts } from '@/hooks/useContacts'
import { formatDate, formatCurrency } from '@/lib/utils'
import { computeCompleteness, scoreColor } from '@/lib/completeness'
import { animateIn } from '@/lib/animations'
import { PIPELINE_STAGES, STAGE_LABELS, APP_TYPE_LABELS, REMOTE_TYPE_LABELS } from '@/lib/constants'
import type { Application, Document, PipelineStage } from '@/types'

// ─── Quick edit inline field ──────────────────────────────────────────────────
function InlineEdit({ label, value, displayValue, onSave, type = 'text' }: {
  label: string; value: string; displayValue?: string; onSave: (v: string) => void; type?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  function save() { onSave(draft); setEditing(false) }
  function cancel() { setDraft(value); setEditing(false) }
  const shown = displayValue ?? value
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? (
        <div className="flex gap-1">
          <Input type={type} value={draft} onChange={e => setDraft(e.target.value)} className="h-8 text-sm" autoFocus />
          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={save}><Check className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancel}><X className="h-3.5 w-3.5" /></Button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm hover:text-primary group w-full text-left">
          <span className={shown ? '' : 'text-muted-foreground italic'}>{shown || 'Click to add…'}</span>
          <Edit className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0" />
        </button>
      )}
    </div>
  )
}

// ─── URL field with clickable link display ─────────────────────────────────────
function UrlField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  function save() { onSave(draft); setEditing(false) }
  function cancel() { setDraft(value); setEditing(false) }

  let hostname = ''
  try { if (value) hostname = new URL(value).hostname.replace(/^www\./, '') } catch { hostname = value }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? (
        <div className="flex gap-1">
          <Input type="url" value={draft} onChange={e => setDraft(e.target.value)} className="h-8 text-sm" placeholder="https://…" autoFocus />
          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={save}><Check className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancel}><X className="h-3.5 w-3.5" /></Button>
        </div>
      ) : value ? (
        <div className="flex items-center gap-1.5 group">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1 min-w-0"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{hostname}</span>
          </a>
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity shrink-0"
            title="Edit URL"
          >
            <Edit className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-muted-foreground italic hover:text-primary group w-full text-left">
          Click to add…
          <Edit className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0" />
        </button>
      )}
    </div>
  )
}

// ─── Documents Tab ────────────────────────────────────────────────────────────
function DocumentsTab({ applicationId }: { applicationId: string }) {
  const { data: docs = [] } = useDocuments(applicationId)
  const upload = useUploadDocument()
  const addLink = useAddDocumentLink()
  const deleteDoc = useDeleteDocument()
  const [preview, setPreview] = useState<Document | null>(null)
  const [tab, setTab] = useState<'upload' | 'link'>('upload')
  const [fileInput, setFileInput] = useState<File | null>(null)
  const [docType, setDocType] = useState('Resume')
  const [versionLabel, setVersionLabel] = useState('')
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  async function handleUpload() {
    if (!fileInput) return
    await upload.mutateAsync({ applicationId, file: fileInput, docType, versionLabel })
    setFileInput(null); setVersionLabel('')
  }

  async function handleAddLink() {
    if (!linkName || !linkUrl) return
    await addLink.mutateAsync({ applicationId, fileName: linkName, fileUrl: linkUrl, docType, versionLabel })
    setLinkName(''); setLinkUrl(''); setVersionLabel('')
  }

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Add document</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant={tab === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => setTab('upload')}>Upload file</Button>
            <Button variant={tab === 'link' ? 'default' : 'outline'} size="sm" onClick={() => setTab('link')}>Add link</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Resume', 'CoverLetter', 'Portfolio', 'Transcript', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Version label</Label>
              <Input className="h-9" placeholder="e.g. Resume v3" value={versionLabel} onChange={e => setVersionLabel(e.target.value)} />
            </div>
          </div>
          {tab === 'upload' ? (
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">File (PDF, DOCX, image)</Label>
                <Input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={e => setFileInput(e.target.files?.[0] ?? null)} className="h-9" />
              </div>
              <Button size="sm" onClick={handleUpload} disabled={!fileInput || upload.isPending}>
                {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Upload'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input placeholder="File name" value={linkName} onChange={e => setLinkName(e.target.value)} className="h-9" />
              <div className="flex gap-2">
                <Input placeholder="https://…" type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="h-9" />
                <Button size="sm" onClick={handleAddLink} disabled={!linkName || !linkUrl || addLink.isPending}>
                  {addLink.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document list */}
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No documents yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">{doc.doc_type}{doc.version_label ? ` · ${doc.version_label}` : ''}{doc.date_used ? ` · Used ${formatDate(doc.date_used)}` : ''}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setPreview(doc)}>Preview</Button>
                {doc.file_url && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteDoc.mutate({ id: doc.id, applicationId, storagePath: doc.storage_path })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <FilePreviewModal document={preview} open={!!preview} onClose={() => setPreview(null)} />
    </div>
  )
}

// ─── Single Interview Round Card (supports inline edit) ───────────────────────
function InterviewRoundCard({ round: r, applicationId }: { round: import('@/types').InterviewRound; applicationId: string }) {
  const update = useUpdateInterviewRound()
  const del = useDeleteInterviewRound()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ prep_notes: r.prep_notes ?? '', post_notes: r.post_notes ?? '', outcome: r.outcome, scheduled_at: r.scheduled_at ?? '' })

  const outcomeColor = (o: string) => o === 'Passed' ? 'text-green-600' : o === 'Failed' ? 'text-red-600' : o === 'Cancelled' ? 'text-muted-foreground' : 'text-amber-600'

  async function handleSave() {
    await update.mutateAsync({ id: r.id, applicationId, ...draft })
    setEditing(false)
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{r.round_type} · {r.format}</p>
            {r.scheduled_at && <p className="text-xs text-muted-foreground">{formatDate(r.scheduled_at, 'MMM d, yyyy HH:mm')}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${outcomeColor(r.outcome)}`}>{r.outcome}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setDraft({ prep_notes: r.prep_notes ?? '', post_notes: r.post_notes ?? '', outcome: r.outcome, scheduled_at: r.scheduled_at ?? '' }); setEditing(e => !e) }}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => del.mutate({ id: r.id, applicationId })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {editing ? (
          <div className="space-y-2 pt-1 border-t">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Scheduled</Label><Input type="datetime-local" className="h-8 text-xs" value={draft.scheduled_at} onChange={e => setDraft(d => ({ ...d, scheduled_at: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Outcome</Label>
                <Select value={draft.outcome} onValueChange={v => setDraft(d => ({ ...d, outcome: v as typeof r.outcome }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Pending','Passed','Failed','Cancelled'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Prep notes</Label><Textarea rows={2} value={draft.prep_notes} onChange={e => setDraft(d => ({ ...d, prep_notes: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Post-interview notes</Label><Textarea rows={2} value={draft.post_notes} onChange={e => setDraft(d => ({ ...d, post_notes: e.target.value }))} /></div>
            <div className="flex gap-2"><Button size="sm" onClick={handleSave} disabled={update.isPending}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div>
          </div>
        ) : (
          <>
            {r.prep_notes && <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Prep</p><p className="text-sm whitespace-pre-wrap">{r.prep_notes}</p></div>}
            {r.post_notes && <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Post-interview</p><p className="text-sm whitespace-pre-wrap">{r.post_notes}</p></div>}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Interviews Tab ───────────────────────────────────────────────────────────
function InterviewsTab({ applicationId }: { applicationId: string }) {
  const { data: rounds = [] } = useInterviewRounds(applicationId)
  const create = useCreateInterviewRound()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ round_type: 'PhoneScreen', scheduled_at: '', format: 'Video', prep_notes: '', post_notes: '', outcome: 'Pending' })

  async function handleAdd() {
    await create.mutateAsync({ ...form, application_id: applicationId, round_type: form.round_type as never, format: form.format as never, outcome: form.outcome as never, scheduled_at: form.scheduled_at || null })
    setAdding(false)
    setForm({ round_type: 'PhoneScreen', scheduled_at: '', format: 'Video', prep_notes: '', post_notes: '', outcome: 'Pending' })
  }

  return (
    <div className="space-y-4">
      <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add round
      </Button>

      {adding && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Round type</Label>
                <Select value={form.round_type} onValueChange={v => setForm(f => ({ ...f, round_type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['PhoneScreen','Technical','Behavioral','CaseStudy','Onsite','Final','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Format</Label>
                <Select value={form.format} onValueChange={v => setForm(f => ({ ...f, format: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Onsite">Onsite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Scheduled</Label>
                <Input type="datetime-local" className="h-9" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Outcome</Label>
                <Select value={form.outcome} onValueChange={v => setForm(f => ({ ...f, outcome: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prep notes</Label>
              <Textarea placeholder="Topics to study, focus areas…" rows={2} value={form.prep_notes} onChange={e => setForm(f => ({ ...f, prep_notes: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Post-interview notes</Label>
              <Textarea placeholder="How it went, questions asked…" rows={2} value={form.post_notes} onChange={e => setForm(f => ({ ...f, post_notes: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save round'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rounds.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground text-center py-6">No interview rounds yet.</p>
      ) : (
        <div className="space-y-3">
          {rounds.map(r => (
            <InterviewRoundCard key={r.id} round={r} applicationId={applicationId} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Research Notes Tab ───────────────────────────────────────────────────────
function ResearchTab({ applicationId }: { applicationId: string }) {
  const { data: notes = [] } = useResearchNotes(applicationId)
  const create = useCreateResearchNote()
  const update = useUpdateResearchNote()
  const del = useDeleteResearchNote()
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  async function handleAdd() {
    if (!content.trim()) return
    await create.mutateAsync({ applicationId, content: content.trim() })
    setContent('')
  }

  async function handleSaveEdit(id: string) {
    if (!editDraft.trim()) return
    await update.mutateAsync({ id, applicationId, content: editDraft.trim() })
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea placeholder="Add a research note — culture, news, Glassdoor sentiment, people you know…" rows={3} value={content} onChange={e => setContent(e.target.value)} />
        <Button size="sm" onClick={handleAdd} disabled={!content.trim() || create.isPending}>
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1" />Add note</>}
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No research notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map(n => (
            <Card key={n.id}>
              <CardContent className="pt-4">
                {editingId === n.id ? (
                  <div className="space-y-2">
                    <Textarea rows={3} value={editDraft} onChange={e => setEditDraft(e.target.value)} autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(n.id)} disabled={update.isPending}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm whitespace-pre-wrap flex-1">{n.content}</p>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditingId(n.id); setEditDraft(n.content) }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => del.mutate({ id: n.id, applicationId })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">{formatDate(n.created_at, 'MMM d, yyyy HH:mm')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Contacts Tab ─────────────────────────────────────────────────────────────
function ContactsTab({ applicationId }: { applicationId: string }) {
  const { data: contacts = [] } = useApplicationContacts(applicationId)
  return (
    <div className="space-y-3">
      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No contacts linked. Go to the Contacts page to add contacts and link them here.</p>
      ) : (
        contacts.map(c => (
          <Card key={c.id}>
            <CardContent className="pt-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.role_title}{c.relationship ? ` · ${c.relationship}` : ''}</p>
                {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">LinkedIn</a>}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

// ─── Offer Tab ────────────────────────────────────────────────────────────────
function OfferTab({ applicationId }: { applicationId: string }) {
  const { data: offer } = useOffer(applicationId)
  const upsert = useUpsertOffer()
  const addEntry = useAddNegotiationEntry()
  const [editing, setEditing] = useState(!offer)
  const [form, setForm] = useState({ base_salary: '', signing_bonus: '', stipend: '', housing: '', equity: '', other_perks: '', offer_deadline: '', final_outcome: '' })
  const [log, setLog] = useState('')

  const f = (k: keyof typeof form) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value })) })

  async function handleSave() {
    await upsert.mutateAsync({
      applicationId,
      base_salary: form.base_salary ? Number(form.base_salary) : null,
      signing_bonus: form.signing_bonus ? Number(form.signing_bonus) : null,
      stipend: form.stipend ? Number(form.stipend) : null,
      housing: form.housing ? Number(form.housing) : null,
      equity: form.equity || null,
      other_perks: form.other_perks || null,
      offer_deadline: form.offer_deadline || null,
      final_outcome: (form.final_outcome || null) as never,
    })
    setEditing(false)
  }

  async function handleAddLog() {
    if (!offer || !log.trim()) return
    await addEntry.mutateAsync({ offerId: offer.id, applicationId, content: log.trim() })
    setLog('')
  }

  return (
    <div className="space-y-4">
      {editing || !offer ? (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Offer details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Base salary ($)</Label><Input placeholder="120000" {...f('base_salary')} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Signing bonus ($)</Label><Input placeholder="10000" {...f('signing_bonus')} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Stipend/month ($)</Label><Input placeholder="7000" {...f('stipend')} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Housing ($)</Label><Input placeholder="2000" {...f('housing')} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Equity</Label><Input placeholder="0.1% / 10,000 RSUs" {...f('equity')} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Offer deadline</Label><Input type="date" {...f('offer_deadline')} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Other perks</Label><Textarea placeholder="401k match, health, PTO…" rows={2} {...f('other_perks')} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Outcome</Label>
              <Select value={form.final_outcome} onValueChange={v => setForm(p => ({ ...p, final_outcome: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pending…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>{upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save offer'}</Button>
              {offer && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm">Offer details</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => { setForm({ base_salary: String(offer.base_salary ?? ''), signing_bonus: String(offer.signing_bonus ?? ''), stipend: String(offer.stipend ?? ''), housing: String(offer.housing ?? ''), equity: offer.equity ?? '', other_perks: offer.other_perks ?? '', offer_deadline: offer.offer_deadline ?? '', final_outcome: offer.final_outcome ?? '' }); setEditing(true) }}>
              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {offer.base_salary != null && <div><p className="text-xs text-muted-foreground">Base salary</p><p className="font-medium">{formatCurrency(offer.base_salary)}</p></div>}
            {offer.signing_bonus != null && <div><p className="text-xs text-muted-foreground">Signing bonus</p><p className="font-medium">{formatCurrency(offer.signing_bonus)}</p></div>}
            {offer.stipend != null && <div><p className="text-xs text-muted-foreground">Stipend/month</p><p className="font-medium">{formatCurrency(offer.stipend)}</p></div>}
            {offer.housing != null && <div><p className="text-xs text-muted-foreground">Housing</p><p className="font-medium">{formatCurrency(offer.housing)}</p></div>}
            {offer.equity && <div><p className="text-xs text-muted-foreground">Equity</p><p className="font-medium">{offer.equity}</p></div>}
            {offer.offer_deadline && <div><p className="text-xs text-muted-foreground">Deadline</p><p className="font-medium">{formatDate(offer.offer_deadline)}</p></div>}
            {offer.final_outcome && <div><p className="text-xs text-muted-foreground">Outcome</p><p className="font-medium">{offer.final_outcome}</p></div>}
            {offer.other_perks && <div className="col-span-2"><p className="text-xs text-muted-foreground">Other perks</p><p>{offer.other_perks}</p></div>}
          </CardContent>
        </Card>
      )}

      {/* Negotiation log */}
      {offer && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Negotiation log</p>
          <div className="flex gap-2">
            <Textarea placeholder="Log a negotiation exchange…" rows={2} value={log} onChange={e => setLog(e.target.value)} />
            <Button size="sm" variant="outline" onClick={handleAddLog} disabled={!log.trim() || addEntry.isPending}>Add</Button>
          </div>
          {(offer.negotiation_log_entries ?? []).map(e => (
            <Card key={e.id}><CardContent className="pt-3 pb-3">
              <p className="text-sm whitespace-pre-wrap">{e.content}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(e.created_at, 'MMM d, yyyy HH:mm')}</p>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────
function ActivityTab({ applicationId }: { applicationId: string }) {
  const { data: log = [] } = useActivityLog(applicationId)

  function describe(entry: { event_type: string; payload: Record<string, unknown> }) {
    if (entry.event_type === 'stage_changed') return `Stage: ${STAGE_LABELS[entry.payload.from as PipelineStage]} → ${STAGE_LABELS[entry.payload.to as PipelineStage]}`
    if (entry.event_type === 'created') return `Application created in ${STAGE_LABELS[entry.payload.stage as PipelineStage]}`
    return entry.event_type.replace(/_/g, ' ')
  }

  return (
    <div className="space-y-2">
      {log.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p> : (
        log.map(e => (
          <div key={e.id} className="flex gap-3 items-start">
            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <div>
              <p className="text-sm">{describe(e)}</p>
              <p className="text-xs text-muted-foreground">{formatDate(e.created_at, 'MMM d, yyyy HH:mm')}</p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: app, isLoading } = useApplication(id!)
  const update = useUpdateApplication()
  const del = useDeleteApplication()
  const { data: docs = [] } = useDocuments(id ?? '')
  const { data: rounds = [] } = useInterviewRounds(id ?? '')
  const { data: contacts = [] } = useApplicationContacts(id ?? '')
  const { data: notes = [] } = useResearchNotes(id ?? '')
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => { animateIn(pageRef.current) }, [id])

  const { score, nextAction } = computeCompleteness(app ?? {} as Application, {
    docs: docs.length,
    interviews: rounds.length,
    contacts: contacts.length,
    notes: notes.length,
  })
  const color = scoreColor(score)

  async function save(field: keyof Application, value: string) {
    if (!app) return
    await update.mutateAsync({ id: app.id, [field]: value || null, prev: app })
  }

  async function handleDelete() {
    if (!app || !confirm(`Delete "${app.company_name}" application? This cannot be undone.`)) return
    await del.mutateAsync(app.id)
    navigate('/applications')
  }

  if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!app) return <div className="p-6 text-muted-foreground">Application not found.</div>

  return (
    <div ref={pageRef} className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          {app.posting_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={app.posting_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Job posting
              </a>
            </Button>
          )}
          {app.application_url && (
            <Button size="sm" asChild className="gradient-primary text-white border-0">
              <a href={app.application_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Apply now
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/30" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-tight">{app.company_name}</h2>
            <p className="text-muted-foreground">{app.role_title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AttentionFlag app={app} />
            <PriorityBadge priority={app.priority} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={app.stage} onValueChange={v => save('stage', v)}>
            <SelectTrigger className="w-auto border-0 p-0 h-auto shadow-none focus:ring-0">
              <StageBadge stage={app.stage} />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{APP_TYPE_LABELS[app.app_type]}</span>
          {app.remote_type && <span className="text-xs text-muted-foreground">{REMOTE_TYPE_LABELS[app.remote_type]}</span>}
          {app.location && <span className="text-xs text-muted-foreground">{app.location}</span>}
        </div>

        {/* Completeness bar + next action */}
        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}%</span>
          {nextAction && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg">
              <Zap className="h-3 w-3 text-amber-500 shrink-0" />
              <span className="truncate max-w-[200px]">{nextAction}</span>
            </div>
          )}
        </div>
      </div>

      {/* Core fields (2-col grid, inline edit) */}
      <Card>
        <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InlineEdit label="Company" value={app.company_name} onSave={v => save('company_name', v)} />
          <InlineEdit label="Role title" value={app.role_title} onSave={v => save('role_title', v)} />
          <InlineEdit label="Location" value={app.location ?? ''} onSave={v => save('location', v)} />
          <InlineEdit label="Salary info" value={app.salary_info ?? ''} onSave={v => save('salary_info', v)} />
          <InlineEdit label="Source" value={app.source ?? ''} onSave={v => save('source', v)} />
          <UrlField label="Posting URL" value={app.posting_url ?? ''} onSave={v => save('posting_url', v)} />
          <UrlField label="Application link" value={app.application_url ?? ''} onSave={v => save('application_url', v)} />
          <InlineEdit label="Date discovered" value={app.date_discovered ?? ''} displayValue={app.date_discovered ? formatDate(app.date_discovered) : undefined} type="date" onSave={v => save('date_discovered', v)} />
          <InlineEdit label="Date applied" value={app.date_applied ?? ''} displayValue={app.date_applied ? formatDate(app.date_applied) : undefined} type="date" onSave={v => save('date_applied', v)} />
          <div className="sm:col-span-2">
            <InlineEdit label="Deadline" value={app.deadline ?? ''} displayValue={app.deadline ? formatDate(app.deadline) : undefined} type="date" onSave={v => save('deadline', v)} />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              defaultValue={app.notes ?? ''}
              rows={4}
              placeholder="General notes…"
              onBlur={e => { if (e.target.value !== (app.notes ?? '')) save('notes', e.target.value) }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Created {formatDate(app.created_at)}</span>
            <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> Updated {formatDate(app.updated_at)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="documents">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1">
          <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="interviews"><CalendarIcon className="h-3.5 w-3.5 mr-1" />Interviews</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="contacts"><User className="h-3.5 w-3.5 mr-1" />Contacts</TabsTrigger>
          <TabsTrigger value="offer">Offer</TabsTrigger>
          <TabsTrigger value="activity"><Clock className="h-3.5 w-3.5 mr-1" />Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="mt-4"><DocumentsTab applicationId={app.id} /></TabsContent>
        <TabsContent value="interviews" className="mt-4"><InterviewsTab applicationId={app.id} /></TabsContent>
        <TabsContent value="research" className="mt-4"><ResearchTab applicationId={app.id} /></TabsContent>
        <TabsContent value="contacts" className="mt-4"><ContactsTab applicationId={app.id} /></TabsContent>
        <TabsContent value="offer" className="mt-4"><OfferTab applicationId={app.id} /></TabsContent>
        <TabsContent value="activity" className="mt-4"><ActivityTab applicationId={app.id} /></TabsContent>
      </Tabs>
    </div>
  )
}
