import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Link2, Loader2, Sparkles, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApplicationForm } from '@/components/forms/ApplicationForm'
import { useCreateApplication } from '@/hooks/useApplications'
import { useUpdateStreak } from '@/hooks/useGamification'
import { useScrapeJob, type ScrapedJob } from '@/hooks/useScrapeJob'
import { toast } from 'sonner'
import type { Application } from '@/types'

// Board name → friendlier label
const BOARD_LABELS: Record<string, string> = {
  Greenhouse: 'Greenhouse',
  Lever: 'Lever',
  Ashby: 'Ashby',
  Workday: 'Workday',
  Web: 'the web',
}

export function NewApplicationPage() {
  const navigate    = useNavigate()
  const create      = useCreateApplication()
  const touchStreak = useUpdateStreak()
  const scrape      = useScrapeJob()

  const [urlInput,   setUrlInput]   = useState('')
  const [scraped,    setScraped]    = useState<ScrapedJob | null>(null)
  const [scrapeErr,  setScrapeErr]  = useState<string | null>(null)
  const [formKey,    setFormKey]    = useState(0)   // forces ApplicationForm to remount with new defaults
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault()
    const url = urlInput.trim()
    if (!url) return
    setScrapeErr(null)
    setScraped(null)

    try {
      const result = await scrape.mutateAsync(url)
      setScraped(result)
      setFormKey(k => k + 1)  // remount form with pre-filled defaults

      const found = [result.role_title, result.company_name].filter(Boolean).join(' at ')
      toast.success(found ? `Found: ${found}` : 'URL fetched — fill in any missing fields')
    } catch (err: unknown) {
      setScrapeErr(err instanceof Error ? err.message : 'Could not read that URL.')
    }
  }

  function clearScrape() {
    setScraped(null)
    setScrapeErr(null)
    setUrlInput('')
    setFormKey(k => k + 1)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleSubmit(values: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const app = await create.mutateAsync(values)
    toast.success(`${values.company_name} added!`)
    void touchStreak()
    navigate(`/applications/${app.id}`)
  }

  // Build default values from scraped data
  const scrapedDefaults: Partial<Application> | undefined = scraped
    ? {
        company_name:   scraped.company_name   ?? '',
        role_title:     scraped.role_title     ?? '',
        location:       scraped.location       ?? '',
        remote_type:    scraped.remote_type    ?? undefined,
        salary_info:    scraped.salary_info    ?? '',
        posting_url:    scraped.posting_url    ?? '',
        source:         scraped.source         ?? '',
      }
    : undefined

  const fieldsFound = scraped
    ? [
        scraped.role_title    && 'Role',
        scraped.company_name  && 'Company',
        scraped.location      && 'Location',
        scraped.remote_type   && 'Work mode',
        scraped.salary_info   && 'Salary',
      ].filter(Boolean)
    : []

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Add application</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste a job URL to auto-fill details, or fill in manually below.
        </p>
      </div>

      {/* ── URL Scraper card ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card/60 overflow-hidden">
        {/* Header strip */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <div className="flex h-6 w-6 items-center justify-center rounded-md gradient-primary">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold">Auto-fill from URL</p>
          <span className="ml-auto text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
            Greenhouse · Lever · Ashby · most job boards
          </span>
        </div>

        <div className="p-4 space-y-3">
          {/* Input row */}
          <form onSubmit={handleScrape} className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setScrapeErr(null) }}
                placeholder="https://boards.greenhouse.io/stripe/jobs/…"
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
                : 'Fetch details'
              }
            </Button>
          </form>

          {/* Success state */}
          {scraped && fieldsFound.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl bg-green-500/8 border border-green-500/20 px-3.5 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  Auto-filled from {BOARD_LABELS[scraped.detected_board ?? 'Web'] ?? 'the web'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {fieldsFound.join(' · ')}
                </p>
              </div>
              <button
                onClick={clearScrape}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Clear and start fresh"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Nothing found but no error */}
          {scraped && fieldsFound.length === 0 && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 px-3.5 py-2.5">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                Couldn't extract details from this page — the URL was saved as the posting link. Fill in the rest manually.
              </p>
              <button onClick={clearScrape} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Error state */}
          {scrapeErr && (
            <div className="flex items-start gap-2.5 rounded-xl bg-destructive/8 border border-destructive/20 px-3.5 py-2.5">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive flex-1">{scrapeErr}</p>
              <button onClick={() => setScrapeErr(null)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Application form ─────────────────────────────────────────────── */}
      <ApplicationForm
        key={formKey}
        defaultValues={scrapedDefaults}
        onSubmit={handleSubmit}
        submitLabel="Save application"
        loading={create.isPending}
      />
    </div>
  )
}
