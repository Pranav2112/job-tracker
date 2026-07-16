# AppTracker

A full-featured internship and job application tracker built for students who take their career search seriously. Track every application, visualise your pipeline, earn XP for staying consistent, and never miss a deadline.

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)

---

## Features

### Core tracking
- **Kanban pipeline** — drag applications across 12 stages (Researching → Preparing → Applied → Recruiter Screen → Interviewing → Offer → Accepted / Rejected / Ghosted)
- **Applications list** — sortable, filterable table with bulk stage moves, bulk delete, CSV export
- **Application detail** — interviews, research notes, documents, offer & negotiation log, activity timeline, completeness score with next-action prompt
- **Contacts** — associate recruiters and referrals with applications
- **Calendar** — view all deadlines and interview slots in a month/week calendar

### Auto-fill & smart input
- **URL scraper** — paste any Greenhouse, Lever, or Ashby posting URL and fields fill automatically (company, role, location, salary, remote type) — no paid API
- **JD paste parser** — copy-paste the full job description text; a regex parser extracts key fields client-side
- When the URL scraper returns 0 fields, the JD paste panel opens automatically with an improved error message

### Analytics & insights
- **Insights page** (`/insights`, key `I`) — response rate, interview rate, offer rate KPI cards; apply velocity area chart (last 12 weeks); stage breakdown bar chart; pipeline funnel showing conversion at each step

### Gamification
- **XP & levels** — earn XP for every application, document, research note, interview, and contact; 7 level tiers (Newcomer → Hired)
- **Streaks** — daily activity streak with timezone-correct local-date tracking
- **Achievements** — 10+ unlockable badges with rarity tiers (common / rare / epic / legendary)
- **Weekly challenges** — 3 challenges that reset every Monday
- **Season goal** — set an application target for the season with an animated GSAP progress bar
- **Confetti** — fires when an application reaches OfferReceived or Accepted (only on successful save)

### Productivity
- **Command palette** (⌘K / Ctrl+K) — jump to any page or application instantly
- **Keyboard shortcuts** — `N` new app, `K` dashboard, `L` list, `I` insights, `C` calendar, `U` contacts, `?` shortcuts overlay
- **Notification bell** — smart in-app alerts with red badge: deadlines within 3 days, stale apps (30+ days unchanged), follow-up nudges (Applied 14+ days); dismissed per-notification with localStorage persistence
- **Global search** — search all applications by company or role from the sidebar
- **Dark / light mode** — system-aware with manual toggle, persistent preference

### Auth & account
- Email/password signup with real-time password strength meter
- Google OAuth (single button, no redirect loop)
- Profile page with display name and avatar upload (Supabase Storage)
- Idle session timeout with countdown warning modal
- Forgot password / reset password flow

### Mobile
- Responsive layout: full sidebar on desktop, slide-out drawer + bottom tab bar on mobile
- Bottom tab bar: Home · Apps · Insights · Calendar · More
- Compact summary bar on dashboard (Total + Active + deadline/attention badges) replaces the 4-card grid on small screens

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 8 |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Animations | GSAP 3 |
| State / data fetching | TanStack Query v5 |
| Table | TanStack Table v8 |
| Backend | Supabase (PostgreSQL + RLS + Auth + Storage) |
| Charts | Recharts v3 |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Calendar | @fullcalendar/react |
| Routing | React Router v6 |
| Toasts | sonner |
| Confetti | canvas-confetti |
| Icons | Lucide React |

All features are **100% free** — no paid APIs, no AI services, no third-party subscriptions.

---

## Project structure

