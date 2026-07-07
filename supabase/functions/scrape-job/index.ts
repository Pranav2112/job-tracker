const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface JobData {
  company_name: string | null;
  role_title: string | null;
  location: string | null;
  remote_type: "Remote" | "Hybrid" | "Onsite" | null;
  salary_info: string | null;
  posting_url: string;
  source: string | null;
  detected_board: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") return errorRes("URL is required");

    const trimmed = url.trim();
    const result = await scrape(trimmed);
    return jsonRes(result);
  } catch (e) {
    return errorRes(e instanceof Error ? e.message : "Failed to scrape URL");
  }
});

// ── Router ────────────────────────────────────────────────────────────────────

async function scrape(url: string): Promise<JobData> {
  if (/greenhouse\.io/i.test(url)) return scrapeGreenhouse(url);
  if (/lever\.co/i.test(url)) return scrapeLever(url);
  if (/ashbyhq\.com/i.test(url)) return scrapeAshby(url);
  if (/myworkdayjobs\.com/i.test(url)) return scrapeWorkday(url);
  return scrapeGeneric(url);
}

// ── Greenhouse ────────────────────────────────────────────────────────────────
// Greenhouse exposes a public JSON API — no HTML scraping needed.

async function scrapeGreenhouse(url: string): Promise<JobData> {
  // URL formats:
  //   https://boards.greenhouse.io/company/jobs/123
  //   https://job-boards.greenhouse.io/company/jobs/123
  const match = url.match(/greenhouse\.io\/([^/?#]+)\/jobs\/(\d+)/i);
  if (!match) return scrapeGeneric(url);

  const [, company, jobId] = match;
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`;

  const res = await fetch(apiUrl, { headers: { "User-Agent": "JobTracker/1.0" } });
  if (!res.ok) return scrapeGeneric(url);

  const data = await res.json();
  const rawLocation: string = data.location?.name ?? "";

  return {
    company_name: titleCase(company.replace(/-/g, " ")),
    role_title: clean(data.title ?? ""),
    location: rawLocation || null,
    remote_type: detectRemote(rawLocation),
    salary_info: null,
    posting_url: url,
    source: "Greenhouse",
    detected_board: "Greenhouse",
  };
}

// ── Lever ─────────────────────────────────────────────────────────────────────
// Lever has a public posting API.

async function scrapeLever(url: string): Promise<JobData> {
  // URL format: https://jobs.lever.co/company/uuid
  const match = url.match(/lever\.co\/([^/?#]+)\/([a-f0-9-]{36})/i);
  if (!match) return scrapeGeneric(url);

  const [, company, postingId] = match;
  const apiUrl = `https://api.lever.co/v0/postings/${company}/${postingId}`;

  const res = await fetch(apiUrl, { headers: { "User-Agent": "JobTracker/1.0" } });
  if (!res.ok) return scrapeGeneric(url);

  const data = await res.json();
  const rawLocation: string = data.categories?.location ?? "";
  const commitment: string = data.categories?.commitment ?? "";

  return {
    company_name: titleCase(company.replace(/-/g, " ")),
    role_title: clean(data.text ?? ""),
    location: rawLocation || null,
    remote_type: detectRemote(`${rawLocation} ${commitment}`),
    salary_info: null,
    posting_url: url,
    source: "Lever",
    detected_board: "Lever",
  };
}

// ── Ashby ─────────────────────────────────────────────────────────────────────

async function scrapeAshby(url: string): Promise<JobData> {
  // URL: https://jobs.ashbyhq.com/company/uuid
  const match = url.match(/ashbyhq\.com\/([^/?#]+)\/([a-f0-9-]{36})/i);
  if (!match) return scrapeGeneric(url);

  const [, company, jobId] = match;
  const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${company}`;

  const res = await fetch(apiUrl, { headers: { "User-Agent": "JobTracker/1.0" } });
  if (!res.ok) return scrapeGeneric(url);

  const data = await res.json();
  const job = (data.jobPostings ?? []).find(
    (j: { id: string }) => j.id === jobId
  );
  if (!job) return scrapeGeneric(url);

  const rawLocation: string = job.locationName ?? job.location ?? "";

  return {
    company_name: titleCase(company.replace(/-/g, " ")),
    role_title: clean(job.title ?? ""),
    location: rawLocation || null,
    remote_type: detectRemote(`${rawLocation} ${job.isRemote ? "remote" : ""}`),
    salary_info: null,
    posting_url: url,
    source: "Ashby",
    detected_board: "Ashby",
  };
}

// ── Workday ───────────────────────────────────────────────────────────────────
// Workday pages are JS-rendered but embed job data in a JSON blob in the HTML.

async function scrapeWorkday(url: string): Promise<JobData> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; JobTracker/1.0)" },
  });
  if (!res.ok) return fallback(url, "Workday");

  const html = await res.text();

  // Workday embeds a JSON blob — look for "jobPostingInfo"
  const jsonMatch = html.match(/"jobPostingInfo"\s*:\s*(\{[^}]+\})/);
  if (jsonMatch) {
    try {
      const info = JSON.parse(jsonMatch[1]);
      return {
        company_name: extractCompanyFromUrl(url),
        role_title: info.title ?? null,
        location: info.location ?? null,
        remote_type: detectRemote(info.location ?? ""),
        salary_info: null,
        posting_url: url,
        source: "Workday",
        detected_board: "Workday",
      };
    } catch (_) { /* fall through */ }
  }

  // Fall back to generic HTML parsing
  return { ...(await scrapeGeneric(url)), detected_board: "Workday" };
}

// ── Generic HTML scraper ──────────────────────────────────────────────────────

async function scrapeGeneric(url: string): Promise<JobData> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; JobTracker/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Could not load page (HTTP ${res.status})`);

  const html = await res.text();
  const head = html.slice(0, 8000); // only scan the top of the page

  // ── Title ──────────────────────────────────────────────────────────────────
  const h1 = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const pageTitle = stripTags(
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""
  );

  // OG title is often the cleanest job title
  const ogTitle = html.match(
    /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i
  )?.[1];

  let roleTitle: string | null = null;
  let companyName: string | null = null;

  // Parse "Role | Company" or "Role — Company" from page title
  if (pageTitle) {
    const split = pageTitle.match(/^(.+?)\s*[|\-–—]\s*(.+)$/);
    if (split) {
      roleTitle = clean(split[1]);
      companyName = clean(
        split[2].replace(/\b(jobs?|careers?|hiring|work with us)\b/gi, "").trim()
      );
    }
    // "Role at Company"
    const atMatch = pageTitle.match(/^(.+?)\s+at\s+(.+)$/i);
    if (atMatch && !companyName) {
      roleTitle = clean(atMatch[1]);
      companyName = clean(atMatch[2]);
    }
  }

  // Prefer og:title for role, h1 as secondary
  if (ogTitle && !roleTitle) roleTitle = clean(ogTitle);
  if (h1 && !roleTitle) roleTitle = clean(h1);

  // og:site_name is often the cleanest company name
  const ogSiteName = head.match(
    /<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i
  )?.[1];
  if (ogSiteName && !companyName) companyName = clean(ogSiteName);

  // Fallback: extract from URL domain
  if (!companyName) companyName = extractCompanyFromUrl(url);

  // ── Location ───────────────────────────────────────────────────────────────
  const locationMeta =
    head.match(/<meta[^>]+name="job[_-]?location"[^>]+content="([^"]+)"/i)?.[1] ??
    head.match(/<meta[^>]+property="job:location"[^>]+content="([^"]+)"/i)?.[1] ??
    null;

  // ── Salary ─────────────────────────────────────────────────────────────────
  const salaryMatch = html.match(
    /\$[\d,]+(?:[kK])?(?:\s*[-–]\s*\$[\d,]+(?:[kK])?)?(?:\s*(?:per\s+(?:year|hour|month)|annually|\/yr|\/hr))?/
  )?.[0] ?? null;

  // ── Remote type ────────────────────────────────────────────────────────────
  const remoteType = detectRemote(html.slice(0, 4000));

  return {
    company_name: companyName,
    role_title: roleTitle,
    location: locationMeta?.trim() ?? null,
    remote_type: remoteType,
    salary_info: salaryMatch,
    posting_url: url,
    source: null,
    detected_board: "Web",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectRemote(text: string): "Remote" | "Hybrid" | "Onsite" | null {
  const t = text.toLowerCase();
  if (t.includes("hybrid")) return "Hybrid";
  if (
    t.includes("fully remote") ||
    t.includes("100% remote") ||
    t.includes("remote first") ||
    (t.includes("remote") && !t.includes("not remote"))
  )
    return "Remote";
  if (
    t.includes("on-site") ||
    t.includes("onsite") ||
    t.includes("in-office") ||
    t.includes("in office") ||
    t.includes("in person")
  )
    return "Onsite";
  return null;
}

function extractCompanyFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    // "careers.stripe.com" → "Stripe"
    const parts = host.split(".");
    const candidate = parts.length > 2 ? parts[1] : parts[0];
    return titleCase(candidate);
  } catch {
    return null;
  }
}

function titleCase(str: string): string {
  return str.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function clean(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function fallback(url: string, board: string): JobData {
  return {
    company_name: extractCompanyFromUrl(url),
    role_title: null,
    location: null,
    remote_type: null,
    salary_info: null,
    posting_url: url,
    source: board,
    detected_board: board,
  };
}

function jsonRes(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function errorRes(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
