import { useMutation } from '@tanstack/react-query'

export interface ScrapedJob {
  company_name: string | null
  role_title: string | null
  location: string | null
  remote_type: 'Remote' | 'Hybrid' | 'Onsite' | null
  salary_info: string | null
  posting_url: string
  source: string | null
  detected_board: string | null
}

// ─── Public hook ─────────────────────────────────────────────────────────────

export function useScrapeJob() {
  return useMutation({
    mutationFn: (url: string) => scrapeJobUrl(url.trim()),
  })
}

// ─── Router ───────────────────────────────────────────────────────────────────

async function scrapeJobUrl(url: string): Promise<ScrapedJob> {
  if (/greenhouse\.io/i.test(url))  return scrapeGreenhouse(url)
  if (/lever\.co/i.test(url))       return scrapeLever(url)
  if (/ashbyhq\.com/i.test(url))    return scrapeAshby(url)
  return scrapeGeneric(url)
}

// ─── Greenhouse — public JSON API, CORS enabled ───────────────────────────────

async function scrapeGreenhouse(url: string): Promise<ScrapedJob> {
  const match = url.match(/greenhouse\.io\/([^/?#]+)\/jobs\/(\d+)/i)
  if (!match) return scrapeGeneric(url)

  const [, company, jobId] = match
  const base: ScrapedJob = {
    company_name: titleCase(company.replace(/-/g, ' ')),
    role_title: null, location: null, remote_type: null,
    salary_info: null, posting_url: url,
    source: 'Greenhouse', detected_board: 'Greenhouse',
  }

  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`
    )
    if (!res.ok) return base   // expired job — return company name at least

    const data = await res.json()
    const location: string = data.location?.name ?? ''
    return { ...base, role_title: clean(data.title ?? ''), location: location || null, remote_type: detectRemote(location) }
  } catch { return base }
}

// ─── Lever — public JSON API, CORS enabled ────────────────────────────────────

async function scrapeLever(url: string): Promise<ScrapedJob> {
  const match = url.match(/lever\.co\/([^/?#]+)\/([a-f0-9-]{36})/i)
  if (!match) return scrapeGeneric(url)

  const [, company, postingId] = match
  const base: ScrapedJob = {
    company_name: titleCase(company.replace(/-/g, ' ')),
    role_title: null, location: null, remote_type: null,
    salary_info: null, posting_url: url,
    source: 'Lever', detected_board: 'Lever',
  }

  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${company}/${postingId}`)
    if (!res.ok) return base

    const data = await res.json()
    const location: string   = data.categories?.location   ?? ''
    const commitment: string = data.categories?.commitment ?? ''
    return { ...base, role_title: clean(data.text ?? ''), location: location || null, remote_type: detectRemote(`${location} ${commitment}`) }
  } catch { return base }
}

// ─── Ashby — public job board API ────────────────────────────────────────────

async function scrapeAshby(url: string): Promise<ScrapedJob> {
  const match = url.match(/ashbyhq\.com\/([^/?#]+)\/([a-f0-9-]{36})/i)
  if (!match) return scrapeGeneric(url)

  const [, company, jobId] = match
  const base: ScrapedJob = {
    company_name: titleCase(company.replace(/-/g, ' ')),
    role_title: null, location: null, remote_type: null,
    salary_info: null, posting_url: url,
    source: 'Ashby', detected_board: 'Ashby',
  }

  try {
    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${company}`)
    if (!res.ok) return base

    const data = await res.json()
    const job = (data.jobPostings ?? []).find((j: { id: string }) => j.id === jobId)
    if (!job) return base

    const location: string = job.locationName ?? job.location ?? ''
    return { ...base, role_title: clean(job.title ?? ''), location: location || null, remote_type: detectRemote(`${location} ${job.isRemote ? 'remote' : ''}`) }
  } catch { return base }
}

// ─── Generic — CORS proxy + HTML parsing ─────────────────────────────────────
// Uses corsproxy.io (free, low-volume) to fetch any page server-side.

async function scrapeGeneric(url: string): Promise<ScrapedJob> {
  const partial: ScrapedJob = {
    company_name: extractCompanyFromUrl(url), role_title: null,
    location: null, remote_type: null, salary_info: null,
    posting_url: url, source: null, detected_board: 'Web',
  }

  const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`
  let res: Response
  try { res = await fetch(proxyUrl) } catch { return partial }
  if (!res.ok) return partial   // blocked/403 — still save the URL + company guess

  const html = await res.text()
  const head  = html.slice(0, 8000)

  const h1 = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '')
  const pageTitle = stripTags(
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''
  )
  const ogTitle = html.match(
    /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i
  )?.[1]
  const ogSiteName = head.match(
    /<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i
  )?.[1]

  let roleTitle: string | null = null
  let companyName: string | null = null

  if (pageTitle) {
    const split = pageTitle.match(/^(.+?)\s*[|\-–—]\s*(.+)$/)
    if (split) {
      roleTitle   = clean(split[1])
      companyName = clean(split[2].replace(/\b(jobs?|careers?|hiring|work with us)\b/gi, '').trim())
    }
    const atMatch = pageTitle.match(/^(.+?)\s+at\s+(.+)$/i)
    if (atMatch && !companyName) {
      roleTitle   = clean(atMatch[1])
      companyName = clean(atMatch[2])
    }
  }

  if (ogTitle && !roleTitle)   roleTitle   = clean(ogTitle)
  if (h1 && !roleTitle)        roleTitle   = clean(h1)
  if (ogSiteName && !companyName) companyName = clean(ogSiteName)
  if (!companyName) companyName = extractCompanyFromUrl(url)

  const locationMeta =
    head.match(/<meta[^>]+name="job[_-]?location"[^>]+content="([^"]+)"/i)?.[1] ?? null

  const salaryMatch = html.match(
    /\$[\d,]+(?:[kK])?(?:\s*[-–]\s*\$[\d,]+(?:[kK])?)?(?:\s*(?:per\s+(?:year|hour|month)|annually|\/yr|\/hr))?/
  )?.[0] ?? null

  return {
    company_name:   companyName,
    role_title:     roleTitle,
    location:       locationMeta?.trim() ?? null,
    remote_type:    detectRemote(html.slice(0, 4000)),
    salary_info:    salaryMatch,
    posting_url:    url,
    source:         null,
    detected_board: 'Web',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectRemote(text: string): 'Remote' | 'Hybrid' | 'Onsite' | null {
  const t = text.toLowerCase()
  if (t.includes('hybrid'))                    return 'Hybrid'
  if (t.includes('remote') && !t.includes('not remote')) return 'Remote'
  if (t.includes('on-site') || t.includes('onsite') || t.includes('in-office')) return 'Onsite'
  return null
}

function extractCompanyFromUrl(url: string): string | null {
  try {
    const host   = new URL(url).hostname.replace(/^www\./, '')
    const parts  = host.split('.')
    const slug   = parts.length > 2 ? parts[1] : parts[0]
    return titleCase(slug)
  } catch { return null }
}

function titleCase(str: string): string {
  return str.trim().replace(/\b\w/g, c => c.toUpperCase())
}

function clean(str: string): string {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
}

function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
