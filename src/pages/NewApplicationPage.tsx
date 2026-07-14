import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Link2, Loader2, Sparkles, CheckCircle2,
  AlertCircle, X, FileText, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApplicationForm } from '@/components/forms/ApplicationForm'
import { useCreateApplication } from '@/hooks/useApplications'
import { useUpdateStreak } from '@/hooks/useGamification'
import { useScrapeJob, type ScrapedJob } from '@/hooks/useScrapeJob'
import { parseJobDescription } from '@/lib/parseJD'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Application } from '@/types'

const BOARD_LABELS: Record<string, string> = {
  Greenhouse: 'Greenhouse', Lever: 'Lever',
  Ashby: 'Ashby', Workday: 'Workday', Web: 'the web',
}

export function NewApplicationPage() {
  const navigate    = useNavigate()
  const create      = useCreateApplication()
  const touchStreak = useUpdateStreak()
  const scrape      = useScrapeJob()

  // URL scraper state
  const [urlInput,  setUrlInput]  = useState('')
  const [scraped,   setScraped]   = useState<ScrapedJob | null>(null)
  const [scrapeErr, setScrapeErr] = useState<string | null>(null)

  // JD paste state
  const [jdOpen,    setJdOpen]    = useState(false)
  const [jdText,    setJdText]    = useState('')
  const [jdParsing, setJdParsing] = useState(false)

  // Shared
  const [prefill,   setPrefill]   = useState<Partial<Application> | undefined>()
  const [formKey,   setFormKey]   = useState(0)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // ── URL scraper ─────────────────────────────────────────────────────────────
  async function handleScrape(e: React.FormEvent) {
    e.preventDefault()
    const url = urlInput.trim()
    if (!url) return
    setScrapeErr(null)
    setScraped(null)

    try {
      const result = await scrape.mutateAsync(url)
      setScraped(result)
      applyPrefill({
        company_name:  result.company_name  ?? '',
        role_title:    result.role_title    ?? '',
        location:      result.location      ?? '',
        remote_type:   result.remote_type   ?? undefined,
        salary_info:   result.salary_info   ?? '',
        posting_url:   result.posting_url   ?? '',
        source:        result.source        ?? '',
      })
      const hasFields = [result.role_title, result.company_name, result.location, result.remote_type, result.salary_info].some(Boolean)
      if (!hasFields) {
        setJdOpen(true)
      }
      const found = [result.role_title, result.company_name].filter(Boolean).join(' at ')
      toast.success(found ? `Found: ${found}` : 'URL saved — fill in any missing fields')
    } catch (err: unknown) {
      setScrapeErr(err instanceof Error ? err.message : 'Could not read that URL. Try pasting the job description below instead.')
    }
  }

  // ── JD text parser ──────────────────────────────────────────────────────────
  function handleParseJD() {
    if (!jdText.trim()) return
    setJdParsing(true)
    // Small timeout so the loading state renders before the synchronous parsing
    setTimeout(() => {
      const parsed = parseJobDescription(jdText)
      applyPrefill({
        company_name: parsed.company_name ?? '',
        role_title:   parsed.role_title   ?? '',
        location:     parsed.location     ?? '',
        remote_type:  parsed.remote_type  ?? undefined,
        salary_info:  parsed.salary_info  ?? '',
        app_type:     parsed.app_type     ?? 'Internship',
      })
      setJdParsing(false)
      setJdOpen(false)

      const found = [parsed.role_title, parsed.company_name].filter(Boolean).join(' at ')
      if (found) {
        toast.success(`Extracted: ${found}`)
      } else {
        toast('Parsed — check the form and fill in anything missing', { icon: '📋' })
      }
    }, 80)
  }

  function applyPrefill(values: Partial<Application>) {
    setPrefill(values)
    setFormKey(k => k + 1)
  }

  function clearAll() {
    setScraped(null); setScrapeErr(null); setUrlInput('')
    setJdText(''); setJdOpen(false)
    setPrefill(undefined); setFormKey(k => k + 1)
    setTimeout(() => urlInputRef.current?.focus(), 50)
  }

  async function handleSubmit(values: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const app = await create.mutateAsync(values)
    toast.success(`${values.company_name} added!`)
    void touchStreak()
    navigate(`/applications/${app.id}`)
  }

  const fieldsFound = scraped
    ? [
        scraped.role_title   && 'Role',
        scraped.company_name && 'Company',
        scraped.location     && 'Location',
        scraped.remote_type  && 'Work mode',
        scraped.salary_info  && 'Salary',
      ].filter(Boolean)
    : []

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Add application</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Auto-fill from a URL, paste the job description, or fill in manually.
        </p>
      </div>

      {/* ── URL Scraper ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card/60 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <div className="flex h-6 w-6 items-center justify-center rounded-md gradient-primary">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold">Auto-fill from URL</p>
          <span className="ml-auto text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
            Greenhouse · Lever · Ashby
          </span>
        </div>

        <div className="p-4 space-y-3">
          <form onSubmit={handleScrape} className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={urlInputRef}
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setScrapeErr(null) }}
                placeholder="https://boards.greenhouse.io/company/jobs/…"
                className="pl-9 h-10 text-sm"
                disabled={scrape.isPending}
                autoComplete="off"
              />
            </div>
            <Button
              type="submit"
              disabled={!urlInput.trim() || scrape.isPending}
              className="h-10 px-4 gradient-primary border-0 text-white font-medium shrink-0"
            >
              {scrape.isPending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Fetching…</>
                : 'Fetch'}
            </Button>
          </form>

          {/* Success */}
          {scraped && fieldsFound.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl bg-green-500/8 border border-green-500/20 px-3.5 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  Auto-filled from {BOARD_LABELS[scraped.detected_board ?? 'Web'] ?? 'the web'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{fieldsFound.join(' · ')}</p>
              </div>
              <button onClick={clearAll} className="text-muted-foreground hover:text-foreground shrink-0"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          {/* Nothing found */}
          {scraped && fieldsFound.length === 0 && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 px-3.5 py-2.5">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                Couldn't extract details — URL saved as posting link. Try pasting the job description below.
              </p>
              <button onClick={clearAll} className="text-muted-foreground hover:text-foreground shrink-0"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          {/* Error */}
          {scrapeErr && (
            <div className="flex items-start gap-2.5 rounded-xl bg-destructive/8 border border-destructive/20 px-3.5 py-2.5">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive flex-1">{scrapeErr}</p>
              <button onClick={() => setScrapeErr(null)} className="text-muted-foreground hover:text-foreground shrink-0"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
      </div>

      {/* ── JD Paste ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card/60 overflow-hidden">
        {/* Toggle header */}
        <button
          type="button"
          onClick={() => setJdOpen(o => !o)}
          className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/15">
            <FileText className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <p className="text-sm font-semibold flex-1 text-left">Paste job description</p>
          <span className="text-[11px] text-muted-foreground mr-2">Works with LinkedIn · any source</span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', jdOpen && 'rotate-180')} />
        </button>

        {/* Expandable body */}
        {jdOpen && (
          <div className="p-4 space-y-3 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Copy the entire job posting — title, company, location, salary, description — and paste it below.
              We'll extract the key details automatically.
            </p>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the full job description here…&#10;&#10;Example:&#10;Software Engineer Intern&#10;Stripe · San Francisco, CA · Remote&#10;&#10;About Stripe&#10;Stripe is a financial infrastructure platform…"
              rows={10}
              className="w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono leading-relaxed"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {jdText.length > 0 ? `${jdText.length} characters` : 'Paste any length — longer is better'}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setJdText(''); setJdOpen(false) }}
                  className="h-9 text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleParseJD}
                  disabled={!jdText.trim() || jdParsing}
                  className="h-9 gradient-primary border-0 text-white font-semibold px-5"
                >
                  {jdParsing
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Extracting…</>
                    : 'Extract details →'
                  }
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Application form ─────────────────────────────────────────────────── */}
      <ApplicationForm
        key={formKey}
        defaultValues={prefill}
        onSubmit={handleSubmit}
        submitLabel="Save application"
        loading={create.isPending}
      />
    </div>
  )
}
