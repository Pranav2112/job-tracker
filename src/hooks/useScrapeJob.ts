import { useMutation } from '@tanstack/react-query'

export interface ScrapedJob {
  company_name:   string | null
  role_title:     string | null
  location:       string | null
  remote_type:    'Remote' | 'Hybrid' | 'Onsite' | null
  salary_info:    string | null
  deadline:       string | null
  posting_url:    string
  source:         string | null
  detected_board: string | null
}

// ─── Public hook ──────────────────────────────────────────────────────────────

export function useScrapeJob() {
  return useMutation({
    mutationFn: (url: string) => scrapeJobUrl(url.trim()),
  })
}

// ─── Router ───────────────────────────────────────────────────────────────────

async function scrapeJobUrl(url: string): Promise<ScrapedJob> {
  const u = url.toLowerCase()
  if (u.includes('greenhouse.io'))                         return scrapeGreenhouse(url)
  if (u.includes('lever.co'))                              return scrapeLever(url)
  if (u.includes('ashbyhq.com'))                           return scrapeAshby(url)
  if (u.includes('smartrecruiters.com'))                   return scrapeSmartRecruiters(url)
  if (u.includes('workable.com'))                          return scrapeWorkable(url)
  if (u.includes('myworkday.com') || u.includes('myworkdayjobs.com')) return scrapeWorkday(url)
  return scrapeGeneric(url)
}

// ─── Greenhouse — public JSON API, CORS enabled ───────────────────────────────

