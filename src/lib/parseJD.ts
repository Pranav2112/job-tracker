// Free regex-based job description parser.
// Works on raw text pasted from LinkedIn, company sites, emails, PDFs, anywhere.

export interface ParsedJD {
  company_name: string | null
  role_title:   string | null
  location:     string | null
  remote_type:  'Remote' | 'Hybrid' | 'Onsite' | null
  salary_info:  string | null
  app_type:     'Internship' | 'FullTime' | 'PartTime' | 'Contract' | 'CoOp' | null
  deadline:     string | null
  notes:        string | null
}

export function parseJobDescription(raw: string): ParsedJD {
  const text  = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  const lower = text.toLowerCase()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const role_title   = extractTitle(text, lines)
  const company_name = extractCompany(text, lines, role_title)

  return {
    company_name,
    role_title,
    location:    extractLocation(text),
    remote_type: extractRemote(lower),
    salary_info: extractSalary(text),
    app_type:    extractJobType(lower),
    deadline:    extractDeadline(text),
    notes:       extractNotes(text, role_title, company_name),
  }
}

// ─── Job Title ────────────────────────────────────────────────────────────────

function extractTitle(text: string, lines: string[]): string | null {
  // Explicit label: "Job Title: …", "Position: …", "Role: …"
  const labeled = text.match(
    /(?:^|\n)\s*(?:job\s*title|position|role|title)\s*[:\-]\s*([^\n|•·]+)/im
  )
  if (labeled) return clean(labeled[1])

  // Markdown heading "# Software Engineer"
  const mdH1 = text.match(/^#+\s+(.+)$/m)
  if (mdH1) return clean(mdH1[1])

  // ALL CAPS first line (common in copied PDFs/emails): "SOFTWARE ENGINEER INTERN"
  if (lines.length > 0 && /^[A-Z\s\-()\/]{4,80}$/.test(lines[0]) && !TITLE_SKIP.test(lines[0].toLowerCase())) {
    return titleCase(lines[0])
  }

  // Look for title-shaped lines: contains role keywords
  const titleKeywords = /\b(engineer|developer|analyst|manager|designer|scientist|intern|associate|director|coordinator|specialist|consultant|architect|lead|head of|vp of|product|software|data|machine learning|frontend|backend|fullstack|devops|sre|marketing|sales|recruiter|operations)\b/i
  for (const line of lines.slice(0, 8)) {
    if (
      line.length > 3 && line.length < 100 &&
      /^[A-Z]/.test(line) &&
      titleKeywords.test(line) &&
      !TITLE_SKIP.test(line.toLowerCase())
    ) {
      return clean(line)
    }
  }

  // First non-trivial capitalised line that doesn't look like company boilerplate
  for (const line of lines.slice(0, 5)) {
    if (
      line.length > 3 && line.length < 100 &&
      /^[A-Z]/.test(line) &&
      !TITLE_SKIP.test(line.toLowerCase()) &&
      !COMPANY_SKIP.test(line.toLowerCase())
    ) {
      return clean(line)
    }
  }

  return null
}

// ─── Company ──────────────────────────────────────────────────────────────────

function extractCompany(text: string, lines: string[], knownTitle: string | null): string | null {
  // Explicit label: "Company: Stripe", "Employer: Google"
  const labeled = text.match(
    /(?:^|\n)\s*(?:company|employer|organization|client|firm)\s*[:\-]\s*([^\n|,•·]+)/im
  )
  if (labeled) return clean(labeled[1])

  // "About Stripe", "About Tower Research Capital:"
  const about = text.match(
    /(?:^|\n)\s*about\s+([A-Z][A-Za-z0-9\s&.,'\-]{1,50}?)(?:\s*\n|\s*:|,)/m
  )
  if (about) {
    const val = clean(about[1])
    if (!COMPANY_SKIP.test(val.toLowerCase()) && val !== knownTitle) return val
  }

  // LinkedIn bullet: "Company Name · Location · X followers"
  const linkedInBullet = text.match(
    /^([A-Z][A-Za-z0-9\s&.,'\-]{1,50}?)\s*·\s*[A-Za-z0-9,\s]+\s*·/m
  )
  if (linkedInBullet) return clean(linkedInBullet[1])

  // LinkedIn dot separator: "· Company Name ·" anywhere in first 300 chars
  const linkedInMid = text.slice(0, 300).match(/·\s*([A-Z][A-Za-z0-9\s&.,'\-]{1,40}?)\s*·/m)
  if (linkedInMid) return clean(linkedInMid[1])

  // "Join Stripe and …", "Join us at Stripe"
  const join = text.match(
    /\bjoin\s+(?:us\s+at\s+)?([A-Z][A-Za-z0-9\s&.,'\-]{1,40}?)(?:\s+and\b|\s+to\b|[,\n])/m
  )
  if (join) return clean(join[1])

  // "At Stripe, we …" / "We are Stripe" / "We're Stripe"
  const atCo = text.match(/\bat\s+([A-Z][A-Za-z0-9\s&.,'\-]{1,40}?),\s+we\b/m)
  if (atCo) return clean(atCo[1])

  const weare = text.match(/\bwe(?:'re| are)\s+([A-Z][A-Za-z0-9\s&.,'\-]{1,40}?)(?:[,.\n]|\s+and\b)/m)
  if (weare) return clean(weare[1])

  // "Posted by Company" / "Hiring at Company"
  const posted = text.match(/(?:posted by|hiring at|careers at|jobs at)\s+([A-Z][A-Za-z0-9\s&.,'\-]{1,40}?)(?:[,.\n]|$)/im)
  if (posted) return clean(posted[1])

  // All-caps company name on its own line (e.g. "STRIPE\n" or "JANE STREET\n")
  // Skip if it matches the known title
  for (const line of lines.slice(0, 8)) {
    if (/^[A-Z][A-Z\s&]{2,35}$/.test(line) && line.split(' ').length <= 5) {
      const candidate = titleCase(line)
      if (candidate !== knownTitle) return candidate
    }
  }

  // Fallback: find a short capitalised line that doesn't look like a title or boilerplate
  // Skip lines that look like the known role title or contain role keywords
  const titleKeywords = /\b(engineer|developer|analyst|manager|designer|scientist|intern|associate|director|specialist|consultant|architect|product|software|data|fullstack|frontend|backend)\b/i
  for (const line of lines.slice(1, 10)) {
    if (
      line.length > 2 && line.length < 60 &&
      /^[A-Z]/.test(line) &&
      !titleKeywords.test(line) &&
      !TITLE_SKIP.test(line.toLowerCase()) &&
      !COMPANY_SKIP.test(line.toLowerCase()) &&
      line !== knownTitle
    ) {
      return clean(line)
    }
  }

  return null
}

// ─── Auto-notes ───────────────────────────────────────────────────────────────

function extractNotes(text: string, title: string | null, company: string | null): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Try to find a summary-like paragraph: first paragraph with 40+ chars that's not a header
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 60)
  let summary = ''

  for (const para of paragraphs) {
    const paraLower = para.toLowerCase()
    // Skip sections that are just bullet-point lists or header-only paragraphs
    const isNarrativeParagraph = /[a-z]{3,}/.test(para) && para.split('\n').length <= 6
    const isBoilerplate = /^(responsibilities|requirements|qualifications|what you|what we|who you|benefits|perks|about the role)/i.test(para.trim())
    if (isNarrativeParagraph && !isBoilerplate) {
      // Pick the first sentence of this paragraph
      const firstSentence = para.match(/^([^.!?\n]{20,200}[.!?])/)
      if (firstSentence) {
        summary = firstSentence[1].trim()
        break
      }
      // Or just the first line if no sentence end
      const firstLine = para.split('\n')[0]
      if (firstLine.length > 40) {
        summary = firstLine.trim()
        break
      }
    }
    void paraLower
  }

  if (!summary && lines.length > 0) {
    // Last resort: find a line after title/company that reads like a description
    for (const line of lines.slice(2, 12)) {
      if (line.length > 50 && !/^(company|location|role|title|remote|salary|compensation|apply|deadline)/i.test(line)) {
        summary = line
        break
      }
    }
  }

  if (!summary) return null

  // Prepend role + company context if we have it
  const context = [title, company ? `@ ${company}` : null].filter(Boolean).join(' ')
  return context ? `${context} — ${summary}` : summary
}

// ─── Location ─────────────────────────────────────────────────────────────────

function extractLocation(text: string): string | null {
  // Explicit label: "Location: San Francisco, CA"
  const labeled = text.match(
    /(?:^|\n)\s*(?:location|office|based in|workplace|job location)\s*[:\-]\s*([^\n|•·,]+)/im
  )
  if (labeled) {
    const v = clean(labeled[1])
    if (!/^(remote|hybrid|onsite|on-site|virtual)$/i.test(v)) return v
  }

  // "Multiple Locations"
  if (/multiple\s+locations/i.test(text)) return 'Multiple Locations'

  // US "City, ST" — e.g. "New York, NY" or "San Francisco, CA"
  const cityState = text.match(/\b([A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*),\s*([A-Z]{2})\b/)
  if (cityState) return cityState[0]

  // International major cities + country
  const intl = text.match(
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*(UK|Canada|India|Germany|Singapore|Australia|Netherlands|France|Japan|Ireland|Sweden|Switzerland|Spain|Poland|Brazil|Mexico|UAE|Dubai)\b/i
  )
  if (intl) return intl[0]

  // Standalone major city
  const city = text.match(
    /\b(New York|San Francisco|Seattle|Austin|Boston|Chicago|Los Angeles|London|Toronto|Vancouver|Dublin|Singapore|Berlin|Amsterdam|Bangalore|Hyderabad|Mumbai|Tokyo|Paris|Sydney|Denver|Atlanta|Dallas|Miami|Washington DC)\b/i
  )
  if (city) return city[0]

  return null
}

// ─── Remote type ──────────────────────────────────────────────────────────────

function extractRemote(lower: string): 'Remote' | 'Hybrid' | 'Onsite' | null {
  if (lower.includes('hybrid')) return 'Hybrid'
  if (
    lower.includes('fully remote') || lower.includes('100% remote') ||
    lower.includes('remote first') || lower.includes('remote-first') ||
    lower.includes('work from anywhere') || lower.includes('work from home') ||
    lower.includes('wfh') || lower.includes('distributed team') ||
    lower.includes('telecommut') ||
    (lower.includes('remote') &&
      !lower.includes('not remote') &&
      !lower.includes('non-remote') &&
      !lower.includes('no remote') &&
      !lower.includes('no longer remote'))
  ) return 'Remote'
  if (
    lower.includes('on-site') || lower.includes('onsite') || lower.includes('on site') ||
    lower.includes('in-office') || lower.includes('in office') ||
    lower.includes('in person') || lower.includes('in-person') ||
    lower.includes('office-based') || lower.includes('office based')
  ) return 'Onsite'
  return null
}

// ─── Salary ───────────────────────────────────────────────────────────────────

function extractSalary(text: string): string | null {
  // Currency range with optional period: "$120,000 – $180,000/yr", "$120K–$180K"
  const range = text.match(
    /(?:\$|£|€|₹|USD|CAD|GBP|AUD|INR)\s?[\d,]+(?:[kK]|,000)?(?:\s*(?:to|[-–])\s*(?:\$|£|€|₹)?\s?[\d,]+(?:[kK]|,000)?)?(?:\s*(?:per\s+(?:year|hour|month|week)|annually|\/yr|\/hr|\/year|\/hour|\/mo|a year|p\.?a\.?))?/i
  )
  if (range) return range[0].trim()

  // Labeled: "Salary: $120,000", "Compensation: $80K–$120K"
  const labeled = text.match(
    /(?:salary|compensation|pay|total comp|tc|ctc|stipend)\s*(?:range|package)?\s*[:\-]\s*([\d$£€₹,kK\s\-–toTO\/]+(?:per\s+\w+|\/yr|\/hr|pa|lpa)?)/i
  )
  if (labeled) return labeled[1].trim()

  // Indian LPA format: "15 LPA", "₹15 LPA", "15–20 LPA"
  const lpa = text.match(/(?:₹\s?)?[\d.]+\s*(?:[-–]\s*[\d.]+\s*)?LPA/i)
  if (lpa) return lpa[0].trim()

  // Hourly/monthly stipend: "$35/hr", "$7,000/month"
  const stipend = text.match(
    /\$[\d,]+\s*(?:\/\s*(?:month|week|hr|hour)|\s+per\s+(?:month|week|hour))/i
  )
  if (stipend) return stipend[0].trim()

  if (/competitive\s+(?:compensation|salary|pay)/i.test(text)) return 'Competitive'

  return null
}

// ─── Application deadline ─────────────────────────────────────────────────────

function extractDeadline(text: string): string | null {
  const pattern = text.match(
    /(?:application|apply(?:ing)?|submission|deadline|closing|close[sd]?|due|open until|priority deadline)\s*(?:date|by|deadline)?\s*[:\-]?\s*([A-Za-z]+ \d{1,2},?\s*\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|[A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/im
  )
  if (!pattern) return null

  const raw = pattern[1].trim()
  try {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch { /* ignore */ }
  return raw
}

// ─── Job type ─────────────────────────────────────────────────────────────────

function extractJobType(lower: string): 'Internship' | 'FullTime' | 'PartTime' | 'Contract' | 'CoOp' | null {
  if (lower.includes('co-op') || lower.includes('coop') || /\bco op\b/.test(lower)) return 'CoOp'
  if (lower.includes('internship') || lower.includes('intern ') || /\bintern\b/.test(lower)) return 'Internship'
  if (lower.includes('part-time') || lower.includes('part time') || /\bpt\b/.test(lower)) return 'PartTime'
  if (lower.includes('contract') || lower.includes('freelance') || lower.includes('temporary') || lower.includes('temp ')) return 'Contract'
  if (lower.includes('full-time') || lower.includes('full time') || lower.includes('permanent') || lower.includes('regular employee') || lower.includes('direct hire')) return 'FullTime'
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TITLE_SKIP = /^(about|we |the |our |this |you |join |if |at |what |why |how |a |an |is |are |in |it |with |for |and |but |or |to |from |by |be |as |please |note |important |must |apply |responsibilities|requirements|qualifications|benefits|perks|who |when |where |here |now |read )/

const COMPANY_SKIP = /^(the role|what you|who you|what we|who we|about the|about this|about you|about us|your role|your responsibilities|key responsibilities|job description|position overview|overview|summary|description|requirements|qualifications|responsibilities|benefits|why join|why work|life at|working at)/

function titleCase(str: string): string {
  return str.trim().replace(/\b\w/g, c => c.toUpperCase())
}

function clean(str: string): string {
  return str
    .replace(/[*_#`[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?]$/, '')
    .trim()
}
