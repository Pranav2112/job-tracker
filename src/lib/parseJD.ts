// Free regex-based job description parser.
// Works on raw text pasted from LinkedIn, company sites, emails, PDFs, anywhere.

export interface ParsedJD {
  company_name: string | null
  role_title:   string | null
  location:     string | null
  remote_type:  'Remote' | 'Hybrid' | 'Onsite' | null
  salary_info:  string | null
  app_type:     'Internship' | 'FullTime' | 'CoOp' | null
}

export function parseJobDescription(raw: string): ParsedJD {
  const text  = raw.replace(/\r\n/g, '\n').trim()
  const lower = text.toLowerCase()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  return {
    company_name: extractCompany(text, lines),
    role_title:   extractTitle(text, lines),
    location:     extractLocation(text),
    remote_type:  extractRemote(lower),
    salary_info:  extractSalary(text),
    app_type:     extractJobType(lower),
  }
}

// ─── Company ──────────────────────────────────────────────────────────────────

function extractCompany(text: string, lines: string[]): string | null {
  // "Company: Stripe", "Employer: Google", "Organization: …"
  const labeled = text.match(
    /(?:^|\n)\s*(?:company|employer|organization|client|firm)\s*[:\-]\s*([^\n|,•]+)/im
  )
  if (labeled) return clean(labeled[1])

  // "About Stripe", "About Stripe:", "About Tower Research Capital"
  const about = text.match(
    /(?:^|\n)\s*about\s+([A-Z][A-Za-z0-9\s&.,'\-]{1,50}?)(?:\s*\n|\s*:|,)/m
  )
  if (about) return clean(about[1])

  // "Join Stripe and …", "Join us at Stripe"
  const join = text.match(
    /\bjoin\s+(?:us\s+at\s+)?([A-Z][A-Za-z0-9\s&.,'\-]{1,40}?)(?:\s+and\b|\s+to\b|[,\n])/m
  )
  if (join) return clean(join[1])

  // "At Stripe, we …"
  const atCo = text.match(/\bat\s+([A-Z][A-Za-z0-9\s&.,'\-]{1,40}?),\s+we\b/m)
  if (atCo) return clean(atCo[1])

  // LinkedIn often puts "· Company Name" in the copy
  const linkedIn = text.match(/·\s*([A-Z][A-Za-z0-9\s&.,'\-]{1,40}?)\s*·/m)
  if (linkedIn) return clean(linkedIn[1])

  // Last resort: second or third non-trivial line often holds the company
  for (const line of lines.slice(1, 5)) {
    if (
      line.length > 2 && line.length < 60 &&
      /^[A-Z]/.test(line) &&
      !TITLE_SKIP.test(line.toLowerCase())
    ) {
      return clean(line)
    }
  }

  return null
}

// ─── Job Title ────────────────────────────────────────────────────────────────

function extractTitle(text: string, lines: string[]): string | null {
  // "Job Title: …", "Position: …", "Role: …", "Title: …"
  const labeled = text.match(
    /(?:^|\n)\s*(?:job\s*title|position|role|title)\s*[:\-]\s*([^\n|•]+)/im
  )
  if (labeled) return clean(labeled[1])

  // Markdown heading
  const mdH1 = text.match(/^#+\s+(.+)$/m)
  if (mdH1) return clean(mdH1[1])

  // Very first non-trivial line is usually the job title in most copy-pastes
  for (const line of lines.slice(0, 4)) {
    if (
      line.length > 3 && line.length < 120 &&
      /^[A-Z]/.test(line) &&
      !TITLE_SKIP.test(line.toLowerCase())
    ) {
      return clean(line)
    }
  }

  return null
}

// ─── Location ─────────────────────────────────────────────────────────────────

function extractLocation(text: string): string | null {
  // "Location: San Francisco, CA"
  const labeled = text.match(
    /(?:^|\n)\s*(?:location|office|based in|workplace)\s*[:\-]\s*([^\n|•,]+)/im
  )
  if (labeled) return clean(labeled[1])

  // "City, ST" pattern  e.g.  "New York, NY"  or  "San Francisco, CA"
  const cityState = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2})\b/)
  if (cityState) return cityState[0]

  // "City, Country" for non-US
  const cityCountry = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*(UK|Canada|India|Germany|Singapore|Australia|Netherlands)\b/i)
  if (cityCountry) return cityCountry[0]

  return null
}

// ─── Remote type ──────────────────────────────────────────────────────────────

function extractRemote(lower: string): 'Remote' | 'Hybrid' | 'Onsite' | null {
  if (lower.includes('hybrid')) return 'Hybrid'
  if (
    lower.includes('fully remote') ||
    lower.includes('100% remote') ||
    lower.includes('remote first') ||
    lower.includes('remote-first') ||
    (lower.includes('remote') && !lower.includes('not remote') && !lower.includes('non-remote'))
  ) return 'Remote'
  if (
    lower.includes('on-site') || lower.includes('onsite') ||
    lower.includes('in-office') || lower.includes('in office') ||
    lower.includes('in person') || lower.includes('in-person')
  ) return 'Onsite'
  return null
}

// ─── Salary ───────────────────────────────────────────────────────────────────

function extractSalary(text: string): string | null {
  // "$120,000 - $180,000", "$120K–$180K", "$50/hr", "£70,000"
  const match = text.match(
    /(?:\$|£|€|USD|CAD|GBP)\s?[\d,]+(?:[kK])?(?:\s*[-–]\s*(?:\$|£|€)?\s?[\d,]+(?:[kK])?)?(?:\s*(?:per\s+(?:year|hour|month)|annually|\/yr|\/hr|\/year|\/hour|a year))?/i
  )
  if (match) return match[0].trim()

  // "Salary: $120,000"
  const labeled = text.match(/salary\s*(?:range)?\s*[:\-]\s*([\d$£€,kK\s\-–\/]+(?:per\s+\w+)?)/i)
  if (labeled) return labeled[1].trim()

  // Stipend for internships: "$7,000/month", "$35/hr"
  const stipend = text.match(/\$[\d,]+\s*(?:\/\s*(?:month|week|hr|hour)|\s+per\s+(?:month|week|hour))/i)
  if (stipend) return stipend[0].trim()

  return null
}

// ─── Job type ─────────────────────────────────────────────────────────────────

function extractJobType(lower: string): 'Internship' | 'FullTime' | 'CoOp' | null {
  if (lower.includes('internship') || lower.includes('intern ') || lower.match(/\bintern\b/)) return 'Internship'
  if (lower.includes('co-op') || lower.includes('coop') || lower.match(/\bco op\b/)) return 'CoOp'
  if (lower.includes('full-time') || lower.includes('full time') || lower.includes('permanent') || lower.includes('regular employee')) return 'FullTime'
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Lines that start with these are not titles
const TITLE_SKIP = /^(about|we |the |our |this |you |join |if |at |what |why |how |a |an |is |are |in |it |with |for |and |but |or |to |from |by |be |as )/

function clean(str: string): string {
  return str
    .replace(/[*_#`[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?]$/, '')  // strip trailing punctuation
    .trim()
}