async function scrapeGreenhouse(url: string): Promise<ScrapedJob> {
  const pathMatch = url.match(/greenhouse\.io\/([^/?#]+)\/jobs\/(\d+)/i)
  let company = pathMatch?.[1]
  let jobId   = pathMatch?.[2]

  if (!company || !jobId) {
    try {
      const params = new URL(url).searchParams
      company = params.get('for')    ?? undefined
      jobId   = params.get('token') ?? undefined
    } catch { /* invalid URL */ }
  }

  if (!company || !jobId) return scrapeGeneric(url)
  const base = makeBase(titleCase(company.replace(/-/g, ' ')), url, 'Greenhouse')

  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`)
    if (!res.ok) return base
    const data = await res.json()
    const loc: string = data.location?.name ?? ''
    return { ...base, role_title: clean(data.title ?? ''), location: loc || null, remote_type: detectRemote(loc) }
  } catch { return base }
}

// ─── Lever — public JSON API, CORS enabled ────────────────────────────────────

async function scrapeLever(url: string): Promise<ScrapedJob> {
  const match = url.match(/lever\.co\/([^/?#]+)\/([a-f0-9-]{36})/i)
  if (!match) return scrapeGeneric(url)

  const [, company, postingId] = match
  const base = makeBase(titleCase(company.replace(/-/g, ' ')), url, 'Lever')

  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${company}/${postingId}`)
    if (!res.ok) return base
    const data = await res.json()
    const loc: string        = data.categories?.location   ?? ''
    const commitment: string = data.categories?.commitment ?? ''
    return { ...base, role_title: clean(data.text ?? ''), location: loc || null, remote_type: detectRemote(`${loc} ${commitment}`) }
  } catch { return base }
}

// ─── Ashby — public job board API ────────────────────────────────────────────

async function scrapeAshby(url: string): Promise<ScrapedJob> {
  const match = url.match(/ashbyhq\.com\/([^/?#]+)\/([a-f0-9-]{36})/i)
  if (!match) return scrapeGeneric(url)

  const [, company, jobId] = match
  const base = makeBase(titleCase(company.replace(/-/g, ' ')), url, 'Ashby')

  try {
    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${company}`)
    if (!res.ok) return base
    const data = await res.json()
    const job = (data.jobPostings ?? []).find((j: { id: string }) => j.id === jobId)
    if (!job) return base
    const loc: string = job.locationName ?? job.location ?? ''
    return { ...base, role_title: clean(job.title ?? ''), location: loc || null, remote_type: detectRemote(`${loc} ${job.isRemote ? 'remote' : ''}`) }
  } catch { return base }
}

// ─── SmartRecruiters — public REST API, CORS enabled ─────────────────────────
// URL: jobs.smartrecruiters.com/CompanyId/123456789-job-title-slug

async function scrapeSmartRecruiters(url: string): Promise<ScrapedJob> {
  const match = url.match(/smartrecruiters\.com\/([^/?#]+)\/(\d+)/i)
  if (!match) return scrapeGeneric(url)

  const [, companyId, jobId] = match
  const base = makeBase(titleCase(companyId.replace(/-/g, ' ')), url, 'SmartRecruiters')

  try {
    const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${companyId}/postings/${jobId}`)
    if (!res.ok) return base
    const d = await res.json()

    const locParts = [d.location?.city, d.location?.region, d.location?.country].filter(Boolean)
    const location = locParts.join(', ') || null
    const remote   = d.location?.remote ? 'remote' : ''
    const comp     = d.compensation
    const currency = comp?.currency ?? '$'
    const salary   = comp?.min
      ? (comp.max ? `${currency}${fmtNum(comp.min)}–${currency}${fmtNum(comp.max)}` : `${currency}${fmtNum(comp.min)}+`)
      : null

    return {
      ...base,
      company_name: d.company?.name ? clean(d.company.name) : base.company_name,
      role_title:   clean(d.name ?? ''),
      location,
      remote_type:  detectRemote(`${d.typeOfWork ?? ''} ${remote} ${location ?? ''}`),
      salary_info:  salary,
    }
  } catch { return base }
}

// ─── Workable — public API ────────────────────────────────────────────────────
// URL: apply.workable.com/company/j/SHORTCODE/

async function scrapeWorkable(url: string): Promise<ScrapedJob> {
  const match = url.match(/workable\.com\/([^/?#]+)\/j\/([^/?#]+)/i)
  if (!match) return scrapeGeneric(url)

  const [, slug, shortcode] = match
  const base = makeBase(titleCase(slug.replace(/-/g, ' ')), url, 'Workable')

  const WORK_TYPE: Record<string, 'Remote' | 'Hybrid' | 'Onsite'> = {
    fully_remote: 'Remote', remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'Onsite', office: 'Onsite',
  }

  try {
    const res = await fetch(`https://apply.workable.com/api/v3/accounts/${slug}/jobs/${shortcode}`)
    if (!res.ok) return base
    const d = await res.json()

    const locParts = [d.location?.city, d.location?.region, d.location?.country].filter(Boolean)
    const location = locParts.join(', ') || null
    const remoteType = d.workplace_type
      ? (WORK_TYPE[d.workplace_type] ?? detectRemote(d.workplace_type))
      : detectRemote(`${location ?? ''} ${d.title ?? ''}`)

    return { ...base, company_name: d.account?.name ? clean(d.account.name) : base.company_name, role_title: clean(d.title ?? ''), location, remote_type: remoteType }
  } catch { return base }
}

// ─── Workday — URL extraction + JSON-LD overlay ───────────────────────────────
// URL: company.wd3.myworkday.com/company/job/Location/Title_REQ123456

async function scrapeWorkday(url: string): Promise<ScrapedJob> {
  let company: string | null = null
  let roleTitle: string | null = null
  let location: string | null = null

  try {
    const { hostname, pathname } = new URL(url)
    // Company from subdomain: "stripe.wd3.myworkday.com" → "Stripe"
    const subMatch = hostname.match(/^([^.]+)\.(wd\d+\.myworkday|myworkdayjobs)/)
    if (subMatch) company = titleCase(subMatch[1].replace(/-/g, ' '))

    // Path: /company/job/Location-Name/Title-Slug_REQ123456
    const parts = pathname.split('/').filter(Boolean)
    const jobIdx = parts.findIndex(p => p.toLowerCase() === 'job')
    if (jobIdx !== -1 && parts.length > jobIdx + 2) {
      location  = titleCase(parts[jobIdx + 1].replace(/[-_]+/g, ' '))
      roleTitle = titleCase(
        parts[jobIdx + 2]
          .replace(/_(?:REQ|R)[-_]?[\dA-Z]+$/i, '')  // strip _REQ123456
          .replace(/--+/g, ' — ')                     // double dash → em dash
          .replace(/[-_]+/g, ' ')
      )
    } else if (jobIdx !== -1 && parts.length > jobIdx + 1) {
      roleTitle = titleCase(parts[jobIdx + 1].replace(/_(?:REQ|R)[-_]?[\dA-Z]+$/i, '').replace(/[-_]+/g, ' '))
    }
  } catch { /* invalid URL */ }

  const base = makeBase(company, url, 'Workday')
  base.role_title = roleTitle
  base.location   = location

  // Overlay with JSON-LD if the proxy can reach the page
  const overlay = await tryProxyExtract(url)
  if (overlay) {
    return {
      ...base,
      company_name: overlay.company_name ?? base.company_name,
      role_title:   overlay.role_title   ?? base.role_title,
      location:     overlay.location     ?? base.location,
      remote_type:  overlay.remote_type  ?? base.remote_type,
      salary_info:  overlay.salary_info  ?? base.salary_info,
      deadline:     overlay.deadline     ?? base.deadline,
    }
  }
  return base
}

// ─── Generic — CORS proxy + HTML / JSON-LD parsing ───────────────────────────

async function scrapeGeneric(url: string): Promise<ScrapedJob> {
  const partial = makeBase(extractCompanyFromUrl(url), url, null)
  partial.detected_board = 'Web'

  const overlay = await tryProxyExtract(url)
  if (!overlay) return partial

  return {
    ...partial,
    company_name: overlay.company_name ?? partial.company_name,
    role_title:   overlay.role_title   ?? partial.role_title,
    location:     overlay.location     ?? partial.location,
    remote_type:  overlay.remote_type  ?? partial.remote_type,
    salary_info:  overlay.salary_info  ?? partial.salary_info,
    deadline:     overlay.deadline     ?? partial.deadline,
  }
}

// ─── Proxy fetch + HTML extraction ───────────────────────────────────────────

interface Overlay {
  company_name: string | null
  role_title:   string | null
  location:     string | null
  remote_type:  'Remote' | 'Hybrid' | 'Onsite' | null
  salary_info:  string | null
  deadline:     string | null
}

async function tryProxyExtract(url: string): Promise<Overlay | null> {
  const html = await fetchViaProxy(url)
  if (!html) return null
  return extractFromHtml(html)
}

async function fetchViaProxy(url: string): Promise<string | null> {
  const enc = encodeURIComponent(url)
  // Primary proxy
  try {
    const res = await fetch(`https://corsproxy.io/?url=${enc}`, { signal: AbortSignal.timeout(8000) })
    if (res.ok) return await res.text()
  } catch { /* fallthrough to backup */ }
  // Backup proxy (allorigins returns { contents: "..." })
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${enc}`, { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const data = await res.json() as { contents?: string }
      return data.contents ?? null
    }
  } catch { /* both failed */ }
  return null
}

function extractFromHtml(html: string): Overlay {
  // ── 1. JSON-LD schema.org/JobPosting (most reliable) ─────────────────────
  const jsonLdBlocks = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  for (const block of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(block[1])
      const list   = Array.isArray(parsed) ? parsed : [parsed]
      const job    = list.find((j: Record<string, unknown>) => j['@type'] === 'JobPosting') as Record<string, unknown> | undefined
      if (job) {
        const location = extractJsonLdLocation(job)
        const locType  = String(job.jobLocationType ?? '')
        const salary   = extractJsonLdSalary(job)
        const deadline = job.validThrough ? isoDate(String(job.validThrough)) : null
        const hiring   = job.hiringOrganization as Record<string, unknown> | null
        return {
          company_name: hiring?.name ? clean(String(hiring.name)) : null,
          role_title:   job.title ? clean(String(job.title)) : null,
          location,
          remote_type:  detectRemote(`${location ?? ''} ${locType}`),
          salary_info:  salary,
          deadline,
        }
      }
    } catch { /* bad JSON, try next */ }
  }

  // ── 2. Meta tags + page title ──────────────────────────────────────────────
  const head      = html.slice(0, 12000)
  const pageTitle = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
  const h1        = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '')
  const ogTitle   = head.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
  const ogSite    = head.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i)?.[1]
  const locMeta   = head.match(/<meta[^>]+name="job[_-]?location"[^>]+content="([^"]+)"/i)?.[1]

  let roleTitle: string | null = null
  let company: string | null   = null

  // "Software Engineer at Stripe | Greenhouse"
  if (pageTitle) {
    const pipe = pageTitle.match(/^(.+?)\s*[|\-–—]\s*(.+)$/)
    if (pipe) {
      roleTitle = clean(pipe[1])
      company   = clean(pipe[2].replace(/\b(jobs?|careers?|hiring|work with us|job board)\b/gi, '').trim())
    }
    const atMatch = pageTitle.match(/^(.+?)\s+at\s+(.+)$/i)
    if (atMatch && !company) { roleTitle = clean(atMatch[1]); company = clean(atMatch[2]) }
  }
  if (ogTitle && !roleTitle)  roleTitle = clean(ogTitle)
  if (h1 && !roleTitle)       roleTitle = clean(h1)
  if (ogSite && !company)     company   = clean(ogSite)

  const salary = extractSalaryText(html.slice(0, 12000))

  return {
    company_name: company,
    role_title:   roleTitle,
    location:     locMeta?.trim() ?? null,
    remote_type:  detectRemote(html.slice(0, 6000)),
    salary_info:  salary,
    deadline:     null,
  }
}

// ─── JSON-LD helpers ──────────────────────────────────────────────────────────

function extractJsonLdLocation(job: Record<string, unknown>): string | null {
  const jl = job.jobLocation as Record<string, unknown> | Record<string, unknown>[] | null
  if (!jl) return null
  const single = Array.isArray(jl) ? jl[0] : jl
  const addr   = (single?.address ?? single) as Record<string, unknown>
  const parts  = [addr?.addressLocality, addr?.addressRegion, addr?.addressCountry].filter(Boolean)
  return parts.length ? parts.join(', ') : ((single as { name?: string })?.name ?? null)
}

function extractJsonLdSalary(job: Record<string, unknown>): string | null {
  const bs = job.baseSalary as Record<string, unknown> | null
  if (!bs) return null
  const val = (bs.value ?? bs) as Record<string, unknown>
  const currency = String(bs.currency ?? '$')
  const min = val.minValue ?? val.value
  const max = val.maxValue
  if (!min) return null
  const period  = String(bs.unitText ?? '').toUpperCase()
  const suffix  = ({ YEAR: '/yr', MONTH: '/mo', HOUR: '/hr', WEEK: '/wk' } as Record<string, string>)[period] ?? ''
  return max
    ? `${currency}${fmtNum(min)}–${currency}${fmtNum(max)}${suffix}`
    : `${currency}${fmtNum(min)}${suffix}`
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function detectRemote(text: string): 'Remote' | 'Hybrid' | 'Onsite' | null {
  const t = text.toLowerCase()
  if (t.includes('hybrid')) return 'Hybrid'
  if (
    t.includes('fully remote') || t.includes('100% remote') ||
    t.includes('remote first') || t.includes('remote-first') ||
    t.includes('work from anywhere') || t.includes('work from home') ||
    t.includes('wfh') || t.includes('distributed team') || t.includes('telecommute') ||
    t.includes('telecommut') || t === 'remote' ||
    (t.includes('remote') && !t.includes('not remote') && !t.includes('non-remote') && !t.includes('no remote'))
  ) return 'Remote'
  if (
    t.includes('on-site') || t.includes('onsite') || t.includes('on site') ||
    t.includes('in-office') || t.includes('in office') ||
    t.includes('in person') || t.includes('in-person') ||
    t.includes('office-based') || t.includes('office based')
  ) return 'Onsite'
  return null
}

function extractSalaryText(text: string): string | null {
  // "$120,000 – $180,000 / year", "$120K–$180K", "$50/hr", "£70,000"
  const range = text.match(
    /(?:\$|£|€|USD|CAD|GBP|AUD)\s?[\d,]+(?:[kK])?(?:\s*[-–]\s*(?:\$|£|€)?\s?[\d,]+(?:[kK])?)?(?:\s*(?:per\s+(?:year|hour|month|week)|annually|\/yr|\/hr|\/year|\/hour|a year|pa))?/i
  )
  if (range) return range[0].trim()

  // "Salary: $120,000" or "Compensation: $120K"
  const labeled = text.match(
    /(?:salary|compensation|pay|stipend)\s*(?:range)?\s*[:\-]\s*([\d$£€,kK\s\-–\/]+(?:per\s+\w+)?)/i
  )
  if (labeled) return labeled[1].trim()

  // Stipend: "$35/hr", "$7,000/month"
  const stipend = text.match(/\$[\d,]+\s*(?:\/\s*(?:month|week|hr|hour)|\s+per\s+(?:month|week|hour))/i)
  if (stipend) return stipend[0].trim()

  return null
}

function extractCompanyFromUrl(url: string): string | null {
  try {
    const host  = new URL(url).hostname.replace(/^www\./, '')
    const parts = host.split('.')
    const slug  = parts.length > 2 ? parts[1] : parts[0]
    return titleCase(slug)
  } catch { return null }
}

function makeBase(company: string | null, url: string, source: string | null): ScrapedJob {
  return {
    company_name: company, role_title: null, location: null,
    remote_type: null, salary_info: null, deadline: null,
    posting_url: url, source, detected_board: source,
  }
}

function isoDate(str: string): string | null {
  try {
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
  } catch { return null }
}

function fmtNum(n: unknown): string {
  const num = Number(n)
  if (isNaN(num)) return String(n)
  return num >= 1000 ? `${Math.round(num / 1000)}K` : String(Math.round(num))
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