```
src/
├── components/
│   ├── auth/
│   │   ├── AuthLayout.tsx          # Split-screen auth page shell (emerald gradient + feature list)
│   │   └── IdleWarningModal.tsx    # Countdown modal before auto sign-out
│   ├── common/
│   │   ├── AttentionFlag.tsx       # ⚠ badge for applications needing action
│   │   ├── CommandPalette.tsx      # ⌘K fuzzy-search overlay
│   │   ├── FilePreviewModal.tsx    # Inline PDF/doc viewer
│   │   ├── GoogleIcon.tsx          # Shared Google OAuth SVG icon
│   │   ├── NotificationPanel.tsx   # Slide-out alert panel (deadline / stale / follow-up)
│   │   ├── PriorityBadge.tsx       # High / Medium / Low pill
│   │   ├── ShortcutsOverlay.tsx    # ? keyboard shortcuts reference
│   │   ├── StageBadge.tsx          # Coloured pipeline stage pill
│   │   └── WelcomeModal.tsx        # First-run onboarding (localStorage gated)
│   ├── forms/
│   │   └── ApplicationForm.tsx     # Shared create/edit form for applications
│   ├── gamification/
│   │   ├── AchievementsModal.tsx   # Full achievements grid with unlock animations
│   │   ├── SeasonGoal.tsx          # Animated goal progress bar
│   │   └── WeeklyChallenges.tsx    # 3 rotating weekly challenges
│   ├── kanban/
│   │   ├── KanbanBoard.tsx         # DnD context, column layout, confetti trigger
│   │   ├── KanbanCard.tsx          # Application card with completeness ring + interview countdown
│   │   └── KanbanColumn.tsx        # Droppable stage column with count badge
│   ├── layout/
│   │   ├── AppLayout.tsx           # Root layout: sidebar + header + outlet + WelcomeModal
│   │   ├── Header.tsx              # Mobile hamburger + page title
│   │   └── Sidebar.tsx             # Desktop sidebar · mobile drawer · bottom tab bar
│   └── ui/                         # shadcn/ui primitives (button, input, select, tabs, …)
├── contexts/
│   ├── AuthContext.tsx             # Supabase session, signIn/signOut, loading guard
│   └── ThemeContext.tsx            # dark/light preference with localStorage persistence
├── hooks/
│   ├── useApplications.ts          # List, create, update, delete applications
│   ├── useContacts.ts              # List, create, update, delete contacts
│   ├── useDetailData.ts            # Interview rounds, research notes, documents, offers, activity log
│   ├── useGamification.ts          # XP computation, levels, streaks, achievements, weekly challenges
│   ├── useIdleTimer.ts             # Idle timeout with warn/logout callbacks
│   ├── useNotifications.ts         # Derive in-app alerts from application data (no backend)
│   ├── useProfile.ts               # Fetch and update user profile + avatar
│   └── useScrapeJob.ts             # Client-side URL scraper (Greenhouse/Lever/Ashby + corsproxy.io)
├── lib/
│   ├── animations.ts               # GSAP helpers: animateIn, animateListIn, animateCounter, animateSidebarIn, animateBarIn
│   ├── authErrors.ts               # Map Supabase error codes to readable messages + password strength scorer
│   ├── completeness.ts             # Application completeness score (0–100, 9-field weighted)
│   ├── constants.ts                # PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, PRIORITY_COLORS, SOURCES, …
│   ├── parseJD.ts                  # Regex job-description parser (role, company, location, salary, remote type)
│   ├── supabase.ts                 # Supabase client singleton
│   └── utils.ts                    # cn, formatDate, exportToCSV, needsAttention, isDeadlineSoon
├── pages/
│   ├── auth/
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   └── SignupPage.tsx
│   ├── ApplicationDetailPage.tsx   # Tabbed detail view: Overview · Interviews · Research · Documents · Offer · Activity
│   ├── ApplicationsPage.tsx        # Table + mobile card list + bulk action bar
│   ├── CalendarPage.tsx            # FullCalendar with deadline and interview events
│   ├── ContactsPage.tsx            # Contact list with inline edit
│   ├── DashboardPage.tsx           # Kanban (desktop) + recent apps list (mobile) + gamification sidebar
│   ├── InsightsPage.tsx            # KPI cards + velocity chart + stage breakdown + funnel
│   ├── NewApplicationPage.tsx      # URL scraper + JD paste + application form
│   ├── NotFoundPage.tsx
│   └── ProfilePage.tsx             # Display name, avatar upload, password change
└── types/
    └── index.ts                    # Application, Contact, InterviewRound, Offer, Document, PipelineStage, …
```

---

## Getting started

### Prerequisites
- Node.js 18+
- A free [Supabase](https://supabase.com) project

### 1. Clone & install

```bash
git clone https://github.com/Pranav2112/job-tracker.git
cd job-tracker
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database setup

Run the SQL migrations in your Supabase SQL editor (files in `supabase/migrations/`):

```
001_initial_schema.sql   — applications, contacts, interview_rounds, research_notes, documents, offers, activity_log
002_gamification.sql     — user_gamification (XP streak + season goal)
```

Enable Row Level Security on all tables. Each policy should scope reads/writes to `auth.uid() = user_id`.

### 4. Start

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| ⌘K / Ctrl+K | Open command palette |
| N | New application |
| K | Dashboard |
| L | Applications list |
| I | Insights |
| C | Calendar |
| U | Contacts |
| ? | Shortcuts overlay |

---

## Contributing

This is a personal project — issues and PRs are welcome. Open one with a clear description of the bug or feature request.

---

*Built by [Pranav2112](https://github.com/Pranav2112)*
